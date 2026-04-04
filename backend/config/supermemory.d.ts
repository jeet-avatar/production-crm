export declare const SUPERMEMORY_CONFIG: {
    enabled: boolean;
    apiKey: string;
    baseUrl: string;
    anthropicProxyUrl: string;
    maxMemoriesPerUser: number;
    memoryRetentionDays: number;
    features: {
        aiChat: boolean;
        campaignGeneration: boolean;
        contactEnrichment: boolean;
    };
};
export declare function getSuperMemoryHeaders(userId: string, conversationId?: string): Record<string, string>;
export declare function isSuperMemoryEnabled(): boolean;
//# sourceMappingURL=supermemory.d.ts.map