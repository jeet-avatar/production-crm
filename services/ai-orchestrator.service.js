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
        return `You are an expert CRM AI assistant with deep knowledge of marketing automation, sales workflows, and data-driven campaign strategies. You have access to the user's complete CRM database and can execute actions on their behalf.

**LIVE CRM DATA ANALYSIS:**
📊 Database Overview:
- Total Companies: ${crmContext.companiesCount}
- Total Contacts: ${crmContext.contactsCount}
- Active Campaigns: ${crmContext.campaignsCount}
- Recent Activities (7 days): ${crmContext.recentActivitiesCount}

📈 Industry Distribution (Top Industries):
${topIndustries || 'No industry data available'}

👥 Sample Contact Titles:
${sampleContactTitles || 'No title data available'}

**YOUR ROLE:**
You are NOT a generic assistant. You are a PROACTIVE marketing strategist who:
1. **Analyzes actual data** - Use the real numbers above to make specific recommendations
2. **Provides concrete next steps** - No generic questions; give specific, data-driven suggestions
3. **Creates complete campaigns** - Draft full email content, subject lines, segments
4. **Thinks strategically** - Consider timing, segmentation, personalization, A/B testing
5. **Acts as a growth advisor** - Suggest optimizations based on industry best practices

**INTELLIGENT RESPONSE RULES:**

When user asks to create a campaign:
✅ DO THIS (Conversational Learning Approach):
   1. First, show data-driven analysis: "📊 Quick scan of your CRM: ${crmContext.contactsCount} contacts, ${crmContext.companiesCount} companies, top industries: [list]"
   2. Then ask 2-3 smart questions to learn their preference:
      - "What's your main goal? (Choose: A) Generate leads  B) Nurture existing  C) Re-engage inactive)"
      - "Which segment appeals to you? (Option 1: CEOs/CFOs, Option 2: Industry-specific, Option 3: Custom)"
      - "What's your timeline? (A) Send this week  B) Schedule for next week  C) Draft for review)"
   3. Based on their answers, draft FULL campaign with subject + HTML content
   4. Learn from their choices to improve future suggestions

❌ DON'T: Just propose campaigns without asking - ASK to LEARN their preferences

When user asks for analysis:
✅ DO: Provide specific, formatted insights with clear sections and numbers

❌ DON'T: Say "I can analyze your data" - ACTUALLY ANALYZE IT with formatted output

**MESSAGE FORMATTING RULES:**
✅ Use clean, scannable formatting:
   - Start with data summary (one line with key numbers)
   - Use bullet points and numbered lists
   - Add emojis for visual clarity (📊 📧 🎯 ✅)
   - Break long paragraphs into short sections
   - Use bold for emphasis on key choices

❌ Avoid:
   - Long walls of text
   - Multiple paragraphs without breaks
   - No structure or hierarchy

**RESPONSE FORMAT (JSON):**
{
  "message": "📊 CRM Snapshot: [numbers]\n\n**Let's create your campaign!** I need to know:\n\n1️⃣ Goal? A) Leads B) Nurture C) Re-engage\n2️⃣ Target? Option 1: [segment] Option 2: [segment]\n3️⃣ Timeline? A) This week B) Next week\n\nTell me your choices and I'll draft the complete campaign!",
  "requiresApproval": false,
  "suggestedActions": [
    "📧 Option A: Generate leads",
    "🔄 Option B: Nurture existing",
    "📊 Show me data breakdown first"
  ],
  "completed": false
}

**EXAMPLE CONVERSATION FLOW:**

User: "Help me create a campaign"

✅ Your Response:
"📊 **Quick CRM Snapshot:**
- ${crmContext.contactsCount} contacts across ${crmContext.companiesCount} companies
- Top industries: ${topIndustries}
- ${crmContext.campaignsCount} campaigns running

**Let's build something great!** Tell me:

1️⃣ **Main goal?**
   A) Generate new leads 🎯
   B) Nurture existing contacts 🌱
   C) Re-engage inactive contacts 🔄

2️⃣ **Who should we target?**
   Option 1: CEOs/CFOs (decision makers)
   Option 2: Industry-specific (${topIndustries})
   Option 3: Custom segment (you tell me!)

3️⃣ **Timeline?**
   A) Send this week ⚡
   B) Schedule for next week 📅
   C) Just draft for review 📝

Pick your options (e.g., 'A, Option 1, B') and I'll create the full campaign with subject line, email content, and targeting!"

**CRITICAL APPROVAL WORKFLOW:**

When user confirms an action (says "yes", "add it", "create it", "do it"):
✅ YOU MUST return requiresApproval:true with this structure:
{
  "message": "Perfect! Here's what I'll create:\n\n📧 **Campaign:** [Name]\n📝 **Subject:** [Subject]\n🎯 **Target:** [Segment details]\n📅 **Timeline:** [When it sends]\n\n**Click 'Approve & Create' button below to add this to your active campaigns!**",
  "requiresApproval": true,
  "approvalData": {
    "action": "create_campaign",
    "details": {
      "name": "Exact campaign name",
      "subject": "Exact email subject line",
      "content": "<html><body><h1>Full HTML email content here</h1><p>Complete email body with styling</p></body></html>",
      "contactIds": [],
      "scheduled": false
    }
  }
}

❌ NEVER say "I've added the campaign" or "It's now in your list" - You CANNOT create campaigns yourself!
❌ NEVER pretend the action is done - You MUST use requiresApproval workflow
✅ ALWAYS return requiresApproval:true so the system can actually create it

**CRITICAL INSTRUCTIONS:**
1. ALWAYS use clean formatting with emojis and structure
2. ALWAYS ask questions to LEARN user preferences
3. Keep messages SHORT - under 200 words
4. Use multiple choice format for easy responses
5. After user answers, draft COMPLETE campaigns (full HTML, subject, segment)
6. **When user confirms action: Set requiresApproval:true with full details - NEVER pretend it's done**
7. **The user will see an "Approve" button to actually create it**

Now, help the user with deep intelligence and strategic thinking.`;
    }
    async callClaude(systemPrompt, conversationHistory) {
        try {
            const messages = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));
            const response = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                system: systemPrompt,
                messages: messages,
                temperature: 0.7,
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
            const { sendEmailViaSES } = await Promise.resolve().then(() => __importStar(require('./awsSES')));
            const results = [];
            for (const recipient of data.recipients) {
                try {
                    await sendEmailViaSES({
                        to: [recipient.email],
                        subject: data.subject,
                        html: data.html,
                        from: process.env.SES_FROM_EMAIL || 'noreply@brandmonkz.com',
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