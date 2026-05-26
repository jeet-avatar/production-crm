import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createApiKey,
  listApiKeys,
  getApiKey,
  updateApiKey,
  revokeApiKey,
  rotateApiKey,
  getApiKeyUsage
} from '../controllers/apiKeys.controller';

const router = Router();

// All API key management routes require JWT authentication (user must be logged in)

/**
 * POST /api/api-keys
 * Create a new API key
 *
 * Body:
 * {
 *   "name": "Production Key",
 *   "keyType": "LIVE" | "TEST" | "SECRET",
 *   "scopes": ["leads:read", "leads:write", "campaigns:read"],
 *   "products": ["LEAD_DISCOVERY", "AI_CONTENT"],
 *   "rateLimit": 20,
 *   "burstLimit": 50,
 *   "dailyLimit": 10000,
 *   "ipWhitelist": ["192.168.1.1", "10.0.0.1"],
 *   "expiresAt": "2025-12-31T23:59:59Z",
 *   "description": "Production API key for lead discovery",
 *   "environment": "production"
 * }
 */
router.post('/', authenticateToken, createApiKey);

/**
 * GET /api/api-keys
 * List all API keys for the authenticated user
 */
router.get('/', authenticateToken, listApiKeys);

/**
 * GET /api/api-keys/:id
 * Get details of a specific API key
 */
router.get('/:id', authenticateToken, getApiKey);

/**
 * PUT /api/api-keys/:id
 * Update an API key
 *
 * Body: Same as POST but all fields optional
 */
router.put('/:id', authenticateToken, updateApiKey);

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key (soft delete - marks as REVOKED)
 */
router.delete('/:id', authenticateToken, revokeApiKey);

/**
 * POST /api/api-keys/:id/rotate
 * Rotate an API key (revokes old key, creates new one with same settings)
 */
router.post('/:id/rotate', authenticateToken, rotateApiKey);

/**
 * GET /api/api-keys/:id/usage
 * Get usage statistics for an API key
 *
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - product: ApiProduct enum value
 */
router.get('/:id/usage', authenticateToken, getApiKeyUsage);

export default router;
