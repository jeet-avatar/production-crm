import { Router } from 'express';
import express from 'express';
import {
  getApiPlans,
  getCurrentSubscription,
  createCheckoutSession,
  handleStripeWebhook,
  cancelSubscription,
} from '../controllers/apiSubscriptions.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public route - get available plans
router.get('/plans', getApiPlans);

// Stripe webhook (no auth, verified by signature)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Protected routes
router.use(authenticateJWT);

// Get current subscription
router.get('/current', getCurrentSubscription);

// Create checkout session
router.post('/checkout', createCheckoutSession);

// Cancel subscription
router.post('/cancel', cancelSubscription);

export default router;
