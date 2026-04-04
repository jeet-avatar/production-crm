import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UAParser } from 'ua-parser-js';

const router = Router();
const prisma = new PrismaClient();

// Helper to get client IP address
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// POST /api/track/visit - Track a website visit
router.post('/visit', async (req: Request, res: Response) => {
  try {
    const {
      fullUrl,
      protocol,
      domain,
      path,
      queryParams,
      referrer,
      sessionId,
      userAgent: clientUserAgent,
      pageLoadTime
    } = req.body;

    // Get IP address
    const ipAddress = getClientIp(req);

    // Parse user agent
    const userAgent = clientUserAgent || req.get('user-agent') || 'unknown';
    const result = UAParser(userAgent);

    // Get user info if authenticated
    const userId = (req.user as any)?.id || null;
    const isAuthenticated = !!userId;

    // Validate pageLoadTime - ensure it's within reasonable range (0-60000ms)
    // Reject values that look like timestamps (> 100000)
    let validPageLoadTime: number | undefined = undefined;
    if (pageLoadTime && typeof pageLoadTime === 'number') {
      if (pageLoadTime > 0 && pageLoadTime < 100000) {
        validPageLoadTime = Math.floor(pageLoadTime);
      }
    }

    // Create website visit record
    const visit = await prisma.websiteVisit.create({
      data: {
        fullUrl,
        protocol,
        domain,
        path: path || '/',
        queryParams,
        referrer,
        userId,
        sessionId,
        ipAddress,
        userAgent,
        browser: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
        os: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        device: result.device.type || 'Desktop',
        deviceVendor: result.device.vendor || undefined,
        isAuthenticated,
        isNewVisitor: true,
        visitCount: 1,
        pageLoadTime: validPageLoadTime,
      },
    });

    res.json({ success: true, visitId: visit.id });
  } catch (error) {
    console.error('Failed to track visit:', error);
    // Return success anyway to not break the frontend
    res.json({ success: true });
  }
});

export default router;
