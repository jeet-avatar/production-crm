"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = generateCsrfToken;
exports.validateCsrfToken = validateCsrfToken;
exports.csrfProtection = csrfProtection;
exports.getCsrfToken = getCsrfToken;
const crypto_1 = __importDefault(require("crypto"));
const csrfTokenStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of csrfTokenStore.entries()) {
        if (value.expiresAt < now) {
            csrfTokenStore.delete(key);
        }
    }
}, 3600000);
function generateCsrfToken(sessionId) {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000;
    csrfTokenStore.set(sessionId, { token, expiresAt });
    return token;
}
function validateCsrfToken(sessionId, token) {
    const stored = csrfTokenStore.get(sessionId);
    if (!stored) {
        return false;
    }
    if (stored.expiresAt < Date.now()) {
        csrfTokenStore.delete(sessionId);
        return false;
    }
    return stored.token === token;
}
function csrfProtection(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    if (req.headers.authorization) {
        return next();
    }
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId) {
        return res.status(403).json({
            error: 'CSRF protection',
            message: 'Session ID required for CSRF protection'
        });
    }
    const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!csrfToken) {
        return res.status(403).json({
            error: 'CSRF protection',
            message: 'CSRF token missing'
        });
    }
    if (!validateCsrfToken(sessionId, csrfToken)) {
        console.warn('[CSRF Protection] Invalid token attempt:', {
            sessionId,
            ip: req.ip,
            path: req.path,
            method: req.method,
        });
        return res.status(403).json({
            error: 'CSRF protection',
            message: 'Invalid or expired CSRF token'
        });
    }
    next();
}
function getCsrfToken(req, res) {
    const sessionId = req.cookies?.sessionId || crypto_1.default.randomBytes(16).toString('hex');
    const token = generateCsrfToken(sessionId);
    if (!req.cookies?.sessionId) {
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000,
        });
    }
    res.json({ csrfToken: token });
}
exports.default = {
    csrfProtection,
    generateCsrfToken,
    validateCsrfToken,
    getCsrfToken,
};
//# sourceMappingURL=csrfProtection.js.map