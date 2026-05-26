"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const ua_parser_js_1 = require("ua-parser-js");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
router.post('/visit', async (req, res) => {
    try {
        const { fullUrl, protocol, domain, path, queryParams, referrer, sessionId, userAgent: clientUserAgent, pageLoadTime } = req.body;
        const ipAddress = getClientIp(req);
        const userAgent = clientUserAgent || req.get('user-agent') || 'unknown';
        const result = (0, ua_parser_js_1.UAParser)(userAgent);
        const userId = req.user?.id || null;
        const isAuthenticated = !!userId;
        let validPageLoadTime = undefined;
        if (pageLoadTime && typeof pageLoadTime === 'number') {
            if (pageLoadTime > 0 && pageLoadTime < 100000) {
                validPageLoadTime = Math.floor(pageLoadTime);
            }
        }
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
    }
    catch (error) {
        console.error('Failed to track visit:', error);
        res.json({ success: true });
    }
});
exports.default = router;
//# sourceMappingURL=tracking.js.map