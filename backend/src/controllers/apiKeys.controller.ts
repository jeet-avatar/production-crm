import { Request, Response } from 'express';
import { PrismaClient, ApiKeyType, ApiKeyStatus, ApiProduct } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate a secure API key
function generateApiKey(type: ApiKeyType): { fullKey: string; prefix: string; hash: string } {
  // Generate random bytes for the key
  const randomBytes = crypto.randomBytes(32).toString('hex');

  // Create prefix based on type
  let prefixType = 'live';
  if (type === 'TEST') prefixType = 'test';
  if (type === 'SECRET') prefixType = 'secret';

  const prefix = `bmz_${prefixType}_${crypto.randomBytes(4).toString('hex')}`;
  const fullKey = `${prefix}_${randomBytes}`;

  // Hash the full key for storage
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

  return { fullKey, prefix, hash };
}

// Create new API key
export async function createApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const {
      name,
      keyType = 'LIVE',
      scopes = [],
      products = [],
      rateLimit = 20,
      burstLimit = 50,
      dailyLimit = 10000,
      ipWhitelist = null,
      expiresAt = null,
      description = null,
      environment = 'production'
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    if (!scopes || scopes.length === 0) {
      return res.status(400).json({ error: 'At least one scope is required' });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'At least one product is required' });
    }

    // Generate the API key
    const { fullKey, prefix, hash } = generateApiKey(keyType);

    // Create the API key in database
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

    // Return the full key ONLY this one time (never stored or returned again)
    res.status(201).json({
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: fullKey, // ONLY TIME THIS IS RETURNED
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
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
}

// List all API keys for a user
export async function listApiKeys(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;

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
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
}

// Get single API key details
export async function getApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
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
  } catch (error) {
    console.error('Error getting API key:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
}

// Update API key
export async function updateApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const {
      name,
      scopes,
      products,
      rateLimit,
      burstLimit,
      dailyLimit,
      ipWhitelist,
      expiresAt,
      description,
      environment
    } = req.body;

    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!existingKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (existingKey.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot update a revoked, expired, or suspended API key' });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (scopes !== undefined) updateData.scopes = scopes;
    if (products !== undefined) updateData.products = products;
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (burstLimit !== undefined) updateData.burstLimit = burstLimit;
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit;
    if (ipWhitelist !== undefined) updateData.ipWhitelist = ipWhitelist;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (description !== undefined) updateData.description = description;
    if (environment !== undefined) updateData.environment = environment;

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
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
}

// Revoke API key
export async function revokeApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!existingKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (existingKey.status === 'REVOKED') {
      return res.status(400).json({ error: 'API key is already revoked' });
    }

    // Revoke the key
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
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
}

// Rotate API key (revoke old, create new with same settings)
export async function rotateApiKey(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Get existing key
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!existingKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    if (existingKey.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only rotate active API keys' });
    }

    // Generate new key
    const { fullKey, prefix, hash } = generateApiKey(existingKey.keyType);

    // Create new key with same settings
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

    // Revoke old key
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
        key: fullKey, // ONLY TIME THIS IS RETURNED
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
  } catch (error) {
    console.error('Error rotating API key:', error);
    res.status(500).json({ error: 'Failed to rotate API key' });
  }
}

// Get API key usage statistics
export async function getApiKeyUsage(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { startDate, endDate, product } = req.query;

    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!existingKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Build where clause
    const where: any = { apiKeyId: id };

    if (startDate) {
      where.timestamp = { gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.timestamp = { ...where.timestamp, lte: new Date(endDate as string) };
    }

    if (product) {
      where.product = product;
    }

    // Get usage records
    const usage = await prisma.apiKeyUsage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to last 100 records
    });

    // Get aggregated stats
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
  } catch (error) {
    console.error('Error getting API key usage:', error);
    res.status(500).json({ error: 'Failed to get API key usage' });
  }
}

// Validate API key (for internal use by middleware)
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  keyData?: any;
  error?: string;
}> {
  try {
    // Hash the provided key
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Look up the key
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

    // Check if key is active
    if (keyData.status !== 'ACTIVE') {
      return { valid: false, error: `API key is ${keyData.status.toLowerCase()}` };
    }

    // Check if key is expired
    if (keyData.expiresAt && new Date() > keyData.expiresAt) {
      // Update status to expired
      await prisma.apiKey.update({
        where: { id: keyData.id },
        data: { status: 'EXPIRED' }
      });
      return { valid: false, error: 'API key has expired' };
    }

    return { valid: true, keyData };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Failed to validate API key' };
  }
}

// Track API key usage (for internal use by middleware)
export async function trackApiKeyUsage(data: {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  product: ApiProduct;
  creditsUsed: number;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  try {
    // Create usage record
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

    // Update API key statistics
    await prisma.apiKey.update({
      where: { id: data.apiKeyId },
      data: {
        totalRequests: { increment: 1 },
        lastUsedAt: new Date(),
        lastUsedIp: data.ipAddress
      }
    });
  } catch (error) {
    console.error('Error tracking API key usage:', error);
    // Don't throw error - usage tracking failure shouldn't break the API call
  }
}
