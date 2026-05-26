"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
exports.markIdempotencyComplete = markIdempotencyComplete;
exports.cleanupExpiredIdempotencyKeys = cleanupExpiredIdempotencyKeys;
const app_1 = require("../app");
const crypto_1 = __importDefault(require("crypto"));
async function idempotencyMiddleware(req, res, next) {
    if (req.method !== 'POST' || !req.path.includes('/enrich')) {
        return next();
    }
    try {
        const keyData = {
            userId: req.user?.id,
            companyId: req.params.id,
            action: 'enrich',
            timestamp: Math.floor(Date.now() / 60000),
        };
        const key = crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(keyData))
            .digest('hex');
        const existing = await app_1.prisma.idempotencyKey.findUnique({
            where: { key },
        });
        if (existing) {
            if (existing.status === 'processing') {
                const processingTime = Date.now() - existing.createdAt.getTime();
                const estimatedRemaining = Math.max(0, 60000 - processingTime);
                return res.status(409).json({
                    error: 'Request already in progress',
                    message: 'This company is currently being enriched. Please wait.',
                    status: 'processing',
                    processingTimeMs: processingTime,
                    estimatedRemainingMs: estimatedRemaining,
                    retryAfter: Math.ceil(estimatedRemaining / 1000),
                });
            }
            if (existing.status === 'completed' && existing.response) {
                console.log(`✓ Idempotency: Returning cached response for key ${key.substring(0, 12)}...`);
                return res.json({
                    ...existing.response,
                    _cached: true,
                    _cachedAt: existing.createdAt,
                });
            }
            if (existing.status === 'failed') {
                const failedAt = existing.createdAt;
                const retryAllowedAt = new Date(failedAt.getTime() + 5 * 60 * 1000);
                if (new Date() < retryAllowedAt) {
                    const retryAfter = Math.ceil((retryAllowedAt.getTime() - Date.now()) / 1000);
                    return res.status(429).json({
                        error: 'Recent failure, retry not allowed yet',
                        message: 'Previous enrichment failed. Please wait before retrying.',
                        status: 'failed',
                        failedAt: failedAt.toISOString(),
                        retryAllowedAt: retryAllowedAt.toISOString(),
                        retryAfter,
                    });
                }
                await app_1.prisma.idempotencyKey.delete({ where: { key } });
            }
        }
        await app_1.prisma.idempotencyKey.create({
            data: {
                key,
                userId: req.user?.id,
                status: 'processing',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        req.idempotencyKey = key;
        next();
    }
    catch (error) {
        console.error('Idempotency check failed:', error);
        next();
    }
}
async function markIdempotencyComplete(key, response, status) {
    try {
        await app_1.prisma.idempotencyKey.update({
            where: { key },
            data: {
                status,
                response: status === 'completed' ? response : null,
            },
        });
    }
    catch (error) {
        console.error('Failed to mark idempotency complete:', error);
    }
}
async function cleanupExpiredIdempotencyKeys() {
    try {
        const result = await app_1.prisma.idempotencyKey.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        console.log(`✓ Cleaned up ${result.count} expired idempotency keys`);
        return result.count;
    }
    catch (error) {
        console.error('Failed to cleanup idempotency keys:', error);
        return 0;
    }
}
//# sourceMappingURL=idempotency.js.map