"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// GET /api/pricing/config - Get pricing page configuration
router.get('/config', async (req, res) => {
    try {
        // In a real application, this would fetch from database
        // For now, returning the configuration that can be customized via admin UI
        const pricingData = {
            config: {
                brandName: process.env.BRAND_NAME || 'BrandMonkz',
                trustBadgeText: process.env.TRUST_BADGE_TEXT || 'Trusted by 10,000+ businesses worldwide',
                businessCount: process.env.BUSINESS_COUNT || '10,000+',
                salesEmail: process.env.SALES_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@brandmonkz.com',
                trialDays: process.env.TRIAL_DAYS || '14',
                annualSavings: process.env.ANNUAL_SAVINGS || '17%',
                headline: process.env.PRICING_HEADLINE || 'Simple, transparent pricing for everyone',
                subheadline: process.env.PRICING_SUBHEADLINE || 'Choose the perfect plan for your business. Start with a free trial and scale as you grow.',
                ctaHeadline: process.env.CTA_HEADLINE || 'Ready to transform your business?',
                ctaSubheadline: process.env.CTA_SUBHEADLINE || 'Join {businessCount} businesses using {brandName} to grow faster and smarter',
                faqSectionTitle: process.env.FAQ_SECTION_TITLE || 'Frequently Asked Questions',
                faqSectionSubtitle: process.env.FAQ_SECTION_SUBTITLE || 'Everything you need to know about our pricing plans',
            },
            plans: [
                {
                    id: 'starter',
                    name: process.env.PLAN_1_NAME || 'Starter',
                    icon: process.env.PLAN_1_ICON || 'Star',
                    description: process.env.PLAN_1_DESCRIPTION || 'Perfect for small businesses and startups',
                    monthlyPrice: Number.parseInt(process.env.PLAN_1_MONTHLY_PRICE || '29'),
                    annualPrice: Number.parseInt(process.env.PLAN_1_ANNUAL_PRICE || '290'),
                    popular: (process.env.PLAN_1_POPULAR || 'false') === 'true',
                    features: JSON.parse(process.env.PLAN_1_FEATURES || JSON.stringify([
                        { text: '1,000 contacts', included: true },
                        { text: '50 companies', included: true },
                        { text: '100 deals', included: true },
                        { text: '1 user', included: true },
                        { text: '1,000 emails/month', included: true },
                        { text: '3 email templates', included: true },
                        { text: 'Basic email tracking', included: true },
                        { text: 'Gmail/SMTP integration', included: true },
                        { text: 'Email automation', included: false },
                        { text: 'AI features', included: false },
                        { text: 'API access', included: false },
                        { text: 'Priority support', included: false },
                    ])),
                    buttonText: process.env.PLAN_1_BUTTON_TEXT || 'Start Free Trial',
                    buttonVariant: (process.env.PLAN_1_BUTTON_VARIANT || 'outline'),
                    stripeMonthlyPriceId: process.env.STRIPE_STARTER_MONTHLY,
                    stripeAnnualPriceId: process.env.STRIPE_STARTER_ANNUAL,
                },
                {
                    id: 'professional',
                    name: process.env.PLAN_2_NAME || 'Professional',
                    icon: process.env.PLAN_2_ICON || 'Zap',
                    description: process.env.PLAN_2_DESCRIPTION || 'Best for growing teams and marketers',
                    monthlyPrice: Number.parseInt(process.env.PLAN_2_MONTHLY_PRICE || '99'),
                    annualPrice: Number.parseInt(process.env.PLAN_2_ANNUAL_PRICE || '990'),
                    popular: (process.env.PLAN_2_POPULAR || 'true') === 'true',
                    features: JSON.parse(process.env.PLAN_2_FEATURES || JSON.stringify([
                        { text: '10,000 contacts', included: true },
                        { text: '500 companies', included: true },
                        { text: '1,000 deals', included: true },
                        { text: '5 users (+ $15/user)', included: true },
                        { text: '10,000 emails/month', included: true },
                        { text: 'Unlimited email templates', included: true },
                        { text: 'Advanced email tracking', included: true },
                        { text: 'Email automation & A/B testing', included: true },
                        { text: 'AI email generation (100/mo)', included: true },
                        { text: '500 SMS/month', included: true },
                        { text: 'Full API access', included: true },
                        { text: 'Priority support', included: true },
                    ])),
                    buttonText: process.env.PLAN_2_BUTTON_TEXT || 'Start Free Trial',
                    buttonVariant: (process.env.PLAN_2_BUTTON_VARIANT || 'primary'),
                    stripeMonthlyPriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY,
                    stripeAnnualPriceId: process.env.STRIPE_PROFESSIONAL_ANNUAL,
                },
                {
                    id: 'enterprise',
                    name: process.env.PLAN_3_NAME || 'Enterprise',
                    icon: process.env.PLAN_3_ICON || 'Crown',
                    description: process.env.PLAN_3_DESCRIPTION || 'For large organizations with advanced needs',
                    monthlyPrice: Number.parseInt(process.env.PLAN_3_MONTHLY_PRICE || '299'),
                    annualPrice: Number.parseInt(process.env.PLAN_3_ANNUAL_PRICE || '2990'),
                    popular: (process.env.PLAN_3_POPULAR || 'false') === 'true',
                    features: JSON.parse(process.env.PLAN_3_FEATURES || JSON.stringify([
                        { text: 'Unlimited contacts', included: true },
                        { text: 'Unlimited companies', included: true },
                        { text: 'Unlimited deals', included: true },
                        { text: 'Unlimited users', included: true },
                        { text: '50,000 emails/month', included: true },
                        { text: 'Unlimited email templates', included: true },
                        { text: 'Advanced A/B testing', included: true },
                        { text: 'Unlimited automation', included: true },
                        { text: 'Unlimited AI generations', included: true },
                        { text: 'Unlimited SMS', included: true },
                        { text: 'Unlimited API access', included: true },
                        { text: '24/7 phone support', included: true },
                    ])),
                    buttonText: process.env.PLAN_3_BUTTON_TEXT || 'Contact Sales',
                    buttonVariant: (process.env.PLAN_3_BUTTON_VARIANT || 'outline'),
                    stripeMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY,
                    stripeAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL,
                },
            ],
            faqs: JSON.parse(process.env.PRICING_FAQS || JSON.stringify([
                {
                    question: 'Can I change plans later?',
                    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we\'ll prorate your billing accordingly.',
                },
                {
                    question: 'What payment methods do you accept?',
                    answer: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover) and bank transfers for annual plans over $1,000.',
                },
                {
                    question: 'Is there a free trial?',
                    answer: 'Yes! All plans include a {trialDays}-day free trial with full feature access. No credit card required to start your trial.',
                },
                {
                    question: 'What happens when I reach my limit?',
                    answer: 'You\'ll receive notifications when approaching limits. You can purchase add-ons or upgrade your plan seamlessly without data loss.',
                },
            ])),
        };
        res.json(pricingData);
    }
    catch (error) {
        console.error('Error fetching pricing config:', error);
        res.status(500).json({ error: 'Failed to fetch pricing configuration' });
    }
});
// TODO: Add admin endpoints to update pricing configuration
// POST /api/pricing/config - Update pricing configuration (admin only)
// PUT /api/pricing/plans/:planId - Update specific plan (admin only)
// PUT /api/pricing/faqs - Update FAQs (admin only)
exports.default = router;
