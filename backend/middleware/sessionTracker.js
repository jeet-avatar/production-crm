"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackSessionActivity = void 0;
exports.createUserSession = createUserSession;
exports.endUserSession = endUserSession;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
const client_1 = require("@prisma/client");
const ua_parser_js_1 = require("ua-parser-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma = new client_1.PrismaClient();
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
function parseUserAgent(userAgentString) {
    const result = (0, ua_parser_js_1.UAParser)(userAgentString);
    return {
        browser: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
        os: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        device: result.device.type || 'Desktop',
    };
}
const trackSessionActivity = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.id) {
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        prisma.userSession
            .updateMany({
            where: {
                userId: user.id,
                sessionToken: token,
                isActive: true,
            },
            data: {
                lastActivityAt: new Date(),
                pageViews: { increment: 1 },
            },
        })
            .catch((err) => console.error('Failed to update session activity:', err));
        next();
    }
    catch (error) {
        console.error('Session tracking middleware error:', error);
        next();
    }
};
exports.trackSessionActivity = trackSessionActivity;
async function createUserSession(userId, token, req) {
    try {
        console.log('📝 Creating user session for userId:', userId);
        const ipAddress = getClientIp(req);
        const userAgent = req.get('user-agent') || 'unknown';
        const deviceInfo = parseUserAgent(userAgent);
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const expiresAt = new Date(decoded.exp * 1000);
        const durationMs = expiresAt.getTime() - Date.now();
        const totalDuration = Math.floor(durationMs / 1000);
        console.log('📝 Session data:', { userId, ipAddress, device: deviceInfo.device, expiresAt });
        const session = await prisma.userSession.create({
            data: {
                userId,
                sessionToken: token,
                loginAt: new Date(),
                expiresAt,
                ipAddress,
                userAgent,
                ...deviceInfo,
                isActive: true,
                totalDuration,
            },
        });
        console.log('✅ User session created successfully:', session.id);
        return session;
    }
    catch (error) {
        console.error('❌ Failed to create user session:', error);
        return null;
    }
}
async function endUserSession(userId, token, reason = 'logout') {
    try {
        const session = await prisma.userSession.findFirst({
            where: {
                userId,
                sessionToken: token,
                isActive: true,
            },
        });
        if (session) {
            const now = new Date();
            const duration = Math.floor((now.getTime() - session.loginAt.getTime()) / 1000);
            await prisma.userSession.update({
                where: { id: session.id },
                data: {
                    logoutAt: now,
                    isActive: false,
                    endedReason: reason,
                    totalDuration: duration,
                },
            });
        }
    }
    catch (error) {
        console.error('Failed to end user session:', error);
    }
}
async function cleanupExpiredSessions() {
    try {
        const now = new Date();
        await prisma.userSession.updateMany({
            where: {
                isActive: true,
                expiresAt: { lt: now },
            },
            data: {
                isActive: false,
                endedReason: 'expired',
                logoutAt: now,
            },
        });
    }
    catch (error) {
        console.error('Failed to cleanup expired sessions:', error);
    }
}
//# sourceMappingURL=sessionTracker.js.map