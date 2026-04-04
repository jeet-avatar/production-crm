"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedRateLimiter = advancedRateLimiter;
exports.ipFilterMiddleware = ipFilterMiddleware;
exports.maliciousPayloadDetection = maliciousPayloadDetection;
exports.bruteForcePrevention = bruteForcePrevention;
exports.requestIntegrityCheck = requestIntegrityCheck;
exports.suspiciousActivityDetection = suspiciousActivityDetection;
exports.sessionHijackingPrevention = sessionHijackingPrevention;
exports.getSecurityStats = getSecurityStats;
exports.blockIP = blockIP;
exports.unblockIP = unblockIP;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const requestCounts = new Map();
const ipBlacklist = new Set();
const suspiciousIPs = new Map();
const failedLoginAttempts = new Map();
const sessionFingerprints = new Map();
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        const ips = forwarded.split(',').map(ip => ip.trim());
        // Use second-to-last IP (client IP set by reverse proxy), not first (spoofable)
        return ips.length > 1 ? ips[ips.length - 2] : ips[0];
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
function advancedRateLimiter(req, res, next) {
    const ip = getClientIP(req);
    const now = Date.now();
    const windowMs = 60000;
    let isSuperAdminRoute = req.path.includes('/super-admin');
    let isAdminRoute = req.path.includes('/admin/');
    if (isSuperAdminRoute || isAdminRoute) {
        const maxAdminRequests = 100;
        const requestData = requestCounts.get(ip);
        if (!requestData || now > requestData.resetTime) {
            requestCounts.set(ip, { count: 1, resetTime: now + windowMs, blocked: false });
            return next();
        }
        if (requestData.blocked) {
            console.warn(`⚠️ Blocked admin route access from IP: ${ip}`);
            return res.status(429).json({
                error: 'Too many requests to admin panel. Please wait before trying again.',
                retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
            });
        }
        requestData.count++;
        if (requestData.count > maxAdminRequests) {
            requestData.blocked = true;
            console.warn(`⚠️ Rate limit exceeded for admin routes from IP: ${ip} (${requestData.count} requests)`);
            return res.status(429).json({
                error: 'Too many requests to admin panel. Please wait before trying again.',
                retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
            });
        }
        return next();
    }
    const authHeader = req.headers.authorization;
    const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');
    if (req.path.includes('/auth/')) {
        return next();
    }
    let maxRequests = hasAuthToken ? 1000 : 300;
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        maxRequests = hasAuthToken ? 500 : 150;
    }
    const requestData = requestCounts.get(ip);
    if (!requestData || now > requestData.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs, blocked: false });
        return next();
    }
    if (requestData.blocked) {
        return res.status(429).json({
            error: 'Too many requests. Your IP has been temporarily blocked.',
            retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        });
    }
    requestData.count++;
    if (requestData.count > maxRequests) {
        requestData.blocked = true;
        const suspicionScore = suspiciousIPs.get(ip) || 0;
        suspiciousIPs.set(ip, suspicionScore + 1);
        if (suspicionScore > 3) {
            ipBlacklist.add(ip);
            console.error(`🚨 IP BLACKLISTED (Rate Limit Abuse): ${ip}`);
        }
        return res.status(429).json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        });
    }
    next();
}
async function ipFilterMiddleware(req, res, next) {
    if (req.path && req.path.includes('/public-checkout')) {
        return next();
    }
    if (req.url && req.url.includes('/public-checkout')) {
        return next();
    }
    if (req.originalUrl && req.originalUrl.includes('/public-checkout')) {
        return next();
    }
    const ip = getClientIP(req);
    const authHeader = req.headers.authorization;
    const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');
    if (hasAuthToken) {
        return next();
    }
    if (req.path.includes('/auth/')) {
        return next();
    }
    if (ipBlacklist.has(ip)) {
        console.error(`🚫 BLOCKED REQUEST from in-memory blacklisted IP: ${ip}`);
        return res.status(403).json({
            error: 'Access denied. Your IP has been blocked due to suspicious activity.',
        });
    }
    try {
        const blockedIP = await prisma.blockedIP.findFirst({
            where: {
                ipAddress: ip,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });
        if (blockedIP) {
            ipBlacklist.add(ip);
            console.error(`🚫 BLOCKED REQUEST from database-blacklisted IP: ${ip}`);
            return res.status(403).json({
                error: 'Access denied. Your IP has been permanently blocked.',
            });
        }
    }
    catch (error) {
        console.error('Error checking blocked IPs:', error);
    }
    const whitelistedIPs = (process.env.WHITELISTED_IPs || '').split(',').filter(Boolean);
    if (req.path.includes('/super-admin') && whitelistedIPs.length > 0) {
        if (!whitelistedIPs.includes(ip)) {
            console.warn(`⚠️ Super Admin access denied for non-whitelisted IP: ${ip}`);
            return res.status(403).json({
                error: 'Access denied. Super Admin panel requires whitelisted IP.',
            });
        }
    }
    next();
}
function maliciousPayloadDetection(req, res, next) {
    console.log(`[SECURITY CHECK] Path: ${req.path}, URL: ${req.url}, OriginalURL: ${req.originalUrl}`);
    if (req.path && req.path.includes('/public-checkout')) {
        console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (path)');
        return next();
    }
    if (req.url && req.url.includes('/public-checkout')) {
        console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (url)');
        return next();
    }
    if (req.originalUrl && req.originalUrl.includes('/public-checkout')) {
        console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (originalUrl)');
        return next();
    }
    console.log('[SECURITY CHECK] NOT skipping - running malicious payload detection');
    const ip = getClientIP(req);
    const authHeader = req.headers.authorization;
    const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');
    if (hasAuthToken) {
        return next();
    }
    const safeEndpoints = [
        '/health',
        '/track/visit',
        '/website-visits',
        '/auth/callback',
        '/auth/google',
        '/auth/',
        '/api-keys',
        '/email-templates',
        '/email-composer',
        '/video-campaigns/synthesize-voice',
        '/video-campaigns/ai',
        '/video-campaigns/complete',
        '/public-checkout',
    ];
    const pathToCheck = req.originalUrl || req.path || req.url;
    if (safeEndpoints.some(endpoint => pathToCheck.includes(endpoint))) {
        return next();
    }
    const maliciousPatterns = [
        /(\.\.|\/etc\/|\/root\/|\/home\/|c:\\|\\\\)/i,
        /<!ENTITY|<!DOCTYPE|SYSTEM\s+["']|PUBLIC\s+["']/i,
        /(\$where|\$ne|\$gt|\$lt|\$regex|\$or|\$and)/,
        /(%0d|%0a|\\r|\\n)/i,
        /(\.php|\.jsp|\.asp|\.exe|\.sh|\.bat)$/i,
    ];
    const checkData = [
        decodeURIComponent(req.url || ''),
        JSON.stringify(req.query),
        JSON.stringify(req.body),
    ].join(' ');
    for (const pattern of maliciousPatterns) {
        if (pattern.test(checkData)) {
            const suspicionScore = suspiciousIPs.get(ip) || 0;
            suspiciousIPs.set(ip, suspicionScore + 5);
            if (suspicionScore > 10) {
                ipBlacklist.add(ip);
            }
            console.error(`🚨 MALICIOUS PAYLOAD DETECTED from IP: ${ip}`, {
                pattern: pattern.toString(),
                path: req.path,
                method: req.method,
            });
            return res.status(400).json({
                error: 'Invalid request. Malicious content detected.',
            });
        }
    }
    next();
}
function bruteForcePrevention(req, res, next) {
    if (!req.path.includes('/login') && !req.path.includes('/auth')) {
        return next();
    }
    const ip = getClientIP(req);
    const identifier = `${ip}:${req.body?.email || 'unknown'}`;
    const now = Date.now();
    const lockoutDuration = 15 * 60 * 1000;
    const maxAttempts = 5;
    const attemptData = failedLoginAttempts.get(identifier);
    if (attemptData) {
        const timeSinceLastAttempt = now - attemptData.lastAttempt;
        if (timeSinceLastAttempt > lockoutDuration) {
            failedLoginAttempts.delete(identifier);
            return next();
        }
        if (attemptData.count >= maxAttempts) {
            const remainingTime = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 1000 / 60);
            console.warn(`🔒 BRUTE FORCE ATTEMPT BLOCKED: ${identifier}`);
            return res.status(429).json({
                error: `Too many failed login attempts. Account temporarily locked.`,
                retryAfter: `${remainingTime} minutes`,
            });
        }
    }
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        if (res.statusCode === 401 || body?.error) {
            const current = failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: now };
            failedLoginAttempts.set(identifier, {
                count: current.count + 1,
                lastAttempt: now,
            });
            const suspicionScore = suspiciousIPs.get(ip) || 0;
            suspiciousIPs.set(ip, suspicionScore + 1);
        }
        else {
            failedLoginAttempts.delete(identifier);
        }
        return originalJson(body);
    };
    next();
}
function requestIntegrityCheck(req, res, next) {
    const publicPaths = ['/health', '/auth/login', '/auth/register', '/track'];
    if (publicPaths.some(path => req.path.includes(path))) {
        return next();
    }
    const timestamp = req.headers['x-request-timestamp'];
    if (timestamp) {
        const requestTime = parseInt(timestamp);
        const now = Date.now();
        const maxAge = 5 * 60 * 1000;
        if (Math.abs(now - requestTime) > maxAge) {
            console.warn(`⚠️ REPLAY ATTACK SUSPECTED: Timestamp out of range`, {
                ip: getClientIP(req),
                path: req.path,
                timestamp,
            });
            return res.status(400).json({
                error: 'Request expired or invalid timestamp.',
            });
        }
    }
    next();
}
function suspiciousActivityDetection(req, res, next) {
    const ip = getClientIP(req);
    const authHeader = req.headers.authorization;
    const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');
    if (hasAuthToken) {
        return next();
    }
    const suspicionScore = suspiciousIPs.get(ip) || 0;
    const decayInterval = 60 * 60 * 1000;
    setTimeout(() => {
        const currentScore = suspiciousIPs.get(ip) || 0;
        if (currentScore > 0) {
            suspiciousIPs.set(ip, Math.max(0, currentScore - 1));
        }
    }, decayInterval);
    let scoreIncrease = 0;
    const userAgent = req.headers['user-agent'] || '';
    if (!userAgent || userAgent.length < 10) {
        scoreIncrease += 2;
    }
    if (res.statusCode === 404) {
        scoreIncrease += 1;
    }
    if (req.method === 'OPTIONS' && !req.headers['access-control-request-method']) {
        scoreIncrease += 1;
    }
    const botPatterns = /(bot|crawler|spider|scraper|curl|wget|python|java|httpclient|axios|fetch|go-http|libwww|mechanize|phantomjs|headless|selenium|puppeteer|playwright|scrapy)/i;
    if (botPatterns.test(userAgent) && !req.path.includes('/health')) {
        scoreIncrease += 1;
    }
    if (scoreIncrease > 0) {
        suspiciousIPs.set(ip, suspicionScore + scoreIncrease);
    }
    if (suspicionScore > 20) {
        ipBlacklist.add(ip);
        console.error(`🚨 IP AUTO-BLOCKED (High Suspicion Score: ${suspicionScore}): ${ip}`);
        return res.status(403).json({
            error: 'Access denied due to suspicious activity.',
        });
    }
    next();
}
function sessionHijackingPrevention(req, res, next) {
    const user = req.user;
    if (!user || !user.id) {
        return next();
    }
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const sessionKey = `session:${user.id}`;
    const fingerprint = crypto_1.default
        .createHash('sha256')
        .update(`${ip}:${userAgent}`)
        .digest('hex');
    const storedFingerprint = sessionFingerprints.get(sessionKey);
    if (!storedFingerprint) {
        sessionFingerprints.set(sessionKey, fingerprint);
    }
    else if (storedFingerprint !== fingerprint) {
        console.error(`🚨 SESSION HIJACKING DETECTED for user: ${user.email}`, {
            userId: user.id,
            ip,
            storedFingerprint,
            currentFingerprint: fingerprint,
        });
        sessionFingerprints.delete(sessionKey);
        return res.status(401).json({
            error: 'Session invalid. Please login again.',
        });
    }
    next();
}
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
            requestCounts.delete(ip);
        }
    }
    for (const [identifier, data] of failedLoginAttempts.entries()) {
        if (now - data.lastAttempt > 15 * 60 * 1000) {
            failedLoginAttempts.delete(identifier);
        }
    }
    for (const [ip, score] of suspiciousIPs.entries()) {
        if (score <= 0) {
            suspiciousIPs.delete(ip);
        }
    }
}, 5 * 60 * 1000);
function getSecurityStats() {
    return {
        blacklistedIPs: Array.from(ipBlacklist),
        suspiciousIPs: Array.from(suspiciousIPs.entries()).map(([ip, score]) => ({ ip, score })),
        activeRateLimits: requestCounts.size,
        failedLoginAttempts: failedLoginAttempts.size,
    };
}
async function blockIP(ip, metadata) {
    ipBlacklist.add(ip);
    try {
        await prisma.blockedIP.upsert({
            where: { ipAddress: ip },
            create: {
                ipAddress: ip,
                reason: metadata?.reason || 'Manually blocked',
                blockedBy: metadata?.blockedBy,
                threatLevel: metadata?.threatLevel,
                attackType: metadata?.attackType,
                attempts: metadata?.attempts || 0,
                country: metadata?.country,
                isActive: true,
                metadata: metadata ? JSON.stringify(metadata) : null
            },
            update: {
                isActive: true,
                reason: metadata?.reason || 'Manually blocked',
                blockedBy: metadata?.blockedBy,
                blockedAt: new Date()
            }
        });
        console.log(`✅ IP permanently blocked (DB + Memory): ${ip}`);
    }
    catch (error) {
        console.error(`Error blocking IP in database: ${ip}`, error);
    }
}
async function unblockIP(ip) {
    ipBlacklist.delete(ip);
    suspiciousIPs.delete(ip);
    try {
        await prisma.blockedIP.updateMany({
            where: { ipAddress: ip },
            data: { isActive: false }
        });
        console.log(`✅ IP unblocked (DB + Memory): ${ip}`);
    }
    catch (error) {
        console.error(`Error unblocking IP in database: ${ip}`, error);
    }
}
//# sourceMappingURL=advancedSecurity.js.map