import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Initialize Anthropic client with direct API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface OrchestrationContext {
  userId: string;
  conversationHistory: ChatMessage[];
  currentTask?: string;
  pendingApprovals?: any[];
  metadata?: Record<string, any>;
}

interface OrchestrationResponse {
  message: string;
  requiresApproval: boolean;
  approvalData?: any;
  suggestedActions?: string[];
  completed?: boolean;
}

/**
 * AI Orchestration Service
 * Uses Claude 3.5 Sonnet for intelligent multi-step task execution
 */
export class AIOrchestrator {
  /**
   * Main orchestration method - handles user requests
   */
  async processRequest(
    userMessage: string,
    context: OrchestrationContext
  ): Promise<OrchestrationResponse> {
    try {
      // Add user message to history
      context.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Get CRM data context
      const crmContext = await this.getCRMContext(context.userId);

      // Build system prompt with orchestration capabilities
      const systemPrompt = this.buildSystemPrompt(crmContext);

      // Call Claude for orchestration
      const response = await this.callClaude(systemPrompt, context.conversationHistory);

      // Parse response and determine if approval needed
      const orchestrationResponse = this.parseOrchestrationResponse(response);

      // Add assistant response to history
      context.conversationHistory.push({
        role: 'assistant',
        content: orchestrationResponse.message,
      });

      return orchestrationResponse;
    } catch (error: any) {
      console.error('AI Orchestration error:', error);
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  }

  /**
   * Execute approved action
   */
  async executeApprovedAction(
    action: string,
    data: any,
    userId: string
  ): Promise<{ success: boolean; result: any }> {
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
    } catch (error: any) {
      console.error('Action execution error:', error);
      return { success: false, result: error.message };
    }
  }

  /**
   * Build system prompt with orchestration capabilities
   */
  private buildSystemPrompt(crmContext: any): string {
    // Format sample data for better context
    const industriesBreakdown = crmContext.sampleCompanies
      .filter((c: any) => c.industry && c.industry.trim()) // Filter out null/empty industries
      .reduce((acc: any, c: any) => {
        acc[c.industry] = (acc[c.industry] || 0) + 1;
        return acc;
      }, {});

    const topIndustries = Object.entries(industriesBreakdown)
      .filter(([industry]) => industry && industry !== 'null' && industry !== 'undefined')
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([industry]) => industry)
      .join(', ') || 'Not specified';

    const sampleContactTitles = crmContext.sampleContacts
      .map((c: any) => c.title)
      .filter((t: any) => t && t.trim())
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

  /**
   * Call Claude via Direct Anthropic API
   */
  private async callClaude(
    systemPrompt: string,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      // Build messages for Claude
      const messages = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call Anthropic API directly with Claude Haiku (only model accessible with current API key)
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7,
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error: any) {
      console.error('Claude API error:', error);
      throw new Error(`Failed to call Claude: ${error.message}`);
    }
  }

  /**
   * Parse Claude's response
   */
  private parseOrchestrationResponse(response: string): OrchestrationResponse {
    try {
      // Try to extract JSON from response - look for the LAST JSON block
      const jsonMatches = response.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try parsing from the last JSON block (most likely to be the actual response)
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(jsonMatches[i]);
            // Check if this looks like a valid orchestration response
            if (parsed.message || parsed.requiresApproval !== undefined) {
              // Clean the message - remove any JSON blocks from it
              let cleanMessage = parsed.message || response;
              cleanMessage = cleanMessage.replace(/\{[\s\S]*?\}/g, '').trim();

              // If message is empty after removing JSON, extract text before first {
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
          } catch (parseError) {
            // Try next JSON block
            continue;
          }
        }
      }

      // Fallback: No valid JSON found, return as plain message
      return {
        message: response,
        requiresApproval: false,
        completed: false,
      };
    } catch (error) {
      // If parsing fails, return as plain message
      return {
        message: response,
        requiresApproval: false,
        completed: false,
      };
    }
  }

  /**
   * Get CRM context for the user
   */
  private async getCRMContext(userId: string) {
    try {
      const [companiesCount, contactsCount, campaignsCount, recentActivitiesCount] = await Promise.all([
        prisma.company.count({ where: { userId } }),
        prisma.contact.count({ where: { userId } }),
        prisma.campaign.count({ where: { userId } }),
        prisma.activity.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

      // Get sample companies and contacts for context
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
    } catch (error) {
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

  /**
   * Create campaign based on AI orchestration
   */
  private async createCampaign(data: any, userId: string) {
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

      // If contacts specified, create email logs for campaign
      if (data.contactIds && data.contactIds.length > 0) {
        await prisma.emailLog.createMany({
          data: data.contactIds.map((contactId: string) => ({
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
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Send email via campaign
   */
  private async sendEmail(data: any, userId: string) {
    try {
      // Import email service
      const { sendEmailViaSES } = await import('./awsSES');

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
        } catch (error) {
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
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Create contact segment
   */
  private async createSegment(data: any, userId: string) {
    try {
      // Build filter based on segment criteria
      const where: any = { userId };

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
          contacts: contacts.slice(0, 10), // Preview first 10
        },
      };
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Schedule campaign
   */
  private async scheduleCampaign(data: any, userId: string) {
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
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
