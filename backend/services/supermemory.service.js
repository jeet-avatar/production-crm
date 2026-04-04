"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superMemoryClient = exports.memoryLogger = exports.MemoryLogger = void 0;
exports.getAnthropicWithMemory = getAnthropicWithMemory;
exports.getStandardAnthropicClient = getStandardAnthropicClient;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const supermemory_1 = require("../config/supermemory");
const ai_1 = require("../config/ai");
const logger_1 = require("../utils/logger");
class SuperMemoryClient {
    constructor() {
        this.baseUrl = supermemory_1.SUPERMEMORY_CONFIG.baseUrl;
        this.apiKey = supermemory_1.SUPERMEMORY_CONFIG.apiKey;
    }
    async addMemory(userId, memory) {
        if (!(0, supermemory_1.isSuperMemoryEnabled)()) {
            logger_1.logger.warn('SuperMemory is disabled - skipping memory storage');
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
            logger_1.logger.info('Memory added to SuperMemory', {
                userId,
                contentLength: memory.content.length,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to add memory to SuperMemory', { error, userId });
        }
    }
    async searchMemories(userId, query, limit = 5) {
        if (!(0, supermemory_1.isSuperMemoryEnabled)()) {
            logger_1.logger.warn('SuperMemory is disabled - returning empty search results');
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
            const results = await response.json();
            const resultsArray = Array.isArray(results) ? results : [];
            logger_1.logger.info('Memory search completed', {
                userId,
                query,
                resultsCount: resultsArray.length,
            });
            return resultsArray;
        }
        catch (error) {
            logger_1.logger.error('Failed to search SuperMemory', { error, userId, query });
            return [];
        }
    }
}
function getAnthropicWithMemory(userId, conversationId) {
    if (!(0, supermemory_1.isSuperMemoryEnabled)()) {
        logger_1.logger.info('SuperMemory disabled - using standard Anthropic client');
        return new sdk_1.default({
            apiKey: ai_1.AI_CONFIG.apiKey,
        });
    }
    logger_1.logger.info('Creating Anthropic client with SuperMemory', {
        userId,
        conversationId,
    });
    return new sdk_1.default({
        apiKey: ai_1.AI_CONFIG.apiKey,
        baseURL: supermemory_1.SUPERMEMORY_CONFIG.anthropicProxyUrl,
        defaultHeaders: (0, supermemory_1.getSuperMemoryHeaders)(userId, conversationId),
    });
}
function getStandardAnthropicClient() {
    return new sdk_1.default({
        apiKey: ai_1.AI_CONFIG.apiKey,
    });
}
class MemoryLogger {
    constructor() {
        this.client = new SuperMemoryClient();
    }
    async logCampaignCreation(userId, campaign) {
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
    async logCompanyImport(userId, company) {
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
    async logContactImport(userId, contact) {
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
    async logUserPreference(userId, preference) {
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
    async logVideoGenerationIssue(userId, issue) {
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
    async searchMemories(userId, query, limit = 5) {
        return this.client.searchMemories(userId, query, limit);
    }
}
exports.MemoryLogger = MemoryLogger;
exports.memoryLogger = new MemoryLogger();
exports.superMemoryClient = new SuperMemoryClient();
//# sourceMappingURL=supermemory.service.js.map