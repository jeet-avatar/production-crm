export interface AIModelConfig {
    id: string;
    name: string;
    provider: 'anthropic' | 'openai';
    maxTokens: number;
    costPer1MTokens: number;
    description: string;
}
export declare const AVAILABLE_MODELS: AIModelConfig[];
export declare const MODEL_STRATEGY: {
    chat: {
        primary: string;
        fallbacks: string[];
    };
    campaign: {
        primary: string;
        fallbacks: string[];
    };
    enrichment: {
        primary: string;
        fallbacks: string[];
    };
    emailTemplate: {
        primary: string;
        fallbacks: string[];
    };
};
export declare function getModelConfig(modelId: string): AIModelConfig | undefined;
export declare function getPrimaryModel(strategy?: keyof typeof MODEL_STRATEGY): string;
export declare function getFallbackModels(strategy?: keyof typeof MODEL_STRATEGY): string[];
export declare function getModelsToTry(strategy?: keyof typeof MODEL_STRATEGY): string[];
export declare function isModelSupported(modelId: string): boolean;
export declare function getRecommendedModel(requiredTokens: number): string;
//# sourceMappingURL=ai-models.d.ts.map