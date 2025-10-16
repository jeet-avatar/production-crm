"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ai_1 = require("../config/ai");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.default({ apiKey: ai_1.AI_CONFIG.apiKey });
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: {
                userId: req.user?.id,
            },
            include: {
                _count: {
                    select: {
                        emailLogs: true,
                        companies: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ campaigns });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, subject, status, htmlContent, scheduledAt } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Campaign name is required' });
        }
        const campaign = await prisma.campaign.create({
            data: {
                name,
                subject: subject || `Campaign: ${name}`,
                status: status || 'DRAFT',
                htmlContent: htmlContent || '<p>Email content goes here</p>',
                userId: req.user.id,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
        });
        return res.status(201).json({ campaign });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
            include: {
                companies: {
                    include: {
                        company: {
                            include: {
                                contacts: {
                                    where: { isActive: true },
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        role: true,
                                    },
                                },
                                _count: {
                                    select: { contacts: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        emailLogs: true,
                        companies: true,
                    },
                },
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        return res.json({ campaign });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id, companyId } = req.params;
        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                userId: req.user?.id,
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const existing = await prisma.campaignCompany.findUnique({
            where: {
                campaignId_companyId: {
                    campaignId: id,
                    companyId: companyId,
                },
            },
        });
        if (existing) {
            return res.json({
                message: 'Company already in campaign',
                campaignCompany: existing
            });
        }
        const campaignCompany = await prisma.campaignCompany.create({
            data: {
                campaignId: id,
                companyId: companyId,
            },
            include: {
                company: true,
            },
        });
        return res.json({
            message: 'Company added to campaign successfully',
            campaignCompany
        });
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id/companies/:companyId', async (req, res, next) => {
    try {
        const { id, companyId } = req.params;
        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        await prisma.campaignCompany.delete({
            where: {
                campaignId_companyId: {
                    campaignId: id,
                    companyId: companyId,
                },
            },
        });
        return res.json({ message: 'Company removed from campaign' });
    }
    catch (error) {
        return next(error);
    }
});
router.get('/:id/companies', async (req, res, next) => {
    try {
        const { id } = req.params;
        const campaign = await prisma.campaign.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
            include: {
                companies: {
                    include: {
                        company: {
                            include: {
                                contacts: {
                                    where: { isActive: true },
                                    take: 5,
                                },
                                _count: {
                                    select: { contacts: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        const companies = campaign.companies.map((cc) => ({
            ...cc.company,
            addedAt: cc.addedAt,
        }));
        return res.json({ companies });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/ai/generate-basics', async (req, res, next) => {
    try {
        const { tone } = req.body;
        const prompt = `You are an expert email marketer. Generate a creative campaign name and compelling goal for an email marketing campaign.

Tone: ${tone || 'professional'}

Generate a campaign name and goal that would work for a B2B SaaS company. The campaign should be relevant and timely.

Return ONLY valid JSON with this structure:
{"name": "Campaign Name Here", "goal": "Detailed campaign goal describing what you want to achieve with this campaign..."}`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('basic'),
            messages: [{ role: 'user', content: prompt }]
        });
        const content = message.content[0];
        if (content && content.type === 'text') {
            let jsonText = content.text.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
            }
            const result = JSON.parse(jsonText);
            return res.json(result);
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/ai/generate-subject', async (req, res, next) => {
    try {
        const { goal, tone, campaignName } = req.body;
        if (!goal || !tone || !campaignName) {
            return res.status(400).json({
                error: 'goal, tone, and campaignName are required'
            });
        }
        const prompt = `You are an expert email marketer. Generate compelling email subject lines for this campaign.
Campaign Goal: ${goal}
Tone: ${tone}
Campaign Name: ${campaignName}

Generate 5 different subject line variants optimized for A/B testing. Each should use different psychological triggers:
1. Curiosity-based
2. Value-driven
3. Urgency/scarcity
4. Social proof
5. Direct benefit

Return ONLY valid JSON with this structure:
{"variants": ["variant 1", "variant 2", "variant 3", "variant 4", "variant 5"]}`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('subject'),
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        const content = message.content[0];
        if (content && content.type === 'text') {
            let jsonText = content.text.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
            }
            const result = JSON.parse(jsonText);
            return res.json(result);
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/ai/generate-content', async (req, res, next) => {
    try {
        const { goal, subject, tone, personalization } = req.body;
        if (!goal || !subject || !tone) {
            return res.status(400).json({
                error: 'goal, subject, and tone are required'
            });
        }
        const prompt = `You are an expert email marketer. Generate professional HTML email content for this campaign.
Campaign Goal: ${goal}
Subject Line: ${subject}
Tone: ${tone}
Personalization: ${personalization || 'None'}

Create a compelling email body in HTML format. Include a preview text (the first line that appears in inbox previews).

IMPORTANT: Return ONLY valid JSON. Make sure all quotes inside the HTML are properly escaped.
Use this exact structure:
{"content": "<html>...</html>", "previewText": "..."}

The HTML should be professional, mobile-responsive, and include:
- A clear headline
- Engaging body copy aligned with the goal
- A call-to-action button
- Professional styling with inline CSS
- Use single quotes for HTML attributes to avoid JSON escaping issues`;
        const message = await anthropic.messages.create({
            ...(0, ai_1.getAIMessageConfig)('content'),
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        const content = message.content[0];
        if (content && content.type === 'text') {
            try {
                let jsonText = content.text.trim();
                if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
                }
                const result = JSON.parse(jsonText);
                return res.json(result);
            }
            catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('AI Response:', content.text.substring(0, 500));
                return res.status(500).json({
                    error: 'Failed to parse AI response. Please try again.',
                    details: parseError?.message || 'Unknown error'
                });
            }
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/ai/optimize-send-time', async (req, res, next) => {
    try {
        const now = new Date();
        const daysUntilTuesday = (2 - now.getDay() + 7) % 7 || 7;
        const optimalDate = new Date(now);
        optimalDate.setDate(now.getDate() + daysUntilTuesday);
        optimalDate.setHours(10, 0, 0, 0);
        return res.json({
            optimalTime: optimalDate.toISOString()
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=campaigns.js.map