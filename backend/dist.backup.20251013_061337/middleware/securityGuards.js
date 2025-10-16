"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInputGuard = sanitizeInputGuard;
exports.sqlInjectionGuard = sqlInjectionGuard;
exports.emailValidationGuard = emailValidationGuard;
exports.urlValidationGuard = urlValidationGuard;
exports.fileUploadGuard = fileUploadGuard;
exports.tokenSecurityGuard = tokenSecurityGuard;
exports.userRateLimitGuard = userRateLimitGuard;
exports.requestSizeGuard = requestSizeGuard;
exports.databaseQueryGuard = databaseQueryGuard;
exports.suspiciousActivityGuard = suspiciousActivityGuard;
exports.applyAllSecurityGuards = applyAllSecurityGuards;
const client_1 = require("@prisma/client");
const validator_1 = __importDefault(require("validator"));
const prisma = new client_1.PrismaClient();
function sanitizeInputGuard(req, res, next) {
    try {
        if (req.query) {
            for (const key in req.query) {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = validator_1.default.escape(req.query[key]);
                }
            }
        }
        if (req.body && typeof req.body === 'object') {
            const htmlAllowedFields = ['content', 'htmlContent', 'body', 'description'];
            for (const key in req.body) {
                if (typeof req.body[key] === 'string' && !htmlAllowedFields.includes(key)) {
                    req.body[key] = validator_1.default.escape(req.body[key]);
                }
            }
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - Input Sanitization Error:', error);
        next();
    }
}
function sqlInjectionGuard(req, res, next) {
    try {
        const suspiciousPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
            /(--|\*\/|\/\*)/g,
            /(\bOR\b.*=.*)/gi,
            /(\bUNION\b.*\bSELECT\b)/gi,
            /(;|\||&)/g,
        ];
        const checkValue = (value, path) => {
            if (typeof value === 'string') {
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(value)) {
                        console.warn(`Security Guard - Potential SQL Injection detected in ${path}:`, value);
                        return false;
                    }
                }
            }
            else if (typeof value === 'object' && value !== null) {
                for (const key in value) {
                    if (!checkValue(value[key], `${path}.${key}`)) {
                        return false;
                    }
                }
            }
            return true;
        };
        if (req.query && !checkValue(req.query, 'query')) {
            return res.status(400).json({
                error: 'Invalid input detected',
                message: 'Request contains potentially malicious content'
            });
        }
        if (req.body && !checkValue(req.body, 'body')) {
            return res.status(400).json({
                error: 'Invalid input detected',
                message: 'Request contains potentially malicious content'
            });
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - SQL Injection Check Error:', error);
        next();
    }
}
function emailValidationGuard(req, res, next) {
    try {
        const emailFields = ['email', 'fromEmail', 'toEmail', 'replyTo', 'recipientEmail'];
        for (const field of emailFields) {
            const email = req.body?.[field] || req.query?.[field];
            if (email && typeof email === 'string') {
                if (!validator_1.default.isEmail(email)) {
                    return res.status(400).json({
                        error: 'Invalid email address',
                        field,
                        message: `The ${field} provided is not a valid email address`
                    });
                }
                const suspiciousPatterns = [
                    /@localhost/i,
                    /@127\.0\.0\.1/i,
                    /@0\.0\.0\.0/i,
                    /\.\./,
                    /@.*@/,
                ];
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(email)) {
                        return res.status(400).json({
                            error: 'Invalid email address',
                            field,
                            message: 'Email address contains suspicious patterns'
                        });
                    }
                }
                req.body[field] = validator_1.default.normalizeEmail(email) || email;
            }
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - Email Validation Error:', error);
        next();
    }
}
function urlValidationGuard(req, res, next) {
    try {
        const urlFields = ['url', 'redirectUrl', 'webhook', 'callback', 'website', 'link'];
        for (const field of urlFields) {
            const url = req.body?.[field] || req.query?.[field];
            if (url && typeof url === 'string') {
                if (!validator_1.default.isURL(url, { require_protocol: true })) {
                    return res.status(400).json({
                        error: 'Invalid URL',
                        field,
                        message: `The ${field} provided is not a valid URL`
                    });
                }
                const blockedProtocols = ['file:', 'ftp:', 'gopher:', 'data:', 'javascript:'];
                for (const protocol of blockedProtocols) {
                    if (url.toLowerCase().startsWith(protocol)) {
                        return res.status(400).json({
                            error: 'Invalid URL protocol',
                            field,
                            message: `The protocol ${protocol} is not allowed`
                        });
                    }
                }
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname.toLowerCase();
                    const blockedHosts = [
                        'localhost',
                        '127.0.0.1',
                        '0.0.0.0',
                        '169.254.169.254',
                        '[::1]',
                    ];
                    if (blockedHosts.includes(hostname)) {
                        return res.status(400).json({
                            error: 'Invalid URL',
                            field,
                            message: 'URLs pointing to localhost or private IPs are not allowed'
                        });
                    }
                    if (hostname.startsWith('10.') ||
                        hostname.startsWith('192.168.') ||
                        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
                        return res.status(400).json({
                            error: 'Invalid URL',
                            field,
                            message: 'URLs pointing to private network ranges are not allowed'
                        });
                    }
                }
                catch (parseError) {
                    return res.status(400).json({
                        error: 'Invalid URL',
                        field,
                        message: 'Unable to parse URL'
                    });
                }
            }
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - URL Validation Error:', error);
        next();
    }
}
function fileUploadGuard(req, res, next) {
    try {
        const files = req.files || [];
        const file = req.file;
        const allFiles = file ? [file] : files;
        if (allFiles.length === 0) {
            return next();
        }
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/json',
        ];
        const maxSize = 10 * 1024 * 1024;
        for (const uploadedFile of allFiles) {
            if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
                return res.status(400).json({
                    error: 'Invalid file type',
                    message: `File type ${uploadedFile.mimetype} is not allowed`,
                    allowedTypes: allowedMimeTypes
                });
            }
            if (uploadedFile.size > maxSize) {
                return res.status(400).json({
                    error: 'File too large',
                    message: `File size ${uploadedFile.size} bytes exceeds maximum of ${maxSize} bytes`
                });
            }
            const suspiciousExtensions = [
                '.exe', '.bat', '.cmd', '.sh', '.ps1',
                '.dll', '.so', '.dylib',
                '.app', '.deb', '.rpm',
                '.jar', '.war',
            ];
            for (const ext of suspiciousExtensions) {
                if (uploadedFile.originalname.toLowerCase().endsWith(ext)) {
                    return res.status(400).json({
                        error: 'Invalid file extension',
                        message: `File extension ${ext} is not allowed`
                    });
                }
            }
            const parts = uploadedFile.originalname.split('.');
            if (parts.length > 2) {
                for (let i = 0; i < parts.length - 1; i++) {
                    const ext = '.' + parts[i].toLowerCase();
                    if (suspiciousExtensions.includes(ext)) {
                        return res.status(400).json({
                            error: 'Invalid file name',
                            message: 'File name contains suspicious patterns'
                        });
                    }
                }
            }
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - File Upload Validation Error:', error);
        next();
    }
}
function tokenSecurityGuard(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Invalid token format',
                message: 'Authorization header must use Bearer scheme'
            });
        }
        const token = authHeader.substring(7);
        if (token.length < 20 || token.length > 1000) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token length is suspicious'
            });
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token format is invalid'
            });
        }
        if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token contains invalid characters'
            });
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - Token Security Error:', error);
        next();
    }
}
function userRateLimitGuard(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next();
        }
        const rateLimitKey = `ratelimit:${userId}:${Date.now()}`;
        res.setHeader('X-RateLimit-Limit', '1000');
        res.setHeader('X-RateLimit-Remaining', '999');
        res.setHeader('X-RateLimit-Reset', String(Date.now() + 3600000));
        next();
    }
    catch (error) {
        console.error('Security Guard - User Rate Limit Error:', error);
        next();
    }
}
function requestSizeGuard(maxSizeBytes = 1024 * 1024) {
    return (req, res, next) => {
        try {
            const contentLength = req.headers['content-length'];
            if (contentLength && Number.parseInt(contentLength) > maxSizeBytes) {
                return res.status(413).json({
                    error: 'Payload too large',
                    message: `Request size ${contentLength} exceeds maximum of ${maxSizeBytes} bytes`
                });
            }
            next();
        }
        catch (error) {
            console.error('Security Guard - Request Size Error:', error);
            next();
        }
    };
}
async function databaseQueryGuard(model, operation, query, userId) {
    try {
        console.log('[DB Security Guard]', {
            timestamp: new Date().toISOString(),
            userId,
            model,
            operation,
            query: JSON.stringify(query).substring(0, 200),
        });
    }
    catch (error) {
        console.error('Database Query Guard Error:', error);
    }
}
function suspiciousActivityGuard(req, res, next) {
    try {
        const suspiciousPatterns = [
            /\.\.[\/\\]/g,
            /\0/g,
            /<script[^>]*>.*?<\/script>/gi,
            /on\w+\s*=/gi,
            /data:text\/html/gi,
        ];
        const requestString = JSON.stringify({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(requestString)) {
                console.warn('[Security Guard] Suspicious activity detected:', {
                    ip: req.ip,
                    userId: req.user?.id,
                    path: req.path,
                    method: req.method,
                    pattern: pattern.toString(),
                    timestamp: new Date().toISOString(),
                });
                break;
            }
        }
        next();
    }
    catch (error) {
        console.error('Security Guard - Suspicious Activity Error:', error);
        next();
    }
}
function applyAllSecurityGuards() {
    return [
        tokenSecurityGuard,
        requestSizeGuard(5 * 1024 * 1024),
        sqlInjectionGuard,
        emailValidationGuard,
        urlValidationGuard,
        suspiciousActivityGuard,
        userRateLimitGuard,
    ];
}
exports.default = {
    sanitizeInputGuard,
    sqlInjectionGuard,
    emailValidationGuard,
    urlValidationGuard,
    fileUploadGuard,
    tokenSecurityGuard,
    userRateLimitGuard,
    requestSizeGuard,
    databaseQueryGuard,
    suspiciousActivityGuard,
    applyAllSecurityGuards,
};
//# sourceMappingURL=securityGuards.js.map