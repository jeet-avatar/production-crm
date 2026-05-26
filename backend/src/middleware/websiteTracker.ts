import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { UAParser } from 'ua-parser-js';
import { getGeolocation } from '../services/geolocation.service';

const prisma = new PrismaClient();

// Helper to parse device information from user agent
function parseUserAgent(userAgentString: string) {
  const result = UAParser(userAgentString);

  return {
    browser: result.browser.name || undefined,
    browserVersion: result.browser.version || undefined,
    os: result.os.name || undefined,
    osVersion: result.os.version || undefined,
    device: result.device.type || 'Desktop',
    deviceVendor: result.device.vendor || undefined,
  };
}

// Helper to get client IP address
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Middleware to track website visits
export const trackWebsiteVisit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip tracking for API calls, assets, and health checks
    const skipPaths = ['/api/', '/assets/', '/health', '/favicon.ico', '/vite.svg'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get full URL information
    const protocol = req.protocol; // http or https
    const domain = req.get('host') || 'unknown'; // brandmonkz.com or www.brandmonkz.com
    const path = req.path;
    const fullUrl = `${protocol}://${domain}${req.originalUrl}`;
    const queryParams = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null;
    const referrer = req.get('referrer') || req.get('referer') || null;

    // Get user information
    const userId = (req.user as any)?.id || null;
    const sessionId = (req as any).sessionID || req.cookies?.sessionId || null;
    const isAuthenticated = !!userId;

    // Get device and browser information
    const userAgent = req.get('user-agent') || 'unknown';
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP address
    const ipAddress = getClientIp(req);

    // Get geolocation data asynchronously (don't block the request)
    getGeolocation(ipAddress)
      .then(geoData => {
        // Create visitor log with geolocation data
        return prisma.websiteVisit.create({
          data: {
            fullUrl,
            protocol,
            domain,
            path,
            queryParams,
            referrer,
            userId,
            sessionId,
            ipAddress,
            userAgent,
            ...deviceInfo,
            isAuthenticated,
            isNewVisitor: true, // Will be updated by analytics
            visitCount: 1,
            // Geolocation data
            country: geoData?.country || null,
          },
        });
      })
      .catch(err => {
        console.error('Failed to log website visit:', err);
      });

    // Continue with the request
    next();
  } catch (error) {
    // Don't let tracking errors break the application
    console.error('Website tracking middleware error:', error);
    next();
  }
};

// Endpoint to record page leave time and engagement metrics
export const updateVisitMetrics = async (req: Request, res: Response) => {
  try {
    const { visitId, timeOnPage, scrollDepth } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'Visit ID is required' });
    }

    await prisma.websiteVisit.update({
      where: { id: visitId },
      data: {
        leftAt: new Date(),
        timeOnPage,
        scrollDepth,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update visit metrics:', error);
    res.status(500).json({ error: 'Failed to update visit metrics' });
  }
};
