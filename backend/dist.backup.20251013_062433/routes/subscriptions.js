"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const stripe_1 = __importDefault(require("stripe"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-09-30.clover',
});
router.post('/trial', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        res.json({
            message: 'Trial activated successfully - you now have full platform access',
            user,
        });
    }
    catch (error) {
        console.error('Error activating trial:', error);
        res.status(500).json({ error: 'Failed to activate trial' });
    }
});
router.post('/checkout', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { priceId, billingCycle, planId, planName } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!process.env.FRONTEND_URL) {
            return res.status(500).json({ error: 'FRONTEND_URL environment variable is required' });
        }
        const frontendUrl = process.env.FRONTEND_URL;
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            client_reference_id: userId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${frontendUrl}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
            cancel_url: `${frontendUrl}/pricing?canceled=true`,
            metadata: {
                userId: userId,
                planId: planId || 'unknown',
                planName: planName || 'Unknown Plan',
                billingCycle: billingCycle || 'monthly',
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                    planId: planId || 'unknown',
                    planName: planName || 'Unknown Plan',
                },
                trial_period_days: Number.parseInt(process.env.TRIAL_DAYS || '14'),
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required',
        });
        res.json({
            url: session.url,
            sessionId: session.id,
        });
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});
exports.default = router;
//# sourceMappingURL=subscriptions.js.map