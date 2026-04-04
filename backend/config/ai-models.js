"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_STRATEGY = exports.AVAILABLE_MODELS = void 0;
exports.getModelConfig = getModelConfig;
exports.getPrimaryModel = getPrimaryModel;
exports.getFallbackModels = getFallbackModels;
exports.getModelsToTry = getModelsToTry;
exports.isModelSupported = isModelSupported;
exports.getRecommendedModel = getRecommendedModel;
exports.AVAILABLE_MODELS = [
    {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        maxTokens: 4096,
        costPer1MTokens: 0.25,
        description: 'Fast and reliable - Primary model',
    },
    {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        maxTokens: 16384,
        costPer1MTokens: 0.15,
        description: 'Fast and affordable OpenAI model - Fallback option',
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        maxTokens: 16384,
        costPer1MTokens: 0.5,
        description: 'Reliable OpenAI model - Secondary fallback',
    },
];
exports.MODEL_STRATEGY = {
    chat: {
        primary: 'claude-3-haiku-20240307',
        fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    campaign: {
        primary: 'claude-3-haiku-20240307',
        fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    enrichment: {
        primary: 'claude-3-haiku-20240307',
        fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    emailTemplate: {
        primary: 'claude-3-haiku-20240307',
        fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    },
};
function getModelConfig(modelId) {
    return exports.AVAILABLE_MODELS.find((m) => m.id === modelId);
}
function getPrimaryModel(strategy = 'chat') {
    return exports.MODEL_STRATEGY[strategy].primary;
}
function getFallbackModels(strategy = 'chat') {
    return exports.MODEL_STRATEGY[strategy].fallbacks;
}
function getModelsToTry(strategy = 'chat') {
    const { primary, fallbacks } = exports.MODEL_STRATEGY[strategy];
    return [primary, ...fallbacks];
}
function isModelSupported(modelId) {
    return exports.AVAILABLE_MODELS.some((m) => m.id === modelId);
}
function getRecommendedModel(requiredTokens) {
    if (requiredTokens > 4096) {
        console.warn(`⚠️ Requested ${requiredTokens} tokens, but Haiku only supports 4096. Truncating.`);
    }
    return getPrimaryModel('chat');
}
//# sourceMappingURL=ai-models.js.map