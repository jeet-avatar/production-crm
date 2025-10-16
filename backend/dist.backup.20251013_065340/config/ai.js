"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BEDROCK_CONFIG = exports.AI_CONFIG = void 0;
exports.getAIMessageConfig = getAIMessageConfig;
if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
}
exports.AI_CONFIG = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    maxTokens: {
        basic: Number.parseInt(process.env.AI_MAX_TOKENS_BASIC || '512'),
        subject: Number.parseInt(process.env.AI_MAX_TOKENS_SUBJECT || '1024'),
        content: Number.parseInt(process.env.AI_MAX_TOKENS_CONTENT || '3072'),
        campaign: Number.parseInt(process.env.AI_MAX_TOKENS_CAMPAIGN || '4096'),
        enrichment: Number.parseInt(process.env.AI_MAX_TOKENS_ENRICHMENT || '1024'),
    },
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.AI_TOP_P || '0.9'),
    rateLimitMs: Number.parseInt(process.env.AI_RATE_LIMIT_MS || '1000'),
};
function getAIMessageConfig(tokenType = 'basic') {
    return {
        model: exports.AI_CONFIG.model,
        max_tokens: exports.AI_CONFIG.maxTokens[tokenType],
    };
}
exports.BEDROCK_CONFIG = {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    maxTokens: Number.parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
    topP: parseFloat(process.env.BEDROCK_TOP_P || '0.9'),
};
//# sourceMappingURL=ai.js.map