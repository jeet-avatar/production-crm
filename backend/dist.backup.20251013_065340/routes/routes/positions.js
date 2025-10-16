"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
// ✅ Enable authentication for all position routes
router.use(auth_1.authenticate);
// GET /api/positions - Get all positions for current user with filters
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { companyId, isLeadership, campaignSent } = req.query;
        const where = {
            isActive: true,
            userId, // ✅ Filter by user
        };
        if (companyId)
            where.companyId = companyId;
        if (isLeadership !== undefined)
            where.isLeadership = isLeadership === 'true';
        if (campaignSent !== undefined)
            where.campaignSent = campaignSent === 'true';
        const positions = await prisma.position.findMany({
            where,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        industry: true,
                        size: true,
                        hiringIntent: true,
                        jobPostings: true,
                        techStack: true,
                    },
                },
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        title: true,
                    },
                },
            },
            orderBy: [
                { postedDate: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        return res.json({ positions });
    }
    catch (error) {
        return next(error);
    }
});
// POST /api/positions - Create a new position for current user
router.post('/', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { companyId, title, department, seniority, description, location, employmentType, salaryRange, hiringIntent, urgency, postedDate, source, isLeadership, isReplacement, isExpansion, recentChanges, contactId, } = req.body;
        if (!companyId || !title) {
            return res.status(400).json({ error: 'companyId and title are required' });
        }
        // ✅ Verify company ownership
        const company = await prisma.company.findFirst({
            where: { id: companyId, userId },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or access denied' });
        }
        const position = await prisma.position.create({
            data: {
                userId: userId, // ✅ Assign to user
                companyId,
                title,
                department,
                seniority,
                description,
                location,
                employmentType,
                salaryRange,
                hiringIntent,
                urgency,
                postedDate: postedDate ? new Date(postedDate) : null,
                source,
                isLeadership: isLeadership || false,
                isReplacement: isReplacement || false,
                isExpansion: isExpansion !== undefined ? isExpansion : true,
                recentChanges,
                contactId,
            },
            include: {
                company: true,
                contact: true,
            },
        });
        return res.status(201).json(position);
    }
    catch (error) {
        return next(error);
    }
});
// POST /api/positions/:id/generate-campaign-content - Generate AI content for position
router.post('/:id/generate-campaign-content', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { tone = 'professional', includeLeadershipChanges = true } = req.body;
        // ✅ Verify ownership
        const position = await prisma.position.findFirst({
            where: { id, userId },
            include: {
                company: true,
                contact: true,
            },
        });
        if (!position) {
            return res.status(404).json({ error: 'Position not found or access denied' });
        }
        // Build comprehensive context for AI
        const context = {
            position: {
                title: position.title,
                department: position.department,
                seniority: position.seniority,
                hiringIntent: position.hiringIntent,
                urgency: position.urgency,
                isLeadership: position.isLeadership,
                isReplacement: position.isReplacement,
                isExpansion: position.isExpansion,
                recentChanges: position.recentChanges,
            },
            company: {
                name: position.company.name,
                industry: position.company.industry,
                size: position.company.size,
                hiringIntent: position.company.hiringIntent,
                jobPostings: position.company.jobPostings,
                techStack: position.company.techStack,
                aiPitch: position.company.aiPitch,
            },
            contact: position.contact ? {
                name: `${position.contact.firstName} ${position.contact.lastName}`,
                title: position.contact.title,
            } : null,
        };
        // Generate personalized content using Claude
        const prompt = `You are an expert B2B sales and marketing professional. Generate a highly personalized email campaign for the following position:

POSITION DETAILS:
- Title: ${context.position.title}
- Department: ${context.position.department || 'N/A'}
- Seniority: ${context.position.seniority || 'N/A'}
- Is Leadership Role: ${context.position.isLeadership ? 'Yes' : 'No'}
- Is Replacement: ${context.position.isReplacement ? 'Yes (someone left)' : 'No'}
- Is Expansion: ${context.position.isExpansion ? 'Yes (new role, growth)' : 'No'}
- Hiring Intent: ${context.position.hiringIntent || 'Not specified'}
- Urgency: ${context.position.urgency || 'Medium'}
${context.position.recentChanges ? `- Recent Changes: ${context.position.recentChanges}` : ''}

COMPANY DETAILS:
- Company Name: ${context.company.name}
- Industry: ${context.company.industry || 'N/A'}
- Company Size: ${context.company.size || 'N/A'}
- Company Hiring Intent: ${context.company.hiringIntent || 'N/A'}
${context.company.techStack ? `- Tech Stack: ${context.company.techStack}` : ''}
${context.company.aiPitch ? `- Value Proposition: ${context.company.aiPitch}` : ''}

${context.contact ? `DECISION MAKER:
- Name: ${context.contact.name}
- Title: ${context.contact.title}` : ''}

TONE: ${tone}

Generate a HIGHLY PERSONALIZED email campaign that:
1. References the specific position and why they're hiring
2. ${context.position.isReplacement ? 'Acknowledges the leadership change/replacement and how we can help during transition' : ''}
3. ${context.position.isExpansion ? 'Congratulates them on growth and expansion' : ''}
4. ${context.position.isLeadership ? 'Speaks to C-level/VP concerns and strategic priorities' : 'Speaks to the specific department needs'}
5. Mentions their industry and company size context
6. Provides a compelling value proposition specific to THIS position
7. ${context.position.urgency === 'High' ? 'Creates urgency and offers quick implementation' : 'Focuses on long-term partnership'}

Return ONLY valid JSON with this structure:
{
  "subject": "Subject line (60 chars max, personalized)",
  "previewText": "Preview text for inbox (100 chars max)",
  "emailContent": "HTML email content (use single quotes for attributes)",
  "pitch": "2-3 sentence elevator pitch for this specific position"
}

IMPORTANT:
- Use {{FirstName}}, {{Company}}, {{Position}} for personalization tokens
- Keep HTML clean with inline CSS
- Make it highly specific to THIS position, not generic
- Use single quotes in HTML to avoid JSON escaping issues`;
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
        });
        const responseContent = message.content[0];
        if (responseContent && responseContent.type === 'text') {
            try {
                let jsonText = responseContent.text.trim();
                if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
                }
                const result = JSON.parse(jsonText);
                // Update position with generated content
                await prisma.position.update({
                    where: { id },
                    data: {
                        aiSubject: result.subject,
                        aiEmailContent: result.emailContent,
                        aiPitch: result.pitch,
                    },
                });
                return res.json({
                    ...result,
                    positionId: id,
                    companyName: position.company.name,
                });
            }
            catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('AI Response:', responseContent.text.substring(0, 500));
                return res.status(500).json({
                    error: 'Failed to parse AI response',
                    details: parseError?.message || 'Unknown error',
                });
            }
        }
        return res.status(500).json({ error: 'Unexpected response format' });
    }
    catch (error) {
        return next(error);
    }
});
// POST /api/positions/bulk-generate - Generate content for multiple positions
router.post('/bulk-generate', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { positionIds, tone = 'professional' } = req.body;
        if (!positionIds || !Array.isArray(positionIds) || positionIds.length === 0) {
            return res.status(400).json({ error: 'positionIds array is required' });
        }
        const results = [];
        const errors = [];
        for (const positionId of positionIds) {
            try {
                // ✅ Verify ownership
                const position = await prisma.position.findFirst({
                    where: { id: positionId, userId },
                    include: { company: true, contact: true },
                });
                if (!position) {
                    errors.push({ positionId, error: 'Position not found or access denied' });
                    continue;
                }
                // Generate content (simplified version for bulk)
                const context = `Position: ${position.title} at ${position.company.name}`;
                // Update with basic generated content
                await prisma.position.update({
                    where: { id: positionId },
                    data: {
                        aiSubject: `Opportunity: ${position.title} at ${position.company.name}`,
                        aiPitch: `Generated pitch for ${position.title}`,
                    },
                });
                results.push({ positionId, success: true });
            }
            catch (error) {
                errors.push({ positionId, error: error.message });
            }
        }
        return res.json({
            success: results.length,
            failed: errors.length,
            results,
            errors,
        });
    }
    catch (error) {
        return next(error);
    }
});
// GET /api/positions/company/:companyId - Get positions for a specific company
router.get('/company/:companyId', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { companyId } = req.params;
        // ✅ Verify company ownership first
        const company = await prisma.company.findFirst({
            where: { id: companyId, userId },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found or access denied' });
        }
        const positions = await prisma.position.findMany({
            where: {
                companyId,
                userId, // ✅ Filter by user
                isActive: true,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                postedDate: 'desc',
            },
        });
        return res.json({ positions });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
