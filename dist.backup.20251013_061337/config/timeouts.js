"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMEOUTS = void 0;
exports.TIMEOUTS = {
    scraper: {
        timeout: Number.parseInt(process.env.SCRAPER_TIMEOUT_MS || '10000'),
        maxChars: Number.parseInt(process.env.SCRAPER_MAX_CHARS || '3000'),
        maxCharsLinkedIn: Number.parseInt(process.env.SCRAPER_MAX_CHARS_LINKEDIN || '2000'),
    },
    enrichment: {
        rateLimitMs: Number.parseInt(process.env.ENRICHMENT_RATE_LIMIT_MS || '1000'),
    },
    verification: {
        codeExpiryMs: Number.parseInt(process.env.VERIFICATION_CODE_EXPIRY_MS || '900000'),
        codeMin: Number.parseInt(process.env.VERIFICATION_CODE_MIN || '100000'),
        codeMax: Number.parseInt(process.env.VERIFICATION_CODE_MAX || '999999'),
    },
    s3: {
        presignedUrlExpiry: Number.parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '3600'),
    },
};
//# sourceMappingURL=timeouts.js.map