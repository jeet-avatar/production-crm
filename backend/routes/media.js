"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const MEDIA_MAP = {
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
router.get('/:type/:name', async (req, res) => {
    try {
        const { type, name } = req.params;
        const { source, contact, timestamp } = req.query;
        const mediaKey = `${type}/${name}`;
        const media = MEDIA_MAP[mediaKey];
        if (!media) {
            logger_1.logger.warn(`Media not found: ${mediaKey}`);
            return res.status(404).json({ error: 'Media not found' });
        }
        try {
            await prisma.mediaAccess.create({
                data: {
                    mediaKey,
                    source: source || 'unknown',
                    contactId: contact || null,
                    userAgent: req.headers['user-agent'] || 'unknown',
                    ipAddress: (req.ip || req.headers['x-forwarded-for'] || 'unknown'),
                    accessedAt: new Date(),
                }
            });
        }
        catch (trackError) {
            logger_1.logger.error('Media tracking failed:', trackError);
        }
        const s3Url = `https://${media.bucket}.s3.us-east-1.amazonaws.com/${media.path}`;
        logger_1.logger.info(`Proxying media: ${mediaKey} → ${s3Url}`);
        const protocol = s3Url.startsWith('https') ? https_1.default : http_1.default;
        protocol.get(s3Url, (s3Response) => {
            const contentType = media.contentType || s3Response.headers['content-type'] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            if (s3Response.headers['content-length']) {
                res.setHeader('Content-Length', s3Response.headers['content-length']);
            }
            if (s3Response.headers['last-modified']) {
                res.setHeader('Last-Modified', s3Response.headers['last-modified']);
            }
            if (s3Response.headers['etag']) {
                res.setHeader('ETag', s3Response.headers['etag']);
            }
            s3Response.pipe(res);
        }).on('error', (error) => {
            logger_1.logger.error(`Failed to fetch from S3: ${s3Url}`, error);
            res.status(500).json({ error: 'Failed to load media' });
        });
    }
    catch (error) {
        logger_1.logger.error('Media proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
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
            take: 1000
        });
        const stats = {};
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
    }
    catch (error) {
        logger_1.logger.error('Media stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});
exports.default = router;
//# sourceMappingURL=media.js.map