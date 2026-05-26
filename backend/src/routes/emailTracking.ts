import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 1x1 Transparent tracking pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET /api/tracking/open/:emailLogId
router.get('/open/:emailLogId', async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || '';

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (emailLog) {
      const now = new Date();
      const timeToOpen = emailLog.sentAt
        ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
        : null;

      const isFirstOpen = emailLog.totalOpens === 0;

      // FORWARDING DETECTION: Check if this is a different person
      const previousEvents = await prisma.emailTrackingEvent.findMany({
        where: { emailLogId, eventType: 'OPEN' },
        select: { ipAddress: true, userAgent: true },
      });

      const uniqueIPSet = new Set(previousEvents.map(e => e.ipAddress).filter(Boolean));
      const uniqueUASet = new Set(previousEvents.map(e => e.userAgent).filter(Boolean));

      // Add current IP and user agent
      if (ipAddress) uniqueIPSet.add(ipAddress);
      if (userAgent) uniqueUASet.add(userAgent);

      const isDifferentPerson = !isFirstOpen && (
        (emailLog.ipAddress && emailLog.ipAddress !== ipAddress) ||
        previousEvents.some(e => e.ipAddress !== ipAddress || e.userAgent !== userAgent)
      );

      const updateData: any = {
        totalOpens: { increment: 1 },
        lastOpenedAt: now,
        ipAddress: ipAddress,
        uniqueIPs: uniqueIPSet.size,
        uniqueUserAgents: uniqueUASet.size,
      };

      // Detect forwarding: more than 1 unique IP or user agent
      if (uniqueIPSet.size > 1 || uniqueUASet.size > 1) {
        updateData.wasForwarded = true;
        updateData.suspectedForwards = { increment: isDifferentPerson ? 1 : 0 };
        updateData.lastForwardDetectedAt = now;
      }

      if (isFirstOpen) {
        updateData.firstOpenedAt = now;
        updateData.timeToOpen = timeToOpen;
        updateData.uniqueOpens = 1;
        updateData.status = 'OPENED';
        updateData.openedAt = now;

        // Simple engagement score: 30 points for opening
        updateData.engagementScore = 30;
      } else {
        updateData.uniqueOpens = { increment: 1 };
      }

      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: updateData,
      });

      // Create tracking event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId,
          eventType: 'OPEN',
          userAgent: userAgent.substring(0, 500),
          ipAddress,
        },
      });

      // Update campaign stats if first open
      if (isFirstOpen) {
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: {
            totalOpened: { increment: 1 },
          },
        });
      }
    }

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.send(TRACKING_PIXEL);

  } catch (error) {
    console.error('Tracking pixel error:', error);
    res.setHeader('Content-Type', 'image/gif');
    res.send(TRACKING_PIXEL);
  }
});

// GET /api/tracking/analytics/:campaignId
// PROTECTED: Only authenticated users can view analytics
router.get('/analytics/:campaignId', authenticate, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        emailLogs: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            trackingEvents: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 100,
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // SECURITY: Verify user owns this campaign
    if (campaign.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this campaign.' });
    }

    const stats = {
      totalSent: campaign.totalSent,
      totalOpened: campaign.emailLogs.filter(log => log.totalOpens > 0).length,
      totalClicked: campaign.emailLogs.filter(log => log.totalClicks > 0).length,
      totalBounced: campaign.totalBounced,
      totalForwarded: campaign.emailLogs.filter(log => log.wasForwarded).length,
      suspectedForwardEvents: campaign.emailLogs.reduce((sum, log) => sum + (log.suspectedForwards || 0), 0),
      openRate: campaign.totalSent > 0
        ? ((campaign.emailLogs.filter(log => log.totalOpens > 0).length / campaign.totalSent) * 100).toFixed(2)
        : '0',
      clickRate: campaign.totalSent > 0
        ? ((campaign.emailLogs.filter(log => log.totalClicks > 0).length / campaign.totalSent) * 100).toFixed(2)
        : '0',
      forwardRate: campaign.totalSent > 0
        ? ((campaign.emailLogs.filter(log => log.wasForwarded).length / campaign.totalSent) * 100).toFixed(2)
        : '0',
    };

    const topPerformers = campaign.emailLogs
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10)
      .map(log => ({
        contact: log.contact,
        engagementScore: log.engagementScore,
        opens: log.totalOpens,
        clicks: log.totalClicks,
        firstOpenedAt: log.firstOpenedAt,
        firstClickedAt: log.firstClickedAt,
      }));

    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
      },
      stats,
      topPerformers,
      emailLogs: campaign.emailLogs.map(log => ({
        id: log.id,
        contact: log.contact,
        status: log.status,
        sentAt: log.sentAt,
        totalOpens: log.totalOpens,
        totalClicks: log.totalClicks,
        engagementScore: log.engagementScore,
        firstOpenedAt: log.firstOpenedAt,
        lastOpenedAt: log.lastOpenedAt,
        ipAddress: log.ipAddress,
        wasForwarded: log.wasForwarded,
        suspectedForwards: log.suspectedForwards,
        uniqueIPs: log.uniqueIPs,
        uniqueUserAgents: log.uniqueUserAgents,
        lastForwardDetectedAt: log.lastForwardDetectedAt,
        recentEvents: log.trackingEvents.slice(0, 5),
      })),
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tracking/events/:emailLogId
// PROTECTED: Only authenticated users can view events
router.get('/events/:emailLogId', authenticate, async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.params;

    // SECURITY: Verify user owns the campaign that contains this email log
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
      include: { campaign: { select: { userId: true } } }
    });

    if (!emailLog) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    if (emailLog.campaign.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied. You do not own this campaign.' });
    }

    const events = await prisma.emailTrackingEvent.findMany({
      where: { emailLogId },
      orderBy: { timestamp: 'desc' },
    });

    return res.json(events);

  } catch (error) {
    console.error('Events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate redirect URL to prevent open redirect vulnerability
function validateRedirectUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Allow most legitimate domains but block localhost and private IPs
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];

    if (blockedHosts.includes(parsed.hostname)) {
      return false;
    }

    // Block private IP ranges
    if (parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        parsed.hostname.startsWith('172.16.') ||
        parsed.hostname.startsWith('169.254.')) {
      return false;
    }

    // Must be http or https
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch (error) {
    // Invalid URL
    return false;
  }
}

// GET /api/tracking/click/:emailLogId - Link click tracking (WORKAROUND for blocked images)
router.get('/click/:emailLogId', async (req: Request, res: Response) => {
  try {
    const { emailLogId } = req.params;
    const { url, cta } = req.query as { url?: string; cta?: string }; // Original URL and CTA name
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.socket.remoteAddress || '';

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (emailLog) {
      const now = new Date();

      // If this is the FIRST click/interaction, also count it as an OPEN
      if (emailLog.totalOpens === 0) {
        const timeToOpen = emailLog.sentAt
          ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
          : null;

        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            totalOpens: 1,
            uniqueOpens: 1,
            firstOpenedAt: now,
            lastOpenedAt: now,
            timeToOpen: timeToOpen,
            status: 'OPENED',
            openedAt: now,
            engagementScore: 30, // 30 points for opening
            ipAddress: ipAddress,
          },
        });

        // Log OPEN event
        await prisma.emailTrackingEvent.create({
          data: {
            emailLogId,
            eventType: 'OPEN',
            userAgent: userAgent.substring(0, 500),
            ipAddress,
          },
        });

        // Update campaign open count
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: { totalOpened: { increment: 1 } },
        });
      }

      // Now track the CLICK
      const isFirstClick = emailLog.totalClicks === 0;
      const timeToClick = emailLog.sentAt
        ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
        : null;

      // FORWARDING DETECTION for clicks too
      const previousClickEvents = await prisma.emailTrackingEvent.findMany({
        where: { emailLogId, eventType: 'CLICK' },
        select: { ipAddress: true, userAgent: true },
      });

      const clickIPSet = new Set(previousClickEvents.map(e => e.ipAddress).filter(Boolean));
      const clickUASet = new Set(previousClickEvents.map(e => e.userAgent).filter(Boolean));

      if (ipAddress) clickIPSet.add(ipAddress);
      if (userAgent) clickUASet.add(userAgent);

      const updateData: any = {
        totalClicks: { increment: 1 },
        lastClickedAt: now,
        uniqueIPs: Math.max(emailLog.uniqueIPs || 0, clickIPSet.size),
        uniqueUserAgents: Math.max(emailLog.uniqueUserAgents || 0, clickUASet.size),
      };

      // Mark as forwarded if we detect different users clicking
      if (clickIPSet.size > 1 || clickUASet.size > 1) {
        updateData.wasForwarded = true;
        updateData.lastForwardDetectedAt = now;
      }

      if (isFirstClick) {
        updateData.firstClickedAt = now;
        updateData.timeToClick = timeToClick;
        updateData.uniqueClicks = 1;
        updateData.status = 'CLICKED';
        updateData.clickedAt = now;
        updateData.engagementScore = { increment: 40 }; // 40 points for clicking
      }

      await prisma.emailLog.update({ where: { id: emailLogId }, data: updateData });

      // Log CLICK event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId,
          eventType: 'CLICK',
          linkUrl: url || 'unknown',
          linkText: cta || 'unknown', // Use linkText field to store CTA name
          userAgent: userAgent.substring(0, 500),
          ipAddress,
        },
      });

      if (isFirstClick) {
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: { totalClicked: { increment: 1 } },
        });
      }
    }

    // Redirect to the original URL or dashboard (with security validation)
    const frontendUrl = process.env.FRONTEND_URL || 'https://brandmonkz.com';
    const defaultRedirect = `${frontendUrl}/campaigns`;

    // Only redirect to the provided URL if it's valid and safe
    if (url && validateRedirectUrl(url)) {
      res.redirect(url);
    } else {
      // Use default redirect if URL is missing or fails validation
      res.redirect(defaultRedirect);
    }
  } catch (error) {
    console.error('Click tracking error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://brandmonkz.com';
    res.redirect(`${frontendUrl}/campaigns`);
  }
});

export default router;
