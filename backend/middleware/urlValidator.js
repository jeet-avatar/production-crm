"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKED_DOMAINS = void 0;
exports.isUrlBlocked = isUrlBlocked;
exports.validateUrl = validateUrl;
exports.urlValidationMiddleware = urlValidationMiddleware;
exports.BLOCKED_DOMAINS = [
    'bedpage.com',
    'www.bedpage.com',
];
function isUrlBlocked(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        return exports.BLOCKED_DOMAINS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`));
    }
    catch (error) {
        return true;
    }
}
function validateUrl(url, fieldName = 'URL') {
    if (isUrlBlocked(url)) {
        throw new Error(`${fieldName} contains a blocked domain`);
    }
}
function urlValidationMiddleware(fields) {
    return (req, res, next) => {
        try {
            for (const field of fields) {
                const url = req.body[field];
                if (url && typeof url === 'string') {
                    validateUrl(url, field);
                }
            }
            next();
        }
        catch (error) {
            res.status(400).json({
                error: 'Invalid URL',
                message: error.message
            });
        }
    };
}
//# sourceMappingURL=urlValidator.js.map