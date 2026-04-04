"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeFilename = sanitizeFilename;
exports.validatePathInDirectory = validatePathInDirectory;
exports.safePathJoin = safePathJoin;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeString = sanitizeString;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeURL = sanitizeURL;
exports.sanitizeInteger = sanitizeInteger;
exports.sanitizeBoolean = sanitizeBoolean;
exports.sanitizeLogMessage = sanitizeLogMessage;
const path_1 = __importDefault(require("path"));
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        throw new Error('Invalid filename');
    }
    let sanitized = filename.replace(/\.\./g, '');
    sanitized = sanitized.replace(/[\/\\]/g, '');
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (sanitized.startsWith('.')) {
        sanitized = sanitized.substring(1);
    }
    if (!sanitized || sanitized.length === 0) {
        throw new Error('Filename becomes empty after sanitization');
    }
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255);
    }
    return sanitized;
}
function validatePathInDirectory(filePath, baseDir) {
    const resolvedPath = path_1.default.resolve(filePath);
    const resolvedBaseDir = path_1.default.resolve(baseDir);
    if (!resolvedPath.startsWith(resolvedBaseDir + path_1.default.sep) && resolvedPath !== resolvedBaseDir) {
        throw new Error('Path traversal attempt detected');
    }
}
function safePathJoin(baseDir, ...parts) {
    const sanitizedParts = parts.map(part => sanitizeFilename(part));
    const joinedPath = path_1.default.join(baseDir, ...sanitizedParts);
    validatePathInDirectory(joinedPath, baseDir);
    return joinedPath;
}
function sanitizeObject(input, allowedFields) {
    if (!input || typeof input !== 'object') {
        return {};
    }
    const sanitized = {};
    for (const field of allowedFields) {
        if (input.hasOwnProperty(field)) {
            sanitized[field] = input[field];
        }
    }
    return sanitized;
}
function sanitizeString(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    let sanitized = input.trim();
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
}
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        throw new Error('Invalid email');
    }
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email format');
    }
    return sanitized;
}
function sanitizeURL(url, allowedProtocols = ['http', 'https']) {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
    }
    const sanitized = url.trim();
    try {
        const urlObj = new URL(sanitized);
        if (!allowedProtocols.includes(urlObj.protocol.replace(':', ''))) {
            throw new Error('Protocol not allowed');
        }
        return sanitized;
    }
    catch (error) {
        throw new Error('Invalid URL format');
    }
}
function sanitizeInteger(input, min, max) {
    const num = parseInt(input, 10);
    if (isNaN(num)) {
        throw new Error('Invalid integer');
    }
    if (min !== undefined && num < min) {
        throw new Error(`Value must be at least ${min}`);
    }
    if (max !== undefined && num > max) {
        throw new Error(`Value must be at most ${max}`);
    }
    return num;
}
function sanitizeBoolean(input) {
    if (typeof input === 'boolean') {
        return input;
    }
    if (typeof input === 'string') {
        const lower = input.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
            return false;
        }
    }
    if (typeof input === 'number') {
        return input !== 0;
    }
    throw new Error('Invalid boolean value');
}
function sanitizeLogMessage(message) {
    if (!message || typeof message !== 'string') {
        return '';
    }
    return message.replace(/%[sdifoOj]/g, '%%');
}
//# sourceMappingURL=security.js.map