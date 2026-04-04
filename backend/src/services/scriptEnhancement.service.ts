/**
 * Script Enhancement Service using GPT-4
 *
 * Enhances user video scripts to be more engaging, persuasive, and professional
 * Uses OpenAI GPT-4 for intelligent script optimization
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface ScriptEnhancementRequest {
  script: string;
  industry?: string;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'authoritative';
  maxLength?: number; // Target length in words
}

export interface ScriptEnhancementResponse {
  enhancedScript: string;
  videoPrompt: string;
  improvements: string[];
  estimatedDuration: number; // in seconds
}

export class ScriptEnhancementService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      logger.warn('⚠️  OpenAI API key not configured for script enhancement');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Enhance video script with GPT-4
   */
  async enhanceScript(request: ScriptEnhancementRequest): Promise<ScriptEnhancementResponse> {
    try {
      logger.info('✨ Enhancing script with GPT-4', {
        originalLength: request.script.length,
        industry: request.industry,
      });

      const enhanced = await this.callGPT4ForEnhancement(request);
      const videoPrompt = await this.generateVideoPrompt(enhanced, request);

      const result = {
        enhancedScript: enhanced,
        videoPrompt,
        improvements: this.analyzeImprovements(request.script, enhanced),
        estimatedDuration: this.estimateDuration(enhanced),
      };

      logger.info('✅ Script enhanced successfully', {
        originalWords: request.script.split(' ').length,
        enhancedWords: enhanced.split(' ').length,
        estimatedDuration: result.estimatedDuration,
      });

      return result;
    } catch (error: any) {
      logger.error('❌ Script enhancement failed:', error);
      // Fallback to original script if enhancement fails
      return {
        enhancedScript: request.script,
        videoPrompt: this.generateSimpleVideoPrompt(request),
        improvements: [],
        estimatedDuration: this.estimateDuration(request.script),
      };
    }
  }

  /**
   * Call GPT-4 to enhance the script
   */
  private async callGPT4ForEnhancement(request: ScriptEnhancementRequest): Promise<string> {
    const maxWords = request.maxLength || 50; // Default to 50 words for 15-second video
    const tone = request.tone || 'professional';
    const industry = request.industry || 'general business';
    const audience = request.targetAudience || 'business professionals';

    const systemPrompt = `You are an expert video scriptwriter specializing in creating engaging, persuasive scripts for short-form video content. Your scripts are known for their strong hooks, clear value propositions, and compelling calls-to-action.`;

    const userPrompt = `Enhance this video script for maximum engagement and impact.

Original Script:
"${request.script}"

Requirements:
- Industry: ${industry}
- Target Audience: ${audience}
- Tone: ${tone}
- Maximum Length: ${maxWords} words (for ~15-second video)
- Must include: Strong hook (first 3 seconds), clear value proposition, compelling CTA

Structure Guidelines:
1. Hook (0-3s): Grab attention immediately with a question, surprising fact, or bold statement
2. Value (3-10s): Clearly state the benefit or solution
3. CTA (10-15s): Strong call-to-action that drives conversion

Output ONLY the enhanced script text, nothing else. No explanations, no labels, just the script.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content?.trim() || request.script;
  }

  /**
   * Generate optimized video prompt for Kling AI
   */
  private async generateVideoPrompt(
    script: string,
    request: ScriptEnhancementRequest
  ): Promise<string> {
    try {
      const industry = request.industry || 'business';
      const tone = request.tone || 'professional';

      const systemPrompt = `You are an expert at creating video generation prompts that produce high-quality, professional videos. You specialize in translating scripts into visual descriptions.`;

      const userPrompt = `Create a detailed video generation prompt for Kling AI based on this script and context.

Script: "${script}"
Industry: ${industry}
Visual Style: ${tone}

The prompt should:
- Describe the visual scenes that match the script
- Include specific details about lighting, setting, and mood
- Be cinematic and professional
- Be suitable for a 15-second video
- Match the ${industry} industry aesthetic

Output format: Single paragraph, 2-3 sentences maximum. Focus on visuals, not narration.

Example format: "A modern tech office with natural lighting, showing a diverse team collaborating on laptops, smooth camera movement revealing innovative workspace design, professional corporate aesthetic with blue and white color scheme"`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      });

      return response.choices[0].message.content?.trim() || this.generateSimpleVideoPrompt(request);
    } catch (error) {
      logger.warn('Failed to generate video prompt with GPT-4, using fallback');
      return this.generateSimpleVideoPrompt(request);
    }
  }

  /**
   * Generate simple video prompt as fallback
   */
  private generateSimpleVideoPrompt(request: ScriptEnhancementRequest): string {
    const industry = request.industry || 'business';
    const tone = request.tone || 'professional';

    const templates: Record<string, string> = {
      technology: 'Modern tech office with diverse team working on laptops, clean minimalist design, bright natural lighting, professional corporate atmosphere',
      healthcare: 'Professional medical setting with healthcare workers, clean modern facility, soft lighting, caring and professional atmosphere',
      finance: 'Sleek financial office with professionals analyzing data, premium business environment, confident and trustworthy aesthetic',
      retail: 'Modern retail environment with happy customers, bright inviting atmosphere, dynamic shopping experience',
      education: 'Contemporary learning environment with engaged students, collaborative atmosphere, innovative educational setting',
      default: 'Professional business setting with team collaboration, modern office environment, clean aesthetic, natural lighting',
    };

    return templates[industry.toLowerCase()] || templates.default;
  }

  /**
   * Analyze what improvements were made
   */
  private analyzeImprovements(original: string, enhanced: string): string[] {
    const improvements: string[] = [];

    if (enhanced.split('?').length > original.split('?').length) {
      improvements.push('Added engaging question as hook');
    }

    if (enhanced.length > original.length * 1.2) {
      improvements.push('Expanded details and value proposition');
    }

    if (/call|visit|click|book|get|try|start/i.test(enhanced) && !/call|visit|click|book|get|try|start/i.test(original)) {
      improvements.push('Added clear call-to-action');
    }

    if (enhanced.split('.').length > original.split('.').length) {
      improvements.push('Improved structure and flow');
    }

    if (!improvements.length) {
      improvements.push('Optimized for engagement and clarity');
    }

    return improvements;
  }

  /**
   * Estimate video duration based on script length
   * Average speaking rate: ~150 words per minute = 2.5 words per second
   */
  private estimateDuration(script: string): number {
    const wordCount = script.split(/\s+/).length;
    const wordsPerSecond = 2.5;
    return Math.ceil(wordCount / wordsPerSecond);
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

export const scriptEnhancementService = new ScriptEnhancementService();
