/**
 * SuperMemory Service
 * Handles memory storage and retrieval for AI features
 */

import Anthropic from '@anthropic-ai/sdk';
import { SUPERMEMORY_CONFIG, getSuperMemoryHeaders, isSuperMemoryEnabled } from '../config/supermemory';
import { AI_CONFIG } from '../config/ai';
import { logger } from '../utils/logger';

/**
 * Memory entry structure
 */
export interface MemoryEntry {
  content: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * SuperMemory API client for direct memory operations
 */
class SuperMemoryClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = SUPERMEMORY_CONFIG.baseUrl;
    this.apiKey = SUPERMEMORY_CONFIG.apiKey;
  }

  /**
   * Add a memory to SuperMemory
   */
  async addMemory(userId: string, memory: MemoryEntry): Promise<void> {
    if (!isSuperMemoryEnabled()) {
      logger.warn('SuperMemory is disabled - skipping memory storage');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'x-sm-user-id': userId,
        },
        body: JSON.stringify({
          content: memory.content,
          metadata: {
            ...memory.metadata,
            timestamp: memory.timestamp || new Date(),
            source: 'brandmonkz-crm',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`SuperMemory add failed: ${response.statusText}`);
      }

      logger.info('Memory added to SuperMemory', {
        userId,
        contentLength: memory.content.length,
      });
    } catch (error) {
      logger.error('Failed to add memory to SuperMemory', { error, userId });
      // Don't throw - memory storage is non-critical
    }
  }

  /**
   * Search memories in SuperMemory
   */
  async searchMemories(userId: string, query: string, limit = 5): Promise<any[]> {
    if (!isSuperMemoryEnabled()) {
      logger.warn('SuperMemory is disabled - returning empty search results');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'x-sm-user-id': userId,
        },
        body: JSON.stringify({
          query,
          limit,
        }),
      });

      if (!response.ok) {
        throw new Error(`SuperMemory search failed: ${response.statusText}`);
      }

      const results: any = await response.json();
      const resultsArray = Array.isArray(results) ? results : [];

      logger.info('Memory search completed', {
        userId,
        query,
        resultsCount: resultsArray.length,
      });

      return resultsArray;
    } catch (error) {
      logger.error('Failed to search SuperMemory', { error, userId, query });
      return [];
    }
  }
}

/**
 * Get Anthropic client with SuperMemory integration
 * This routes all API calls through SuperMemory for automatic context management
 */
export function getAnthropicWithMemory(userId: string, conversationId?: string): Anthropic {
  if (!isSuperMemoryEnabled()) {
    logger.info('SuperMemory disabled - using standard Anthropic client');
    return new Anthropic({
      apiKey: AI_CONFIG.apiKey,
    });
  }

  logger.info('Creating Anthropic client with SuperMemory', {
    userId,
    conversationId,
  });

  return new Anthropic({
    apiKey: AI_CONFIG.apiKey,
    baseURL: SUPERMEMORY_CONFIG.anthropicProxyUrl,
    defaultHeaders: getSuperMemoryHeaders(userId, conversationId),
  });
}

/**
 * Get standard Anthropic client (without memory)
 * Use this for operations that don't need memory
 */
export function getStandardAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: AI_CONFIG.apiKey,
  });
}

/**
 * Store important events in memory for future reference
 */
export class MemoryLogger {
  private client: SuperMemoryClient;

  constructor() {
    this.client = new SuperMemoryClient();
  }

  /**
   * Log campaign creation
   */
  async logCampaignCreation(
    userId: string,
    campaign: {
      id: string;
      name: string;
      industry?: string;
      tone?: string;
      targetAudience?: string;
    }
  ): Promise<void> {
    await this.client.addMemory(userId, {
      content: `User created campaign "${campaign.name}"${campaign.industry ? ` for ${campaign.industry} industry` : ''}${campaign.tone ? ` with ${campaign.tone} tone` : ''}${campaign.targetAudience ? ` targeting ${campaign.targetAudience}` : ''}`,
      metadata: {
        type: 'campaign_creation',
        campaignId: campaign.id,
        industry: campaign.industry,
        tone: campaign.tone,
        targetAudience: campaign.targetAudience,
      },
    });
  }

  /**
   * Log company import
   */
  async logCompanyImport(
    userId: string,
    company: {
      id: string;
      name: string;
      industry?: string;
      source: string;
    }
  ): Promise<void> {
    await this.client.addMemory(userId, {
      content: `User imported company "${company.name}"${company.industry ? ` in ${company.industry} industry` : ''} from ${company.source}`,
      metadata: {
        type: 'company_import',
        companyId: company.id,
        industry: company.industry,
        source: company.source,
      },
    });
  }

  /**
   * Log contact import
   */
  async logContactImport(
    userId: string,
    contact: {
      id: string;
      name: string;
      company?: string;
      jobTitle?: string;
      source: string;
    }
  ): Promise<void> {
    await this.client.addMemory(userId, {
      content: `User imported contact "${contact.name}"${contact.jobTitle ? ` (${contact.jobTitle})` : ''}${contact.company ? ` at ${contact.company}` : ''} from ${contact.source}`,
      metadata: {
        type: 'contact_import',
        contactId: contact.id,
        company: contact.company,
        jobTitle: contact.jobTitle,
        source: contact.source,
      },
    });
  }

  /**
   * Log user preferences learned from AI chat
   */
  async logUserPreference(
    userId: string,
    preference: {
      category: string;
      key: string;
      value: string;
    }
  ): Promise<void> {
    await this.client.addMemory(userId, {
      content: `User preference: ${preference.category} - ${preference.key}: ${preference.value}`,
      metadata: {
        type: 'user_preference',
        category: preference.category,
        key: preference.key,
        value: preference.value,
      },
    });
  }

  /**
   * Log video generation issue
   */
  async logVideoGenerationIssue(
    userId: string,
    issue: {
      campaignId: string;
      campaignName: string;
      issue: string;
      details?: string;
    }
  ): Promise<void> {
    await this.client.addMemory(userId, {
      content: `VIDEO GENERATION ISSUE: Campaign "${issue.campaignName}" (ID: ${issue.campaignId}) - ${issue.issue}. ${issue.details || 'Generated videos are not getting embedded into email templates.'}`,
      metadata: {
        type: 'video_generation_issue',
        campaignId: issue.campaignId,
        issue: issue.issue,
        details: issue.details,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Search memories for context
   */
  async searchMemories(userId: string, query: string, limit = 5): Promise<any[]> {
    return this.client.searchMemories(userId, query, limit);
  }
}

// Export singleton instance
export const memoryLogger = new MemoryLogger();

// Export SuperMemory client for direct access if needed
export const superMemoryClient = new SuperMemoryClient();
