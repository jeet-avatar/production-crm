"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiKey = createApiKey;
exports.listApiKeys = listApiKeys;
exports.getApiKey = getApiKey;
exports.updateApiKey = updateApiKey;
exports.revokeApiKey = revokeApiKey;
exports.rotateApiKey = rotateApiKey;
exports.getApiKeyUsage = getApiKeyUsage;
exports.validateApiKey = validateApiKey;
exports.trackApiKeyUsage = trackApiKeyUsage;
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
function generateApiKey(type) {
    const randomBytes = crypto_1.default.randomBytes(32).toString('hex');
    let prefixType = 'live';
    if (type === 'TEST')
        prefixType = 'test';
    if (type === 'SECRET')
        prefixType = 'secret';
    const prefix = `bmz_${prefixType}_${crypto_1.default.randomBytes(4).toString('hex')}`;
    const fullKey = `${prefix}_${randomBytes}`;
    const hash = crypto_1.default.createHash('sha256').update(fullKey).digest('hex');
    return { fullKey, prefix, hash };
}
async function createApiKey(req, res) {
    try {
        const userId = req.userId;
        const { name, keyType = 'LIVE', scopes = [], products = [], rateLimit = 20, burstLimit = 50, dailyLimit = 10000, ipWhitelist = null, expiresAt = null, description = null, environment = 'production' } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'API key name is required' });
        }
        if (!scopes || scopes.length === 0) {
            return res.status(400).json({ error: 'At least one scope is required' });
        }
        if (!products || products.length === 0) {
            return res.status(400).json({ error: 'At least one product is required' });
        }
        const { fullKey, prefix, hash } = generateApiKey(keyType);
        const apiKey = await prisma.apiKey.create({
            data: {
                userId,
                name: name.trim(),
                keyPrefix: prefix,
                keyHash: hash,
                keyType,
                status: 'ACTIVE',
                scopes,
                products,
                rateLimit,
                burstLimit,
                dailyLimit,
                ipWhitelist,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                description,
                environment
            }
        });
        res.status(201).json({
            message: 'API key created successfully. Save this key securely - it will not be shown again.',
            apiKey: {
                id: apiKey.id,
                name: apiKey.name,
                key: fullKey,
                keyPrefix: apiKey.keyPrefix,
                keyType: apiKey.keyType,
                status: apiKey.status,
                scopes: apiKey.scopes,
                products: apiKey.products,
                rateLimit: apiKey.rateLimit,
                burstLimit: apiKey.burstLimit,
                dailyLimit: apiKey.dailyLimit,
                ipWhitelist: apiKey.ipWhitelist,
                expiresAt: apiKey.expiresAt,
                description: apiKey.description,
                environment: apiKey.environment,
                createdAt: apiKey.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
}
async function listApiKeys(req, res) {
    try {
        const userId = req.userId;
        const apiKeys = await prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                keyType: true,
                status: true,
                scopes: true,
                products: true,
                rateLimit: true,
                burstLimit: true,
                dailyLimit: true,
                ipWhitelist: true,
                expiresAt: true,
                lastUsedAt: true,
                lastUsedIp: true,
                totalRequests: true,
                description: true,
                environment: true,
                createdAt: true,
                updatedAt: true,
                revokedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ apiKeys });
    }
    catch (error) {
        console.error('Error listing API keys:', error);
        res.status(500).json({ error: 'Failed to list API keys' });
    }
}
async function getApiKey(req, res) {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const apiKey = await prisma.apiKey.findFirst({
            where: {
                id,
                userId
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                keyType: true,
                status: true,
                scopes: true,
                products: true,
                rateLimit: true,
                burstLimit: true,
                dailyLimit: true,
                ipWhitelist: true,
                expiresAt: true,
                lastUsedAt: true,
                lastUsedIp: true,
                totalRequests: true,
                description: true,
                environment: true,
                createdAt: true,
                updatedAt: true,
                revokedAt: true,
                revokedBy: true
            }
        });
        if (!apiKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        res.json({ apiKey });
    }
    catch (error) {
        console.error('Error getting API key:', error);
        res.status(500).json({ error: 'Failed to get API key' });
    }
}
async function updateApiKey(req, res) {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { name, scopes, products, rateLimit, burstLimit, dailyLimit, ipWhitelist, expiresAt, description, environment } = req.body;
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });
        if (!existingKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        if (existingKey.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Cannot update a revoked, expired, or suspended API key' });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name.trim();
        if (scopes !== undefined)
            updateData.scopes = scopes;
        if (products !== undefined)
            updateData.products = products;
        if (rateLimit !== undefined)
            updateData.rateLimit = rateLimit;
        if (burstLimit !== undefined)
            updateData.burstLimit = burstLimit;
        if (dailyLimit !== undefined)
            updateData.dailyLimit = dailyLimit;
        if (ipWhitelist !== undefined)
            updateData.ipWhitelist = ipWhitelist;
        if (expiresAt !== undefined)
            updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
        if (description !== undefined)
            updateData.description = description;
        if (environment !== undefined)
            updateData.environment = environment;
        const apiKey = await prisma.apiKey.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                keyType: true,
                status: true,
                scopes: true,
                products: true,
                rateLimit: true,
                burstLimit: true,
                dailyLimit: true,
                ipWhitelist: true,
                expiresAt: true,
                lastUsedAt: true,
                lastUsedIp: true,
                totalRequests: true,
                description: true,
                environment: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({
            message: 'API key updated successfully',
            apiKey
        });
    }
    catch (error) {
        console.error('Error updating API key:', error);
        res.status(500).json({ error: 'Failed to update API key' });
    }
}
async function revokeApiKey(req, res) {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });
        if (!existingKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        if (existingKey.status === 'REVOKED') {
            return res.status(400).json({ error: 'API key is already revoked' });
        }
        const apiKey = await prisma.apiKey.update({
            where: { id },
            data: {
                status: 'REVOKED',
                revokedAt: new Date(),
                revokedBy: userId
            },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                status: true,
                revokedAt: true
            }
        });
        res.json({
            message: 'API key revoked successfully',
            apiKey
        });
    }
    catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).json({ error: 'Failed to revoke API key' });
    }
}
async function rotateApiKey(req, res) {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });
        if (!existingKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        if (existingKey.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Can only rotate active API keys' });
        }
        const { fullKey, prefix, hash } = generateApiKey(existingKey.keyType);
        const newApiKey = await prisma.apiKey.create({
            data: {
                userId,
                name: `${existingKey.name} (Rotated)`,
                keyPrefix: prefix,
                keyHash: hash,
                keyType: existingKey.keyType,
                status: 'ACTIVE',
                scopes: existingKey.scopes,
                products: existingKey.products,
                rateLimit: existingKey.rateLimit,
                burstLimit: existingKey.burstLimit,
                dailyLimit: existingKey.dailyLimit,
                ipWhitelist: existingKey.ipWhitelist,
                expiresAt: existingKey.expiresAt,
                description: existingKey.description,
                environment: existingKey.environment
            }
        });
        await prisma.apiKey.update({
            where: { id },
            data: {
                status: 'REVOKED',
                revokedAt: new Date(),
                revokedBy: userId
            }
        });
        res.json({
            message: 'API key rotated successfully. Save the new key securely - it will not be shown again.',
            oldKeyId: existingKey.id,
            newApiKey: {
                id: newApiKey.id,
                name: newApiKey.name,
                key: fullKey,
                keyPrefix: newApiKey.keyPrefix,
                keyType: newApiKey.keyType,
                status: newApiKey.status,
                scopes: newApiKey.scopes,
                products: newApiKey.products,
                rateLimit: newApiKey.rateLimit,
                burstLimit: newApiKey.burstLimit,
                dailyLimit: newApiKey.dailyLimit,
                createdAt: newApiKey.createdAt
            }
        });
    }
    catch (error) {
        console.error('Error rotating API key:', error);
        res.status(500).json({ error: 'Failed to rotate API key' });
    }
}
async function getApiKeyUsage(req, res) {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { startDate, endDate, product } = req.query;
        const existingKey = await prisma.apiKey.findFirst({
            where: { id, userId }
        });
        if (!existingKey) {
            return res.status(404).json({ error: 'API key not found' });
        }
        const where = { apiKeyId: id };
        if (startDate) {
            where.timestamp = { gte: new Date(startDate) };
        }
        if (endDate) {
            where.timestamp = { ...where.timestamp, lte: new Date(endDate) };
        }
        if (product) {
            where.product = product;
        }
        const usage = await prisma.apiKeyUsage.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        const stats = await prisma.apiKeyUsage.groupBy({
            by: ['product'],
            where: { apiKeyId: id },
            _count: { id: true },
            _sum: { creditsUsed: true },
            _avg: { responseTime: true }
        });
        res.json({
            usage,
            stats: stats.map(s => ({
                product: s.product,
                totalRequests: s._count.id,
                totalCredits: s._sum.creditsUsed || 0,
                avgResponseTime: Math.round(s._avg.responseTime || 0)
            })),
            totalRequests: existingKey.totalRequests
        });
    }
    catch (error) {
        console.error('Error getting API key usage:', error);
        res.status(500).json({ error: 'Failed to get API key usage' });
    }
}
async function validateApiKey(apiKey) {
    try {
        const hash = crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
        const keyData = await prisma.apiKey.findUnique({
            where: { keyHash: hash },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });
        if (!keyData) {
            return { valid: false, error: 'Invalid API key' };
        }
        if (keyData.status !== 'ACTIVE') {
            return { valid: false, error: `API key is ${keyData.status.toLowerCase()}` };
        }
        if (keyData.expiresAt && new Date() > keyData.expiresAt) {
            await prisma.apiKey.update({
                where: { id: keyData.id },
                data: { status: 'EXPIRED' }
            });
            return { valid: false, error: 'API key has expired' };
        }
        return { valid: true, keyData };
    }
    catch (error) {
        console.error('Error validating API key:', error);
        return { valid: false, error: 'Failed to validate API key' };
    }
}
async function trackApiKeyUsage(data) {
    try {
        await prisma.apiKeyUsage.create({
            data: {
                apiKeyId: data.apiKeyId,
                endpoint: data.endpoint,
                method: data.method,
                statusCode: data.statusCode,
                responseTime: data.responseTime,
                product: data.product,
                creditsUsed: data.creditsUsed,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                requestId: data.requestId,
                errorCode: data.errorCode,
                errorMessage: data.errorMessage
            }
        });
        await prisma.apiKey.update({
            where: { id: data.apiKeyId },
            data: {
                totalRequests: { increment: 1 },
                lastUsedAt: new Date(),
                lastUsedIp: data.ipAddress
            }
        });
    }
    catch (error) {
        console.error('Error tracking API key usage:', error);
    }
}
//# sourceMappingURL=apiKeys.controller.js.map