/**
 * P0-07 FIX: Idempotency Middleware
 *
 * Problem: Users can trigger duplicate enrichments via:
 * - Double-clicking "AI Enrich" button
 * - Retrying after timeout
 * - Opening multiple tabs
 *
 * Result: Double billing, duplicate operations, wasted API calls
 *
 * Solution: Track request uniqueness via SHA-256 hash of parameters
 * - If processing → return 409 (conflict)
 * - If completed → return cached response
 * - If failed recently → rate limit retry
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import crypto from 'crypto';

// Extend Express Request type to include idempotencyKey
declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

/**
 * Idempotency middleware for enrichment endpoints
 *
 * Checks if request is duplicate and handles accordingly:
 * - processing: Return 409 with retry-after header
 * - completed: Return cached response
 * - failed: Allow retry after 5 minutes
 */
export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to POST requests on /enrich endpoints
  if (req.method !== 'POST' || !req.path.includes('/enrich')) {
    return next();
  }

  try {
    // Generate idempotency key from request parameters
    const keyData = {
      userId: req.user?.id,
      companyId: req.params.id, // Company ID from URL
      action: 'enrich',
      // Include timestamp rounded to nearest minute to allow retries after 1 minute
      timestamp: Math.floor(Date.now() / 60000), // Round to minute
    };

    // Create SHA-256 hash of key data
    const key = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');

    // Check if this exact request was already processed
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing) {
      // Case 1: Request is currently being processed
      if (existing.status === 'processing') {
        const processingTime = Date.now() - existing.createdAt.getTime();
        const estimatedRemaining = Math.max(0, 60000 - processingTime); // Assume 60s max

        return res.status(409).json({
          error: 'Request already in progress',
          message: 'This company is currently being enriched. Please wait.',
          status: 'processing',
          processingTimeMs: processingTime,
          estimatedRemainingMs: estimatedRemaining,
          retryAfter: Math.ceil(estimatedRemaining / 1000), // seconds
        });
      }

      // Case 2: Request was completed successfully, return cached response
      if (existing.status === 'completed' && existing.response) {
        console.log(`✓ Idempotency: Returning cached response for key ${key.substring(0, 12)}...`);

        return res.json({
          ...(existing.response as object),
          _cached: true, // Indicate this is a cached response
          _cachedAt: existing.createdAt,
        });
      }

      // Case 3: Previous request failed, check if retry is allowed
      if (existing.status === 'failed') {
        const failedAt = existing.createdAt;
        const retryAllowedAt = new Date(failedAt.getTime() + 5 * 60 * 1000); // 5 minutes

        if (new Date() < retryAllowedAt) {
          const retryAfter = Math.ceil((retryAllowedAt.getTime() - Date.now()) / 1000);

          return res.status(429).json({
            error: 'Recent failure, retry not allowed yet',
            message: 'Previous enrichment failed. Please wait before retrying.',
            status: 'failed',
            failedAt: failedAt.toISOString(),
            retryAllowedAt: retryAllowedAt.toISOString(),
            retryAfter, // seconds
          });
        }

        // Retry allowed after 5 minutes, delete old key to allow new attempt
        await prisma.idempotencyKey.delete({ where: { key } });
      }
    }

    // Create new idempotency key record with status "processing"
    await prisma.idempotencyKey.create({
      data: {
        key,
        userId: req.user?.id!,
        status: 'processing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
      },
    });

    // Store key in request for completion handler
    req.idempotencyKey = key;

    next();
  } catch (error) {
    // Don't block request on idempotency check failure (graceful degradation)
    console.error('Idempotency check failed:', error);
    next();
  }
}

/**
 * Mark idempotency key as completed with cached response
 *
 * @param key - Idempotency key
 * @param response - Response to cache
 * @param status - 'completed' or 'failed'
 */
export async function markIdempotencyComplete(
  key: string,
  response: any,
  status: 'completed' | 'failed'
) {
  try {
    await prisma.idempotencyKey.update({
      where: { key },
      data: {
        status,
        response: status === 'completed' ? response : null,
      },
    });
  } catch (error) {
    console.error('Failed to mark idempotency complete:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Cleanup expired idempotency keys (run daily via cron job)
 *
 * @returns Number of keys deleted
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(), // Less than current time = expired
        },
      },
    });

    console.log(`✓ Cleaned up ${result.count} expired idempotency keys`);
    return result.count;
  } catch (error) {
    console.error('Failed to cleanup idempotency keys:', error);
    return 0;
  }
}
