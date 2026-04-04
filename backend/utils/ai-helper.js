"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnthropicClient = getAnthropicClient;
exports.getAnthropicClientWithMemory = getAnthropicClientWithMemory;
exports.getOpenAIClient = getOpenAIClient;
exports.callClaudeWithFallback = callClaudeWithFallback;
exports.callClaudeWithHistory = callClaudeWithHistory;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const openai_1 = __importDefault(require("openai"));
const ai_1 = require("../config/ai");
const ai_models_1 = require("../config/ai-models");
const supermemory_1 = require("../config/supermemory");
let anthropic = null;
let openai = null;
function getAnthropicClient() {
    if (!ai_1.AI_CONFIG.enabled) {
        throw new Error('AI features are disabled. Please set ANTHROPIC_API_KEY environment variable.');
    }
    if (!anthropic) {
        anthropic = new sdk_1.default({
            apiKey: ai_1.AI_CONFIG.apiKey,
        });
    }
    return anthropic;
}
function getAnthropicClientWithMemory(userId, conversationId) {
    if (!ai_1.AI_CONFIG.enabled) {
        throw new Error('AI features are disabled. Please set ANTHROPIC_API_KEY environment variable.');
    }
    if (!(0, supermemory_1.isSuperMemoryEnabled)()) {
        console.log('[AI Helper] SuperMemory disabled - using standard Anthropic client');
        return getAnthropicClient();
    }
    console.log('[AI Helper] Creating Anthropic client with SuperMemory', {
        userId,
        conversationId,
    });
    return new sdk_1.default({
        apiKey: ai_1.AI_CONFIG.apiKey,
        baseURL: supermemory_1.SUPERMEMORY_CONFIG.anthropicProxyUrl,
        defaultHeaders: (0, supermemory_1.getSuperMemoryHeaders)(userId, conversationId),
    });
}
function getOpenAIClient() {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        return null;
    }
    if (!openai) {
        openai = new openai_1.default({
            apiKey: openaiKey,
        });
    }
    return openai;
}
async function callClaudeWithFallback(options) {
    const { prompt, systemPrompt, maxTokens = 1024, temperature = 0.7, strategy = 'chat', } = options;
    const modelsToTry = (0, ai_models_1.getModelsToTry)(strategy);
    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
        const modelId = modelsToTry[i];
        const modelConfig = (0, ai_models_1.getModelConfig)(modelId);
        try {
            const logPrefix = `[AI Helper][${strategy}]`;
            console.log(`${logPrefix} Attempting model: ${modelId} (${modelConfig?.provider})${i > 0 ? ' (fallback)' : ''}`);
            let result;
            if (modelConfig?.provider === 'openai') {
                const client = getOpenAIClient();
                if (!client) {
                    throw new Error('OpenAI API key not configured - skipping OpenAI model');
                }
                const messages = [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ];
                if (systemPrompt) {
                    messages.unshift({
                        role: 'system',
                        content: systemPrompt,
                    });
                }
                const response = await client.chat.completions.create({
                    model: modelId,
                    messages,
                    max_tokens: Math.min(maxTokens, modelConfig?.maxTokens || 4096),
                    temperature,
                });
                result = response.choices[0]?.message?.content || '';
            }
            else {
                const client = getAnthropicClient();
                const requestParams = {
                    model: modelId,
                    max_tokens: Math.min(maxTokens, modelConfig?.maxTokens || 4096),
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature,
                };
                if (systemPrompt) {
                    requestParams.system = systemPrompt;
                }
                const response = await client.messages.create(requestParams);
                result = response.content[0].type === 'text' ? response.content[0].text : '';
            }
            if (i > 0) {
                console.warn(`${logPrefix} ⚠️ Primary model failed, succeeded with fallback: ${modelId} (${modelConfig?.provider})`);
            }
            else {
                console.log(`${logPrefix} ✅ Success with primary model: ${modelId} (${modelConfig?.provider})`);
            }
            return result;
        }
        catch (error) {
            lastError = error;
            console.error(`[AI Helper][${strategy}] ❌ Model ${modelId} (${modelConfig?.provider}) failed:`, error.message);
            if (i === modelsToTry.length - 1) {
                console.error(`[AI Helper][${strategy}] 🚨 ALL MODELS FAILED - This should never happen!`);
                throw new Error(`All AI models failed. Last error: ${error.message}`);
            }
            console.log(`[AI Helper][${strategy}] 🔄 Trying next fallback model...`);
        }
    }
    throw new Error(`Failed to call Claude: ${lastError?.message || 'Unknown error'}`);
}
async function callClaudeWithHistory(messages, systemPrompt, maxTokens = 2048, strategy = 'chat') {
    const modelsToTry = (0, ai_models_1.getModelsToTry)(strategy);
    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
        const modelId = modelsToTry[i];
        const modelConfig = (0, ai_models_1.getModelConfig)(modelId);
        try {
            console.log(`[AI Helper][${strategy}] Attempting model: ${modelId} (${modelConfig?.provider})${i > 0 ? ' (fallback)' : ''}`);
            let result;
            if (modelConfig?.provider === 'openai') {
                const client = getOpenAIClient();
                if (!client) {
                    throw new Error('OpenAI API key not configured - skipping OpenAI model');
                }
                const openaiMessages = [...messages];
                if (systemPrompt) {
                    openaiMessages.unshift({
                        role: 'system',
                        content: systemPrompt,
                    });
                }
                const response = await client.chat.completions.create({
                    model: modelId,
                    messages: openaiMessages,
                    max_tokens: Math.min(maxTokens, modelConfig?.maxTokens || 4096),
                    temperature: 0.3,
                });
                result = response.choices[0]?.message?.content || '';
            }
            else {
                const client = getAnthropicClient();
                const requestParams = {
                    model: modelId,
                    max_tokens: Math.min(maxTokens, modelConfig?.maxTokens || 4096),
                    messages,
                    temperature: 0.3,
                };
                if (systemPrompt) {
                    requestParams.system = systemPrompt;
                }
                const response = await client.messages.create(requestParams);
                result = response.content[0].type === 'text' ? response.content[0].text : '';
            }
            if (i > 0) {
                console.warn(`[AI Helper][${strategy}] ⚠️ Primary model failed, succeeded with fallback: ${modelId} (${modelConfig?.provider})`);
            }
            else {
                console.log(`[AI Helper][${strategy}] ✅ Success with primary model: ${modelId} (${modelConfig?.provider})`);
            }
            return result;
        }
        catch (error) {
            lastError = error;
            console.error(`[AI Helper][${strategy}] ❌ Model ${modelId} (${modelConfig?.provider}) failed:`, error.message);
            if (i === modelsToTry.length - 1) {
                console.error(`[AI Helper][${strategy}] 🚨 ALL MODELS FAILED`);
                throw new Error(`All AI models failed. Last error: ${error.message}`);
            }
            console.log(`[AI Helper][${strategy}] 🔄 Trying next fallback model...`);
        }
    }
    throw new Error(`Failed to call Claude: ${lastError?.message || 'Unknown error'}`);
}
//# sourceMappingURL=ai-helper.js.map