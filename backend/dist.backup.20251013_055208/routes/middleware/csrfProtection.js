"use strict";
/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = generateCsrfToken;
exports.validateCsrfToken = validateCsrfToken;
exports.csrfProtection = csrfProtection;
exports.getCsrfToken = getCsrfToken;
const crypto_1 = __importDefault(require("crypto"));
// Store CSRF tokens in memory (use Redis in production)
const csrfTokenStore = new Map();
// Clean up expired tokens every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of csrfTokenStore.entries()) {
        if (value.expiresAt < now) {
            csrfTokenStore.delete(key);
        }
    }
}, 3600000);
/**
 * Generate CSRF token for a session
 */
function generateCsrfToken(sessionId) {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 hour
    csrfTokenStore.set(sessionId, { token, expiresAt });
    return token;
}
/**
 * Validate CSRF token
 */
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
/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */
function csrfProtection(req, res, next) {
    // Skip CSRF check for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    // Skip CSRF check for API endpoints with JWT authentication
    // (CSRF is primarily needed for cookie-based auth)
    if (req.headers.authorization) {
        return next();
    }
    // Get session ID (from cookie or custom header)
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId) {
        return res.status(403).json({
            error: 'CSRF protection',
            message: 'Session ID required for CSRF protection'
        });
    }
    // Get CSRF token from header or body
    const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!csrfToken) {
        return res.status(403).json({
            error: 'CSRF protection',
            message: 'CSRF token missing'
        });
    }
    // Validate token
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
/**
 * Endpoint to get CSRF token
 */
function getCsrfToken(req, res) {
    const sessionId = req.cookies?.sessionId || crypto_1.default.randomBytes(16).toString('hex');
    const token = generateCsrfToken(sessionId);
    // Set session cookie if not exists
    if (!req.cookies?.sessionId) {
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
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
