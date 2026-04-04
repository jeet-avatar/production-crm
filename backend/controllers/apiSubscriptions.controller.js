"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PLANS = void 0;
exports.getApiPlans = getApiPlans;
exports.getCurrentSubscription = getCurrentSubscription;
exports.createCheckoutSession = createCheckoutSession;
exports.handleStripeWebhook = handleStripeWebhook;
exports.cancelSubscription = cancelSubscription;
exports.incrementUsage = incrementUsage;
exports.checkCredits = checkCredits;
const client_1 = require("@prisma/client");
const stripe_1 = __importDefault(require("stripe"));
const prisma = new client_1.PrismaClient();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-09-30.clover',
});
exports.API_PLANS = {
    FREE: {
        id: 'free',
        name: 'Free Developer Plan',
        monthlyPrice: 0,
        annualPrice: 0,
        stripePriceId: null,
        limits: {
            leadCredits: 100,
            aiRequests: 500,
            videoCredits: 5,
            emailCredits: 1000,
            enrichmentCredits: 50,
            crmApiCalls: 1000,
            integrationCalls: 500,
        },
        features: [
            '100 Lead Discovery credits/month',
            '500 AI requests/month',
            '5 video generations/month',
            '1,000 email tracking/month',
            '50 enrichment credits/month',
            '1,000 CRM API calls/month',
            '500 integration calls/month',
            'Community support',
            'Documentation access',
            '99% uptime SLA',
        ],
    },
    STARTER: {
        id: 'starter',
        name: 'API Starter Bundle',
        monthlyPrice: 49900,
        annualPrice: 509000,
        stripePriceId: process.env.STRIPE_PRICE_API_STARTER_MONTHLY,
        limits: {
            leadCredits: 500,
            aiRequests: 1000,
            videoCredits: 25,
            emailCredits: 5000,
            enrichmentCredits: 500,
            crmApiCalls: 10000,
            integrationCalls: 5000,
        },
        features: [
            '500 Lead Discovery credits',
            '1,000 AI Generation requests',
            '25 Video generations',
            '5,000 Email tracking',
            '500 Enrichment credits',
            '10,000 CRM API calls',
            '5,000 Integration calls',
            'Email support (24h response)',
            'Community support',
            '99.5% uptime SLA',
        ],
    },
    PROFESSIONAL: {
        id: 'professional',
        name: 'API Professional Bundle',
        monthlyPrice: 149900,
        annualPrice: 1529000,
        stripePriceId: process.env.STRIPE_PRICE_API_PROFESSIONAL_MONTHLY,
        limits: {
            leadCredits: 2000,
            aiRequests: 5000,
            videoCredits: 100,
            emailCredits: 25000,
            enrichmentCredits: 2500,
            crmApiCalls: 50000,
            integrationCalls: 25000,
        },
        features: [
            '2,000 Lead Discovery credits',
            '5,000 AI Generation requests',
            '100 Video generations',
            '25,000 Email tracking',
            '2,500 Enrichment credits',
            '50,000 CRM API calls',
            '25,000 Integration calls',
            'Priority email support (4h response)',
            'Phone support (business hours)',
            '99.9% uptime SLA',
            'API health dashboard',
            'Custom webhook endpoints',
        ],
        popular: true,
    },
    BUSINESS: {
        id: 'business',
        name: 'API Business Bundle',
        monthlyPrice: 399900,
        annualPrice: 3839000,
        stripePriceId: process.env.STRIPE_PRICE_API_BUSINESS_MONTHLY,
        limits: {
            leadCredits: 10000,
            aiRequests: 20000,
            videoCredits: 500,
            emailCredits: 100000,
            enrichmentCredits: 10000,
            crmApiCalls: 250000,
            integrationCalls: 100000,
        },
        features: [
            '10,000 Lead Discovery credits',
            '20,000 AI Generation requests',
            '500 Video generations',
            '100,000 Email tracking',
            '10,000 Enrichment credits',
            '250,000 CRM API calls',
            '100,000 Integration calls',
            'Priority phone support',
            '99.95% uptime SLA',
            'Dedicated account manager',
            'Custom integrations (5 hours/month)',
            'Advanced analytics dashboard',
            'White-label option (+$500/month)',
        ],
    },
    ENTERPRISE: {
        id: 'enterprise',
        name: 'API Enterprise Plan',
        monthlyPrice: null,
        annualPrice: null,
        stripePriceId: null,
        limits: {
            leadCredits: -1,
            aiRequests: -1,
            videoCredits: -1,
            emailCredits: -1,
            enrichmentCredits: -1,
            crmApiCalls: -1,
            integrationCalls: -1,
        },
        features: [
            'Unlimited API calls across all products',
            'Custom SLA (up to 99.99%)',
            'Dedicated infrastructure',
            'Custom rate limits',
            'Priority feature requests',
            'Custom contract terms',
            'Volume discounts',
            'Dedicated technical account manager',
            'Custom integrations',
            'White-label included',
            'On-premise deployment option',
        ],
    },
};
async function getApiPlans(req, res) {
    try {
        res.json({ plans: Object.values(exports.API_PLANS) });
    }
    catch (error) {
        console.error('Error fetching API plans:', error);
        res.status(500).json({ error: 'Failed to fetch API plans' });
    }
}
async function getCurrentSubscription(req, res) {
    try {
        const userId = req.userId;
        let subscription = await prisma.apiSubscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            subscription = await prisma.apiSubscription.create({
                data: {
                    userId,
                    planName: exports.API_PLANS.FREE.name,
                    planTier: 'free',
                    monthlyPrice: 0,
                    leadCredits: exports.API_PLANS.FREE.limits.leadCredits,
                    aiRequests: exports.API_PLANS.FREE.limits.aiRequests,
                    videoCredits: exports.API_PLANS.FREE.limits.videoCredits,
                    emailCredits: exports.API_PLANS.FREE.limits.emailCredits,
                    enrichmentCredits: exports.API_PLANS.FREE.limits.enrichmentCredits,
                    crmApiCalls: exports.API_PLANS.FREE.limits.crmApiCalls,
                    integrationCalls: exports.API_PLANS.FREE.limits.integrationCalls,
                    usedLeadCredits: 0,
                    usedAiRequests: 0,
                    usedVideoCredits: 0,
                    usedEmailCredits: 0,
                    usedEnrichmentCredits: 0,
                    usedCrmApiCalls: 0,
                    usedIntegrationCalls: 0,
                    billingCycle: 'monthly',
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    status: 'active',
                },
            });
        }
        const now = new Date();
        if (subscription.currentPeriodEnd < now) {
            const newPeriodEnd = new Date(now);
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
            subscription = await prisma.apiSubscription.update({
                where: { userId },
                data: {
                    usedLeadCredits: 0,
                    usedAiRequests: 0,
                    usedVideoCredits: 0,
                    usedEmailCredits: 0,
                    usedEnrichmentCredits: 0,
                    usedCrmApiCalls: 0,
                    usedIntegrationCalls: 0,
                    currentPeriodStart: now,
                    currentPeriodEnd: newPeriodEnd,
                },
            });
        }
        const usage = {
            leadCredits: {
                used: subscription.usedLeadCredits,
                limit: subscription.leadCredits,
                percentage: subscription.leadCredits > 0
                    ? Math.round((subscription.usedLeadCredits / subscription.leadCredits) * 100)
                    : 0,
            },
            aiRequests: {
                used: subscription.usedAiRequests,
                limit: subscription.aiRequests,
                percentage: subscription.aiRequests > 0
                    ? Math.round((subscription.usedAiRequests / subscription.aiRequests) * 100)
                    : 0,
            },
            videoCredits: {
                used: subscription.usedVideoCredits,
                limit: subscription.videoCredits,
                percentage: subscription.videoCredits > 0
                    ? Math.round((subscription.usedVideoCredits / subscription.videoCredits) * 100)
                    : 0,
            },
            emailCredits: {
                used: subscription.usedEmailCredits,
                limit: subscription.emailCredits,
                percentage: subscription.emailCredits > 0
                    ? Math.round((subscription.usedEmailCredits / subscription.emailCredits) * 100)
                    : 0,
            },
            enrichmentCredits: {
                used: subscription.usedEnrichmentCredits,
                limit: subscription.enrichmentCredits,
                percentage: subscription.enrichmentCredits > 0
                    ? Math.round((subscription.usedEnrichmentCredits / subscription.enrichmentCredits) * 100)
                    : 0,
            },
            crmApiCalls: {
                used: subscription.usedCrmApiCalls,
                limit: subscription.crmApiCalls,
                percentage: subscription.crmApiCalls > 0
                    ? Math.round((subscription.usedCrmApiCalls / subscription.crmApiCalls) * 100)
                    : 0,
            },
            integrationCalls: {
                used: subscription.usedIntegrationCalls,
                limit: subscription.integrationCalls,
                percentage: subscription.integrationCalls > 0
                    ? Math.round((subscription.usedIntegrationCalls / subscription.integrationCalls) * 100)
                    : 0,
            },
        };
        res.json({ subscription, usage });
    }
    catch (error) {
        console.error('Error fetching current subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
}
async function createCheckoutSession(req, res) {
    try {
        const userId = req.userId;
        const { planId, billingCycle = 'monthly' } = req.body;
        const plan = Object.values(exports.API_PLANS).find(p => p.id === planId);
        if (!plan || planId === 'free' || planId === 'enterprise') {
            return res.status(400).json({
                error: 'Invalid plan',
                message: 'Please select a valid paid plan. Contact sales for Enterprise plans.',
            });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, firstName: true, lastName: true },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        let stripeCustomerId;
        const existingSubscription = await prisma.apiSubscription.findUnique({
            where: { userId },
        });
        if (existingSubscription?.stripeCustomerId) {
            stripeCustomerId = existingSubscription.stripeCustomerId;
        }
        else {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
                metadata: { userId },
            });
            stripeCustomerId = customer.id;
        }
        const priceAmount = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                            description: `${plan.features.slice(0, 3).join(', ')}...`,
                        },
                        recurring: {
                            interval: billingCycle === 'annual' ? 'year' : 'month',
                        },
                        unit_amount: priceAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/api-subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/api-subscription?cancelled=true`,
            metadata: {
                userId,
                planId,
                billingCycle,
            },
        });
        res.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session', message: error.message });
    }
}
async function handleStripeWebhook(req, res) {
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return res.status(500).json({ error: 'Webhook secret not configured' });
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).json({ error: 'Invalid signature' });
        }
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutCompleted(session);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdated(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await handlePaymentSucceeded(invoice);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await handlePaymentFailed(invoice);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
}
async function handleCheckoutCompleted(session) {
    const { userId, planId, billingCycle } = session.metadata || {};
    if (!userId || !planId) {
        console.error('Missing metadata in checkout session');
        return;
    }
    const plan = Object.values(exports.API_PLANS).find(p => p.id === planId);
    if (!plan) {
        console.error('Invalid plan ID:', planId);
        return;
    }
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'annual') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    await prisma.apiSubscription.upsert({
        where: { userId },
        create: {
            userId,
            planName: plan.name,
            planTier: planId,
            monthlyPrice: plan.monthlyPrice,
            leadCredits: plan.limits.leadCredits,
            aiRequests: plan.limits.aiRequests,
            videoCredits: plan.limits.videoCredits,
            emailCredits: plan.limits.emailCredits,
            enrichmentCredits: plan.limits.enrichmentCredits,
            crmApiCalls: plan.limits.crmApiCalls,
            integrationCalls: plan.limits.integrationCalls,
            usedLeadCredits: 0,
            usedAiRequests: 0,
            usedVideoCredits: 0,
            usedEmailCredits: 0,
            usedEnrichmentCredits: 0,
            usedCrmApiCalls: 0,
            usedIntegrationCalls: 0,
            billingCycle: billingCycle || 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            status: 'active',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
        },
        update: {
            planName: plan.name,
            planTier: planId,
            monthlyPrice: plan.monthlyPrice,
            leadCredits: plan.limits.leadCredits,
            aiRequests: plan.limits.aiRequests,
            videoCredits: plan.limits.videoCredits,
            emailCredits: plan.limits.emailCredits,
            enrichmentCredits: plan.limits.enrichmentCredits,
            crmApiCalls: plan.limits.crmApiCalls,
            integrationCalls: plan.limits.integrationCalls,
            billingCycle: billingCycle || 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            status: 'active',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            cancelAtPeriodEnd: false,
        },
    });
    console.log(`Subscription created/updated for user ${userId}`);
}
async function handleSubscriptionUpdated(subscription) {
    const stripeSubscriptionId = subscription.id;
    const existingSub = await prisma.apiSubscription.findUnique({
        where: { stripeSubscriptionId },
    });
    if (!existingSub) {
        console.error('Subscription not found:', stripeSubscriptionId);
        return;
    }
    await prisma.apiSubscription.update({
        where: { stripeSubscriptionId },
        data: {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
    });
    console.log(`Subscription updated: ${stripeSubscriptionId}`);
}
async function handleSubscriptionDeleted(subscription) {
    const stripeSubscriptionId = subscription.id;
    await prisma.apiSubscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
            status: 'cancelled',
            cancelledAt: new Date(),
        },
    });
    console.log(`Subscription cancelled: ${stripeSubscriptionId}`);
}
async function handlePaymentSucceeded(invoice) {
    console.log(`Payment succeeded for invoice: ${invoice.id}`);
}
async function handlePaymentFailed(invoice) {
    const stripeSubscriptionId = invoice.subscription;
    if (stripeSubscriptionId) {
        await prisma.apiSubscription.updateMany({
            where: { stripeSubscriptionId },
            data: {
                status: 'past_due',
            },
        });
    }
    console.log(`Payment failed for invoice: ${invoice.id}`);
}
async function cancelSubscription(req, res) {
    try {
        const userId = req.userId;
        const { immediate = false } = req.body;
        const subscription = await prisma.apiSubscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription found' });
        }
        if (subscription.planTier === 'free') {
            return res.status(400).json({ error: 'Cannot cancel free plan' });
        }
        if (!subscription.stripeSubscriptionId) {
            return res.status(400).json({ error: 'No Stripe subscription found' });
        }
        if (immediate) {
            await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
            await prisma.apiSubscription.update({
                where: { userId },
                data: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelAtPeriodEnd: false,
                },
            });
        }
        else {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: true,
            });
            await prisma.apiSubscription.update({
                where: { userId },
                data: {
                    cancelAtPeriodEnd: true,
                },
            });
        }
        res.json({
            success: true,
            message: immediate
                ? 'Subscription cancelled immediately'
                : 'Subscription will cancel at the end of the billing period',
        });
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
    }
}
async function incrementUsage(userId, product, amount = 1) {
    try {
        const subscription = await prisma.apiSubscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            return false;
        }
        const usedField = `used${product.charAt(0).toUpperCase()}${product.slice(1)}`;
        const limitField = product;
        const currentUsed = subscription[usedField];
        const limit = subscription[limitField];
        if (limit === -1) {
            return true;
        }
        if (currentUsed + amount > limit) {
            return false;
        }
        await prisma.apiSubscription.update({
            where: { userId },
            data: {
                [usedField]: currentUsed + amount,
            },
        });
        return true;
    }
    catch (error) {
        console.error('Error incrementing usage:', error);
        return false;
    }
}
async function checkCredits(userId, product, amount = 1) {
    try {
        const subscription = await prisma.apiSubscription.findUnique({
            where: { userId },
        });
        if (!subscription) {
            return { allowed: false, remaining: 0 };
        }
        const usedField = `used${product.charAt(0).toUpperCase()}${product.slice(1)}`;
        const limitField = product;
        const currentUsed = subscription[usedField];
        const limit = subscription[limitField];
        if (limit === -1) {
            return { allowed: true, remaining: -1 };
        }
        const remaining = limit - currentUsed;
        const allowed = remaining >= amount;
        return { allowed, remaining };
    }
    catch (error) {
        console.error('Error checking credits:', error);
        return { allowed: false, remaining: 0 };
    }
}
//# sourceMappingURL=apiSubscriptions.controller.js.map