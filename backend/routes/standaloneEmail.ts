import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// Send standalone email with optional tracking
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, cc, bcc, subject, html, text, tracking } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'Recipient email(s) required' });
    }
    if (!subject || !html) {
      return res.status(400).json({ error: 'Subject and HTML content required' });
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    const result = await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME || 'CRM System'} <${process.env.SMTP_FROM_EMAIL}>`,
      to: to.join(', '),
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject,
      html,
      text,
    });

    // Track if tracking info provided
    if (tracking) {
      await prisma.standaloneEmailLog.create({
        data: {
          fromEmail: process.env.SMTP_FROM_EMAIL!,
          fromName: process.env.SMTP_FROM_NAME || 'CRM System',
          toEmail: to[0], // Primary recipient
          ccEmails: cc || [],
          bccEmails: bcc || [],
          subject,
          htmlContent: html,
          textContent: text || '',
          videoUrl: tracking.videoUrl,
          videoName: tracking.videoName,
          videoCampaignId: tracking.videoCampaignId,
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
          userId,
          metadata: {
            provider: 'nodemailer',
            response: result.response,
          },
        },
      });
      console.log('✅ Email sent and tracked successfully');
    } else {
      console.log('✅ Email sent (no tracking)');
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('❌ Error sending standalone email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sent emails for current user
router.get('/list', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      limit = 50,
      offset = 0,
      status,
      hasVideo,
    } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (hasVideo === 'true') {
      where.videoUrl = { not: null };
    }

    const [emails, total] = await Promise.all([
      prisma.standaloneEmailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.standaloneEmailLog.count({ where }),
    ]);

    res.json({
      success: true,
      emails,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    console.error('❌ Error fetching sent emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single email details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const email = await prisma.standaloneEmailLog.findFirst({
      where: {
        id,
        userId, // Ensure user can only see their own emails
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ success: true, email });
  } catch (error: any) {
    console.error('❌ Error fetching email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics summary for sent emails
router.get('/analytics/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [totalSent, totalWithVideo, totalOpens, totalClicks] = await Promise.all([
      prisma.standaloneEmailLog.count({
        where: { userId, status: 'SENT' }
      }),
      prisma.standaloneEmailLog.count({
        where: { userId, videoUrl: { not: null } }
      }),
      prisma.standaloneEmailLog.aggregate({
        where: { userId },
        _sum: { totalOpens: true },
      }),
      prisma.standaloneEmailLog.aggregate({
        where: { userId },
        _sum: { totalClicks: true },
      }),
    ]);

    res.json({
      success: true,
      analytics: {
        totalSent,
        totalWithVideo,
        totalOpens: totalOpens._sum.totalOpens || 0,
        totalClicks: totalClicks._sum.totalClicks || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
