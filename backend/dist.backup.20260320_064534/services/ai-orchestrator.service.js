"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiOrchestrator = exports.AIOrchestrator = void 0;
const client_1 = require("@prisma/client");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
class AIOrchestrator {
    async processRequest(userMessage, context) {
        try {
            context.conversationHistory.push({
                role: 'user',
                content: userMessage,
            });
            const crmContext = await this.getCRMContext(context.userId);
            const systemPrompt = this.buildSystemPrompt(crmContext);
            const response = await this.callClaude(systemPrompt, context.conversationHistory);
            const orchestrationResponse = this.parseOrchestrationResponse(response);
            context.conversationHistory.push({
                role: 'assistant',
                content: orchestrationResponse.message,
            });
            return orchestrationResponse;
        }
        catch (error) {
            console.error('AI Orchestration error:', error);
            throw new Error(`Orchestration failed: ${error.message}`);
        }
    }
    async executeApprovedAction(action, data, userId) {
        try {
            switch (action) {
                case 'create_campaign':
                    return await this.createCampaign(data, userId);
                case 'send_email':
                    return await this.sendEmail(data, userId);
                case 'create_segment':
                    return await this.createSegment(data, userId);
                case 'schedule_campaign':
                    return await this.scheduleCampaign(data, userId);
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            console.error('Action execution error:', error);
            return { success: false, result: error.message };
        }
    }
    buildSystemPrompt(crmContext) {
        const industriesBreakdown = crmContext.sampleCompanies
            .filter((c) => c.industry && c.industry.trim())
            .reduce((acc, c) => {
            acc[c.industry] = (acc[c.industry] || 0) + 1;
            return acc;
        }, {});
        const topIndustries = Object.entries(industriesBreakdown)
            .filter(([industry]) => industry && industry !== 'null' && industry !== 'undefined')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([industry]) => industry)
            .join(', ') || 'Not specified';
        const sampleContactTitles = crmContext.sampleContacts
            .map((c) => c.title)
            .filter((t) => t && t.trim())
            .slice(0, 5)
            .join(', ') || 'Various roles';
        return `You are an intelligent CRM AI assistant. Your goal is to help users manage their CRM efficiently with direct, action-oriented responses.

**LIVE CRM DATABASE:**
- Companies: ${crmContext.companiesCount}
- Contacts: ${crmContext.contactsCount}
- Active Campaigns: ${crmContext.campaignsCount}
- Top Industries: ${topIndustries}

**🚨🚨🚨 CRITICAL RESPONSE FORMAT RULES - MUST FOLLOW 🚨🚨🚨**

YOUR RESPONSES MUST BE PLAIN TEXT - NEVER USE MARKDOWN CODE BLOCKS!

❌ NEVER EVER DO THIS:
"Campaign ready!

\`\`\`json
{
  "requiresApproval": true
}
\`\`\`"

✅ ALWAYS DO THIS INSTEAD:
Just write plain text responses. The system will automatically parse your intent and create the proper JSON structure for you.

When you want to trigger the approval workflow:
1. Write a clear, concise message explaining what you will create
2. The system automatically detects keywords like "Ready to add?" or "Ready to create?"
3. The system automatically shows approval buttons to the user
4. You do NOT need to return any JSON yourself

**🚨 CRITICAL ANTI-HALLUCINATION RULES - READ FIRST 🚨**

You have access to real-time function calling that queries the actual database. When you call a function and get results:

1. **USE ONLY THE EXACT DATA RETURNED** - Do NOT invent, guess, or make up ANY information
2. **IF THE FUNCTION RETURNS EMPTY** - Say "Not found in database" - do NOT create fake data
3. **COMPANY NAME** - Use the EXACT name from database response, not a modified version
4. **INDUSTRY** - Use the EXACT industry from database response, not what you think it should be
5. **CONTACTS** - Use the EXACT contact names and titles from database, NEVER invent people
6. **CONTACT COUNT** - If database says 0 contacts, say "No contacts found" - do NOT invent contacts

**EXAMPLE OF CORRECT BEHAVIOR:**

Function returns: {"company": {"name": "7 Nation", "industry": "Sporting Goods", "contacts": []}}

✅ CORRECT Response:
"Found 7 Nation (Sporting Goods) in database, but no contacts available. Should I look up contact information online?"

❌ WRONG Response (HALLUCINATION):
"Found 7 Nation Army LLC (Marketing) with 1 contact: Mitch Russo"
^ This is COMPLETELY INVENTED - company name wrong, industry wrong, fake contact

**IF YOU INVENT ANY DATA, YOU WILL CAUSE SERIOUS ERRORS IN THE CRM SYSTEM.**

**CORE BEHAVIORAL PRINCIPLES:**

1. **BE INTELLIGENT & CONTEXT-AWARE**
   - When user mentions a company name, IMMEDIATELY search CRM database
   - Use real company data (contacts, industry, website) from database
   - Make smart inferences from industry context
   - Only ask questions when information is truly missing

2. **BE DIRECT & CONCISE**
   - Maximum 3-4 lines per response
   - No verbose explanations or long paragraphs
   - Get straight to the action
   - Provide clear next steps

3. **BE ACTION-ORIENTED**
   - Always include action buttons in suggestedActions array
   - Format: ["✓ Primary Action", "Option 2", "Cancel"]
   - Use requiresApproval:true for create/update/delete operations

**CAMPAIGN CREATION INTELLIGENCE:**

When user says "create campaign for [Company Name]":

STEP 1 - Search Database:
- Call searchCompanies function with the company name
- Wait for database response
- **USE EXACT DATA FROM RESPONSE** - do not modify or invent

STEP 2 - Validate Results:
- If company found with contacts → Use EXACT company name, industry, contact names from database
- If company found with 0 contacts → Say "Found [EXACT NAME] but no contacts. Add contacts first?"
- If company NOT found → Say "Not in database. Should I research it online?"
- **NEVER invent company names, industries, or contacts**

STEP 3 - Generate Campaign (only if contacts exist):
- Campaign name: Use EXACT company name from database + purpose
- Subject line: Professional, based on EXACT industry from database
- Content: Generate full HTML email using industry from database
- Target: Use EXACT contact IDs from database response

STEP 4 - Present with Approval:
Return this JSON structure:
{
  "message": "Campaign ready for [Company Name]\n\nSubject: [subject line]\nTargeting: X contacts ([titles])\n\nReady to add?",
  "requiresApproval": true,
  "approvalData": {
    "action": "create_campaign",
    "details": {
      "name": "[Campaign Name]",
      "subject": "[Subject Line]",
      "content": "<html>[COMPLETE HTML EMAIL]</html>",
      "contactIds": [array of contact IDs],
      "scheduled": false
    }
  },
  "suggestedActions": ["✓ Add to Campaigns", "Edit Content", "Cancel"]
}

**INDUSTRY-SPECIFIC INTELLIGENCE:**

Use these insights to craft relevant campaigns automatically:

- **Home Warranty/Insurance**: Focus on customer retention, claim efficiency, policy upgrades
- **Technology/SaaS**: Focus on innovation, ROI, integration capabilities
- **Manufacturing**: Focus on cost savings, efficiency, supply chain optimization
- **Retail/E-commerce**: Focus on customer experience, conversion rates, loyalty
- **Healthcare**: Focus on patient outcomes, compliance, operational efficiency
- **Financial Services**: Focus on security, returns, client trust

**RESPONSE RULES:**

✓ When company name is mentioned: Search CRM first, use real data
✓ Keep responses under 4 lines maximum
✓ Always provide 2-3 action buttons
✓ Generate COMPLETE email content (never partial/draft)
✓ Use requiresApproval:true for all create/update actions
✓ Be professional - minimal emojis (only in action buttons)

✗ Don't ask unnecessary questions - infer from context
✗ Don't show data snapshots unless specifically requested
✗ Don't use emoji overload (📊 🎯 ✅ everywhere)
✗ Don't give multiple-choice quizzes
✗ Don't say "I've created" - always use approval workflow

**EXAMPLE INTERACTION:**

User: "create campaign for America's Preferred Home Warranty"

Bad Response (verbose, asks questions):
"📊 Quick CRM Snapshot: 602 contacts...
Let's build something great! Tell me:
1️⃣ Main goal? A) Generate leads B) Nurture...
2️⃣ Target? Option 1: CEOs..."

Good Response (direct, intelligent):
"Campaign ready: Home Warranty Services Partnership

Subject: Enhancing Your Customer Experience with Proven Solutions
Targeting: 3 contacts (CEO, President, VP Marketing)

Ready to add to your campaigns?"

[Shows: "✓ Add to Campaigns" button]

**CRITICAL RULES:**

1. NEVER say "I've added" or "It's done" - always use requiresApproval:true
2. ALWAYS search CRM when company name is mentioned
3. ALWAYS generate COMPLETE HTML email content
4. Keep responses SHORT (3-4 lines maximum)
5. Provide clear action buttons for next steps
6. Use industry context to craft intelligent campaign content

Remember: You are a smart, efficient assistant. Be direct, be intelligent, take action.`;
    }
    async callClaude(systemPrompt, conversationHistory) {
        try {
            const messages = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 4096,
                system: systemPrompt,
                messages: messages,
                temperature: 0.3,
            });
            return response.content[0].type === 'text' ? response.content[0].text : '';
        }
        catch (error) {
            console.error('Claude API error:', error);
            throw new Error(`Failed to call Claude: ${error.message}`);
        }
    }
    parseOrchestrationResponse(response) {
        try {
            const jsonMatches = response.match(/\{[\s\S]*?\}/g);
            if (jsonMatches && jsonMatches.length > 0) {
                for (let i = jsonMatches.length - 1; i >= 0; i--) {
                    try {
                        const parsed = JSON.parse(jsonMatches[i]);
                        if (parsed.message || parsed.requiresApproval !== undefined) {
                            let cleanMessage = parsed.message || response;
                            cleanMessage = cleanMessage.replace(/\{[\s\S]*?\}/g, '').trim();
                            if (!cleanMessage) {
                                const textBeforeJson = response.split('{')[0].trim();
                                cleanMessage = textBeforeJson || response;
                            }
                            return {
                                message: cleanMessage,
                                requiresApproval: parsed.requiresApproval || false,
                                approvalData: parsed.approvalData,
                                suggestedActions: parsed.suggestedActions || [],
                                completed: parsed.completed || false,
                            };
                        }
                    }
                    catch (parseError) {
                        continue;
                    }
                }
            }
            return {
                message: response,
                requiresApproval: false,
                completed: false,
            };
        }
        catch (error) {
            return {
                message: response,
                requiresApproval: false,
                completed: false,
            };
        }
    }
    async getCRMContext(userId) {
        try {
            const [companiesCount, contactsCount, campaignsCount, recentActivitiesCount] = await Promise.all([
                prisma.company.count({ where: { userId } }),
                prisma.contact.count({ where: { userId } }),
                prisma.campaign.count({ where: { userId } }),
                prisma.activity.count({
                    where: {
                        userId,
                        createdAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                        },
                    },
                }),
            ]);
            const sampleCompanies = await prisma.company.findMany({
                where: { userId },
                take: 10,
                select: { name: true, industry: true },
            });
            const sampleContacts = await prisma.contact.findMany({
                where: { userId },
                take: 10,
                select: { firstName: true, lastName: true, title: true, company: { select: { name: true } } },
            });
            return {
                companiesCount,
                contactsCount,
                campaignsCount,
                recentActivitiesCount,
                sampleCompanies,
                sampleContacts,
            };
        }
        catch (error) {
            console.error('Error getting CRM context:', error);
            return {
                companiesCount: 0,
                contactsCount: 0,
                campaignsCount: 0,
                recentActivitiesCount: 0,
                sampleCompanies: [],
                sampleContacts: [],
            };
        }
    }
    async createCampaign(data, userId) {
        try {
            const campaign = await prisma.campaign.create({
                data: {
                    name: data.name,
                    subject: data.subject,
                    htmlContent: data.content,
                    textContent: data.textContent || data.content.replace(/<[^>]*>/g, ''),
                    userId,
                    status: data.scheduled ? 'SCHEDULED' : 'DRAFT',
                    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
                },
            });
            if (data.contactIds && data.contactIds.length > 0) {
                await prisma.emailLog.createMany({
                    data: data.contactIds.map((contactId) => ({
                        campaignId: campaign.id,
                        contactId,
                        status: 'PENDING',
                    })),
                });
            }
            return {
                success: true,
                result: {
                    campaignId: campaign.id,
                    name: campaign.name,
                    contactCount: data.contactIds?.length || 0,
                },
            };
        }
        catch (error) {
            console.error('Campaign creation error:', error);
            return {
                success: false,
                result: error.message,
            };
        }
    }
    async sendEmail(data, userId) {
        try {
            const { EmailService } = await Promise.resolve().then(() => __importStar(require('./google-smtp.service')));
            const emailService = new EmailService();
            const results = [];
            for (const recipient of data.recipients) {
                try {
                    await emailService.sendEmail({
                        to: [recipient.email],
                        subject: data.subject,
                        html: data.html,
                    });
                    results.push({ email: recipient.email, status: 'sent' });
                }
                catch (error) {
                    results.push({ email: recipient.email, status: 'failed', error });
                }
            }
            return {
                success: true,
                result: {
                    sent: results.filter(r => r.status === 'sent').length,
                    failed: results.filter(r => r.status === 'failed').length,
                    details: results,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                result: error.message,
            };
        }
    }
    async createSegment(data, userId) {
        try {
            const where = { userId };
            if (data.industry) {
                where.company = { industry: data.industry };
            }
            if (data.title) {
                where.title = { contains: data.title, mode: 'insensitive' };
            }
            if (data.location) {
                where.location = { contains: data.location, mode: 'insensitive' };
            }
            const contacts = await prisma.contact.findMany({
                where,
                include: { company: true },
            });
            return {
                success: true,
                result: {
                    segmentName: data.name,
                    contactCount: contacts.length,
                    contacts: contacts.slice(0, 10),
                },
            };
        }
        catch (error) {
            return {
                success: false,
                result: error.message,
            };
        }
    }
    async scheduleCampaign(data, userId) {
        try {
            await prisma.campaign.update({
                where: { id: data.campaignId },
                data: {
                    status: 'SCHEDULED',
                    scheduledAt: new Date(data.scheduledAt),
                },
            });
            return {
                success: true,
                result: {
                    campaignId: data.campaignId,
                    scheduledAt: data.scheduledAt,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                result: error.message,
            };
        }
    }
}
exports.AIOrchestrator = AIOrchestrator;
exports.aiOrchestrator = new AIOrchestrator();
//# sourceMappingURL=ai-orchestrator.service.js.map