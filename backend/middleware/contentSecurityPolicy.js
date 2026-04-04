"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictContentSecurityPolicy = strictContentSecurityPolicy;
exports.generateSRIHash = generateSRIHash;
exports.clickjackingProtection = clickjackingProtection;
exports.mimeTypeProtection = mimeTypeProtection;
exports.strictReferrerPolicy = strictReferrerPolicy;
exports.featurePolicy = featurePolicy;
exports.strictTransportSecurity = strictTransportSecurity;
const crypto_1 = __importDefault(require("crypto"));
function generateNonce() {
    return crypto_1.default.randomBytes(16).toString('base64');
}
function strictContentSecurityPolicy(req, res, next) {
    const nonce = generateNonce();
    req.cspNonce = nonce;
    const cspDirectives = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `font-src 'self' https://fonts.gstatic.com data:`,
        `img-src 'self' data: https: blob:`,
        `media-src 'self' https: blob:`,
        `connect-src 'self' https://accounts.google.com https://www.googleapis.com ${process.env.FRONTEND_URL || '*'}`,
        `frame-src 'self' https://accounts.google.com`,
        `object-src 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
        `frame-ancestors 'none'`,
        `upgrade-insecure-requests`,
    ].join('; ');
    res.setHeader('Content-Security-Policy', cspDirectives);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.removeHeader('X-Powered-By');
    next();
}
function generateSRIHash(content, algorithm = 'sha384') {
    const hash = crypto_1.default.createHash(algorithm).update(content).digest('base64');
    return `${algorithm}-${hash}`;
}
function clickjackingProtection(req, res, next) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    next();
}
function mimeTypeProtection(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.path.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    next();
}
function strictReferrerPolicy(req, res, next) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
}
function featurePolicy(req, res, next) {
    const policy = [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
    ].join(', ');
    res.setHeader('Permissions-Policy', policy);
    next();
}
function strictTransportSecurity(req, res, next) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
}
//# sourceMappingURL=contentSecurityPolicy.js.map