import Anthropic from '@anthropic-ai/sdk';
export interface MemoryEntry {
    content: string;
    metadata?: Record<string, any>;
    timestamp?: Date;
}
declare class SuperMemoryClient {
    private baseUrl;
    private apiKey;
    constructor();
    addMemory(userId: string, memory: MemoryEntry): Promise<void>;
    searchMemories(userId: string, query: string, limit?: number): Promise<any[]>;
}
export declare function getAnthropicWithMemory(userId: string, conversationId?: string): Anthropic;
export declare function getStandardAnthropicClient(): Anthropic;
export declare class MemoryLogger {
    private client;
    constructor();
    logCampaignCreation(userId: string, campaign: {
        id: string;
        name: string;
        industry?: string;
        tone?: string;
        targetAudience?: string;
    }): Promise<void>;
    logCompanyImport(userId: string, company: {
        id: string;
        name: string;
        industry?: string;
        source: string;
    }): Promise<void>;
    logContactImport(userId: string, contact: {
        id: string;
        name: string;
        company?: string;
        jobTitle?: string;
        source: string;
    }): Promise<void>;
    logUserPreference(userId: string, preference: {
        category: string;
        key: string;
        value: string;
    }): Promise<void>;
    logVideoGenerationIssue(userId: string, issue: {
        campaignId: string;
        campaignName: string;
        issue: string;
        details?: string;
    }): Promise<void>;
    searchMemories(userId: string, query: string, limit?: number): Promise<any[]>;
}
export declare const memoryLogger: MemoryLogger;
export declare const superMemoryClient: SuperMemoryClient;
export {};
//# sourceMappingURL=supermemory.service.d.ts.map