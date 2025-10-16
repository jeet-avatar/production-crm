export declare const AI_CONFIG: {
    apiKey: string;
    model: string;
    maxTokens: {
        basic: number;
        subject: number;
        content: number;
        campaign: number;
        enrichment: number;
    };
    temperature: number;
    topP: number;
    rateLimitMs: number;
};
export declare function getAIMessageConfig(tokenType?: keyof typeof AI_CONFIG.maxTokens): {
    model: string;
    max_tokens: number;
};
export declare const BEDROCK_CONFIG: {
    modelId: string;
    maxTokens: number;
    temperature: number;
    topP: number;
};
//# sourceMappingURL=ai.d.ts.map