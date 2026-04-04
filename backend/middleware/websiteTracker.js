"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVisitMetrics = exports.trackWebsiteVisit = void 0;
const client_1 = require("@prisma/client");
const ua_parser_js_1 = require("ua-parser-js");
const geolocation_service_1 = require("../services/geolocation.service");
const prisma = new client_1.PrismaClient();
function parseUserAgent(userAgentString) {
    const result = (0, ua_parser_js_1.UAParser)(userAgentString);
    return {
        browser: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
        os: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        device: result.device.type || 'Desktop',
        deviceVendor: result.device.vendor || undefined,
    };
}
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
const trackWebsiteVisit = async (req, res, next) => {
    try {
        const skipPaths = ['/api/', '/assets/', '/health', '/favicon.ico', '/vite.svg'];
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }
        const protocol = req.protocol;
        const domain = req.get('host') || 'unknown';
        const path = req.path;
        const fullUrl = `${protocol}://${domain}${req.originalUrl}`;
        const queryParams = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : null;
        const referrer = req.get('referrer') || req.get('referer') || null;
        const userId = req.user?.id || null;
        const sessionId = req.sessionID || req.cookies?.sessionId || null;
        const isAuthenticated = !!userId;
        const userAgent = req.get('user-agent') || 'unknown';
        const deviceInfo = parseUserAgent(userAgent);
        const ipAddress = getClientIp(req);
        (0, geolocation_service_1.getGeolocation)(ipAddress)
            .then(geoData => {
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
                    isNewVisitor: true,
                    visitCount: 1,
                    country: geoData?.country || null,
                },
            });
        })
            .catch(err => {
            console.error('Failed to log website visit:', err);
        });
        next();
    }
    catch (error) {
        console.error('Website tracking middleware error:', error);
        next();
    }
};
exports.trackWebsiteVisit = trackWebsiteVisit;
const updateVisitMetrics = async (req, res) => {
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
    }
    catch (error) {
        console.error('Failed to update visit metrics:', error);
        res.status(500).json({ error: 'Failed to update visit metrics' });
    }
};
exports.updateVisitMetrics = updateVisitMetrics;
//# sourceMappingURL=websiteTracker.js.map