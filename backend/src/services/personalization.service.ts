import { PrismaClient } from '@prisma/client';
import { callClaudeWithFallback } from '../utils/ai-helper';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface PersonalizationContext {
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    position?: string | null;
    role?: string | null;
  };
  company: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    location?: string | null;
    website?: string | null;

    // Intent signals (already in your DB)
    intent?: string | null;
    hiringInfo?: string | null;
    jobPostings?: string | null;
    hiringIntent?: string | null;

    // AI-generated insights
    aiDescription?: string | null;
    aiIndustry?: string | null;
    aiRecentNews?: string | null;
    techStack?: string | null;
  };
  campaignType: 'video_script' | 'email_subject' | 'email_body' | 'follow_up';
  userCompany?: string; // Sender's company name (e.g., "BrandMonkz")
}

export interface PersonalizationResult {
  content: string;
  confidence: number; // 0-100
  personalizedElements: string[]; // What was personalized
  usedSignals: string[]; // Which intent signals were used
  fallbackUsed: boolean;
}

export class PersonalizationService {
  /**
   * Generate personalized video script (30 seconds)
   */
  async generateVideoScript(
    contactId: string,
    companyId: string,
    userCompanyName: string = 'BrandMonkz'
  ): Promise<PersonalizationResult> {
    logger.info('Generating personalized video script', { contactId, companyId });
    const context = await this.buildContext(contactId, companyId, 'video_script', userCompanyName);
    return this.generateContent(context);
  }

  /**
   * Generate personalized email subject line
   */
  async generateEmailSubject(
    contactId: string,
    companyId: string,
    userCompanyName: string = 'BrandMonkz'
  ): Promise<PersonalizationResult> {
    logger.info('Generating personalized email subject', { contactId, companyId });
    const context = await this.buildContext(contactId, companyId, 'email_subject', userCompanyName);
    return this.generateContent(context);
  }

  /**
   * Generate personalized email body
   */
  async generateEmailBody(
    contactId: string,
    companyId: string,
    userCompanyName: string = 'BrandMonkz'
  ): Promise<PersonalizationResult> {
    logger.info('Generating personalized email body', { contactId, companyId });
    const context = await this.buildContext(contactId, companyId, 'email_body', userCompanyName);
    return this.generateContent(context);
  }

  /**
   * Build personalization context from database
   */
  private async buildContext(
    contactId: string,
    companyId: string,
    campaignType: PersonalizationContext['campaignType'],
    userCompanyName: string
  ): Promise<PersonalizationContext> {
    // Fetch contact
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        role: true,
      },
    });

    if (!contact) {
      throw new Error(`Contact not found: ${contactId}`);
    }

    // Fetch company with all intent signals
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        industry: true,
        size: true,
        location: true,
        website: true,
        intent: true,
        hiringInfo: true,
        jobPostings: true,
        hiringIntent: true,
        aiDescription: true,
        aiIndustry: true,
        aiRecentNews: true,
        techStack: true,
      },
    });

    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    return {
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        position: contact.title,
        role: contact.role,
      },
      company,
      campaignType,
      userCompany: userCompanyName,
    };
  }

  /**
   * Generate personalized content using AI
   */
  private async generateContent(
    context: PersonalizationContext
  ): Promise<PersonalizationResult> {
    const { contact, company, campaignType, userCompany } = context;

    // Determine what signals we have
    const availableSignals: string[] = [];
    const personalizedElements: string[] = [];

    if (company.intent) availableSignals.push('company_intent');
    if (company.hiringInfo) availableSignals.push('hiring_info');
    if (company.jobPostings) availableSignals.push('job_postings');
    if (company.aiRecentNews) availableSignals.push('recent_news');
    if (company.techStack) availableSignals.push('tech_stack');

    logger.info('Available personalization signals', {
      contactId: contact.email,
      companyId: company.id,
      signalCount: availableSignals.length,
      signals: availableSignals,
    });

    // Build AI prompt based on campaign type
    const systemPrompt = this.buildSystemPrompt(campaignType);
    const userPrompt = this.buildUserPrompt(context, availableSignals);

    try {
      // Call Claude AI
      const aiResponse = await callClaudeWithFallback({
        prompt: userPrompt,
        systemPrompt,
        maxTokens: campaignType === 'video_script' ? 500 : 200,
        temperature: 0.7,
        strategy: 'campaign'
      });

      // Analyze what was personalized
      personalizedElements.push(contact.firstName); // Always include name
      if (aiResponse.includes(company.name)) personalizedElements.push('company_name');
      if (company.intent && aiResponse.toLowerCase().includes('hiring')) {
        personalizedElements.push('hiring_intent');
      }
      if (company.techStack && aiResponse.includes(company.techStack)) {
        personalizedElements.push('tech_stack');
      }
      if (company.aiRecentNews && aiResponse.toLowerCase().includes('funding')) {
        personalizedElements.push('funding_news');
      }

      // Calculate confidence based on available signals
      const confidence = this.calculateConfidence(availableSignals.length);

      logger.info('Successfully generated personalized content', {
        campaignType,
        confidence,
        personalizedElements,
        usedSignals: availableSignals,
      });

      return {
        content: aiResponse.trim(),
        confidence,
        personalizedElements,
        usedSignals: availableSignals,
        fallbackUsed: false,
      };
    } catch (error: any) {
      logger.error('Personalization AI error, using fallback', { error: error.message });

      // Fallback to template-based generation
      return {
        content: this.generateFallbackContent(context),
        confidence: 30,
        personalizedElements: [contact.firstName],
        usedSignals: [],
        fallbackUsed: true,
      };
    }
  }

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(campaignType: PersonalizationContext['campaignType']): string {
    const basePrompt = `You are an expert B2B sales copywriter specializing in personalized outreach. Your goal is to create authentic, research-backed messages that show you understand the prospect's business.`;

    switch (campaignType) {
      case 'video_script':
        return `${basePrompt}

Create a 30-second video script that:
1. Opens with a personalized hook (3-5 seconds)
2. Mentions specific company context (hiring, tech, news) (10 seconds)
3. Presents a clear value proposition (10 seconds)
4. Ends with a soft call-to-action (5-7 seconds)

Requirements:
- Conversational, not salesy
- Reference specific facts about the company
- Sound natural when spoken aloud
- Total: ~75-100 words (30 seconds spoken)
- NO markdown formatting or special characters
- Just plain text that can be read aloud`;

      case 'email_subject':
        return `${basePrompt}

Create a compelling email subject line that:
1. Includes recipient's first name OR company name
2. References a specific trigger (hiring, news, challenge)
3. Creates curiosity without being clickbait
4. 50 characters or less

Examples of good subjects:
- "Sarah, saw you're hiring a VP of Sales"
- "Quick question about TechCorp's expansion"
- "Scaling challenges at [Company]?"`;

      case 'email_body':
        return `${basePrompt}

Create a 3-paragraph email that:
1. Personalized opening referencing specific company context
2. Value proposition addressing their likely challenges
3. Low-pressure call-to-action

Tone: Professional but conversational
Length: 100-150 words total`;

      case 'follow_up':
        return `${basePrompt}

Create a brief follow-up email that:
1. References previous outreach
2. Adds new value or insight
3. Makes it easy to respond

Tone: Friendly, not pushy
Length: 50-80 words`;

      default:
        return basePrompt;
    }
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    context: PersonalizationContext,
    availableSignals: string[]
  ): string {
    const { contact, company, campaignType, userCompany } = context;

    let prompt = `Generate ${campaignType.replace('_', ' ')} for this prospect:\n\n`;

    // Contact info
    prompt += `PROSPECT:\n`;
    prompt += `- Name: ${contact.firstName} ${contact.lastName}\n`;
    if (contact.position) prompt += `- Position: ${contact.position}\n`;
    if (contact.role) prompt += `- Role: ${contact.role}\n`;

    // Company info
    prompt += `\nCOMPANY:\n`;
    prompt += `- Name: ${company.name}\n`;
    if (company.industry) prompt += `- Industry: ${company.industry}\n`;
    if (company.size) prompt += `- Size: ${company.size} employees\n`;
    if (company.location) prompt += `- Location: ${company.location}\n`;

    // Intent signals (THE MAGIC)
    if (availableSignals.length > 0) {
      prompt += `\nKEY INSIGHTS (use these for personalization):\n`;

      if (company.intent) {
        prompt += `- Intent: ${company.intent}\n`;
      }
      if (company.hiringInfo) {
        prompt += `- Recent Hiring: ${company.hiringInfo}\n`;
      }
      if (company.jobPostings) {
        prompt += `- Job Postings: ${company.jobPostings}\n`;
      }
      if (company.aiRecentNews) {
        prompt += `- Recent News: ${company.aiRecentNews}\n`;
      }
      if (company.techStack) {
        prompt += `- Tech Stack: ${company.techStack}\n`;
      }
      if (company.hiringIntent) {
        prompt += `- Hiring Intent: ${company.hiringIntent}\n`;
      }
    }

    // Sender info
    prompt += `\nSENDER:\n`;
    prompt += `- Company: ${userCompany}\n`;
    prompt += `- Value Prop: We help companies scale their outreach with AI-powered video personalization and automated campaigns\n`;

    prompt += `\nGenerate the ${campaignType.replace('_', ' ')} now (just the content, no explanations or formatting):`;

    return prompt;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(signalCount: number): number {
    if (signalCount >= 3) return 90;
    if (signalCount === 2) return 75;
    if (signalCount === 1) return 60;
    return 40; // Generic only
  }

  /**
   * Generate fallback content if AI fails
   */
  private generateFallbackContent(context: PersonalizationContext): string {
    const { contact, company, campaignType } = context;

    switch (campaignType) {
      case 'video_script':
        return `Hi ${contact.firstName}, this is a quick message about ${company.name}. I noticed your company in the ${company.industry || 'industry'} and wanted to reach out. We help companies like yours scale their outreach with personalized video campaigns. Would love to show you how we can help ${company.name} reach more prospects. Let me know if you'd like to chat!`;

      case 'email_subject':
        return `${contact.firstName}, quick question about ${company.name}`;

      case 'email_body':
        return `Hi ${contact.firstName},\n\nI came across ${company.name} and was impressed by your work in ${company.industry || 'the industry'}.\n\nWe help companies scale their outreach with AI-powered personalized video campaigns. Curious if this would be valuable for ${company.name}?\n\nHappy to share a quick demo.\n\nBest,\nYour Name`;

      default:
        return `Hi ${contact.firstName}, following up on my previous message about ${company.name}.`;
    }
  }
}

// Export singleton instance
export const personalizationService = new PersonalizationService();
