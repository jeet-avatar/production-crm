import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover',
});

// POST /api/public-checkout/create-session - Create Stripe checkout session (NO AUTH REQUIRED)
// This is for the public pricing page at brandmonkz.com/pricing
router.post('/create-session', async (req: Request, res: Response) => {
  console.log('🛒 [PUBLIC CHECKOUT] Route reached! Creating checkout session...');

  try {
    const { priceId, planName, billingCycle } = req.body;

    if (!priceId) {
      console.log('🛒 [PUBLIC CHECKOUT] Error: Missing price ID');
      return res.status(400).json({ error: 'Price ID is required' });
    }

    console.log('🛒 [PUBLIC CHECKOUT] Creating Stripe session:', {
      priceId,
      planName,
      billingCycle,
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        trial_period_days: Number.parseInt(process.env.TRIAL_DAYS || '14'),
      },
      metadata: {
        planName: planName || 'Unknown Plan',
        billingCycle: billingCycle || 'monthly',
      },
    });

    res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating public checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message || 'Unknown error',
    });
  }
});

export default router;