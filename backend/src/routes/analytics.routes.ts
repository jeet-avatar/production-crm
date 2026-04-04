import { Router } from 'express';
import {
  getApiKeyAnalytics,
  getTimeSeriesAnalytics,
  getEndpointAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getRecentActivity,
} from '../controllers/analytics.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// All analytics routes require JWT authentication
router.use(authenticateJWT);

// User-level analytics (all API keys combined)
router.get('/user', getUserAnalytics);

// API key-specific analytics
router.get('/api-keys/:keyId/overview', getApiKeyAnalytics);
router.get('/api-keys/:keyId/time-series', getTimeSeriesAnalytics);
router.get('/api-keys/:keyId/endpoints', getEndpointAnalytics);
router.get('/api-keys/:keyId/products', getProductAnalytics);
router.get('/api-keys/:keyId/activity', getRecentActivity);

export default router;
