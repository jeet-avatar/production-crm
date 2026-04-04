"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentSecurityPolicy = contentSecurityPolicy;
exports.additionalSecurityHeaders = additionalSecurityHeaders;
exports.secureCorsHeaders = secureCorsHeaders;
exports.applyAllSecurityHeaders = applyAllSecurityHeaders;
const helmet_1 = __importDefault(require("helmet"));
function contentSecurityPolicy() {
    return helmet_1.default.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://cdn.jsdelivr.net',
                'https://js.stripe.com',
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
            ],
            fontSrc: [
                "'self'",
                'https://fonts.gstatic.com',
            ],
            imgSrc: [
                "'self'",
                'data:',
                'https:',
                'blob:',
            ],
            connectSrc: [
                "'self'",
                'https://api.stripe.com',
                'https://*.amazonaws.com',
                process.env.FRONTEND_URL || 'https://sandbox.brandmonkz.com',
            ],
            frameSrc: [
                "'self'",
                'https://js.stripe.com',
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"],
            workerSrc: ["'self'", 'blob:'],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            upgradeInsecureRequests: [],
        },
    });
}
function additionalSecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', [
        'accelerometer=()',
        'camera=()',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'payment=(self)',
        'usb=()',
    ].join(', '));
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (req.path.includes('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    res.removeHeader('X-Powered-By');
    next();
}
function secureCorsHeaders(req, res, next) {
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://sandbox.brandmonkz.com',
        'http://localhost:3000',
        'http://localhost:5173',
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Session-ID');
        res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
}
function applyAllSecurityHeaders() {
    return [
        (0, helmet_1.default)(),
        contentSecurityPolicy(),
        additionalSecurityHeaders,
        secureCorsHeaders,
    ];
}
exports.default = {
    contentSecurityPolicy,
    additionalSecurityHeaders,
    secureCorsHeaders,
    applyAllSecurityHeaders,
};
//# sourceMappingURL=securityHeaders.js.map