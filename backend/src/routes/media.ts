import express from 'express';
import { PrismaClient } from '@prisma/client';
import https from 'https';
import http from 'http';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Media Asset Configuration
 * Maps clean URLs to S3 bucket paths
 *
 * URL Pattern: /media/{client}/{asset}
 * Example: /media/criticalriver/demo
 */
const MEDIA_MAP: Record<string, { bucket: string; path: string; contentType?: string }> = {
  // Critical River - Client-specific branded paths
  'criticalriver/demo': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'demo-videos/criticalriver-demo.mp4',
    contentType: 'video/mp4'
  },
  'criticalriver/preview': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'assets/netsuite-video-preview.gif',
    contentType: 'image/gif'
  },
  'criticalriver/logo': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'assets/criticalriver-logo-template.png',
    contentType: 'image/png'
  },

  // Legacy paths (backward compatibility)
  'video/netsuite-demo': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'demo-videos/criticalriver-demo.mp4',
    contentType: 'video/mp4'
  },
  'img/netsuite-preview': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'assets/netsuite-video-preview.gif',
    contentType: 'image/gif'
  },
  'img/criticalriver-logo': {
    bucket: 'brandmonkz-video-campaigns',
    path: 'assets/criticalriver-logo-template.png',
    contentType: 'image/png'
  },
};

/**
 * GET /media/:type/:name
 * Proxies S3 assets with clean URLs
 *
 * Examples:
 * - /media/video/netsuite-demo → S3 video file
 * - /media/img/netsuite-preview → S3 GIF preview
 *
 * Query Parameters:
 * - source: email, landing, etc. (for tracking)
 * - contact: contactId (for tracking)
 * - timestamp: timestamp (for cache busting)
 */
router.get('/:type/:name', async (req, res) => {
  try {
    const { type, name } = req.params;
    const { source, contact, timestamp } = req.query;

    const mediaKey = `${type}/${name}`;
    const media = MEDIA_MAP[mediaKey];

    if (!media) {
      logger.warn(`Media not found: ${mediaKey}`);
      return res.status(404).json({ error: 'Media not found' });
    }

    // Track the media access
    try {
      await prisma.mediaAccess.create({
        data: {
          mediaKey,
          source: source as string || 'unknown',
          contactId: contact as string || null,
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: (req.ip || req.headers['x-forwarded-for'] as string || 'unknown'),
          accessedAt: new Date(),
        }
      });
    } catch (trackError) {
      // Don't fail the request if tracking fails
      logger.error('Media tracking failed:', trackError);
    }

    // Build S3 URL
    const s3Url = `https://${media.bucket}.s3.us-east-1.amazonaws.com/${media.path}`;

    logger.info(`Proxying media: ${mediaKey} → ${s3Url}`);

    // Fetch from S3 and stream to client
    const protocol = s3Url.startsWith('https') ? https : http;

    protocol.get(s3Url, (s3Response) => {
      // Set content type from our map or from S3 response
      const contentType = media.contentType || s3Response.headers['content-type'] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      // Set cache headers (1 day)
      res.setHeader('Cache-Control', 'public, max-age=86400');

      // Copy other relevant headers
      if (s3Response.headers['content-length']) {
        res.setHeader('Content-Length', s3Response.headers['content-length']);
      }
      if (s3Response.headers['last-modified']) {
        res.setHeader('Last-Modified', s3Response.headers['last-modified']);
      }
      if (s3Response.headers['etag']) {
        res.setHeader('ETag', s3Response.headers['etag']);
      }

      // Stream the response
      s3Response.pipe(res);

    }).on('error', (error) => {
      logger.error(`Failed to fetch from S3: ${s3Url}`, error);
      res.status(500).json({ error: 'Failed to load media' });
    });

  } catch (error) {
    logger.error('Media proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /media/stats
 * Get media access statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const allAccesses = await prisma.mediaAccess.findMany({
      select: {
        mediaKey: true,
        source: true,
        contactId: true,
        accessedAt: true
      },
      orderBy: {
        accessedAt: 'desc'
      },
      take: 1000 // Last 1000 accesses
    });

    // Group by mediaKey and source
    const stats: Record<string, any> = {};
    allAccesses.forEach(access => {
      const key = `${access.mediaKey}|${access.source}`;
      if (!stats[key]) {
        stats[key] = {
          mediaKey: access.mediaKey,
          source: access.source,
          count: 0
        };
      }
      stats[key].count++;
    });

    res.json({
      stats: Object.values(stats),
      total: allAccesses.length
    });
  } catch (error) {
    logger.error('Media stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
