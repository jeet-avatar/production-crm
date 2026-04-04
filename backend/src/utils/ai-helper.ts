/**
 * AI Helper Utilities
 * Shared functions for calling AI models (Claude + OpenAI) with automatic fallback
 * Includes SuperMemory integration for cross-conversation memory
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AI_CONFIG } from '../config/ai';
import { getModelsToTry, getModelConfig } from '../config/ai-models';
import { SUPERMEMORY_CONFIG, getSuperMemoryHeaders, isSuperMemoryEnabled } from '../config/supermemory';

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

/**
 * Get or initialize Anthropic client (standard, without memory)
 */
export function getAnthropicClient(): Anthropic {
  if (!true) {
    throw new Error('AI features are disabled. Please set ANTHROPIC_API_KEY environment variable.');
  }

  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: AI_CONFIG.apiKey,
    });
  }

  return anthropic;
}

/**
 * Get Anthropic client with SuperMemory integration
 * Routes API calls through SuperMemory for automatic cross-conversation memory
 *
 * @param userId - User ID for memory scoping
 * @param conversationId - Optional conversation ID for session tracking
 */
export function getAnthropicClientWithMemory(userId: string, conversationId?: string): Anthropic {
  if (!true) {
    throw new Error('AI features are disabled. Please set ANTHROPIC_API_KEY environment variable.');
  }

  // If SuperMemory is not enabled, return standard client
  if (!isSuperMemoryEnabled()) {
    console.log('[AI Helper] SuperMemory disabled - using standard Anthropic client');
    return getAnthropicClient();
  }

  // Create new memory-enabled client (don't cache, as userId/conversationId changes)
  console.log('[AI Helper] Creating Anthropic client with SuperMemory', {
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
 * Get or initialize OpenAI client
 * Returns null if API key is not configured (graceful degradation)
 */
export function getOpenAIClient(): OpenAI | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return null; // Gracefully return null instead of throwing
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: openaiKey,
    });
  }

  return openai;
}

interface CallClaudeOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  strategy?: 'chat' | 'campaign' | 'enrichment' | 'emailTemplate';
}

/**
 * Call Claude with automatic model fallback
 * This function ensures AI requests NEVER fail due to model unavailability
 *
 * @param options Configuration for the Claude API call
 * @returns The response text from Claude
 */
export async function callClaudeWithFallback(options: CallClaudeOptions): Promise<string> {
  const {
    prompt,
    systemPrompt,
    maxTokens = 1024,
    temperature = 0.7,
    strategy = 'chat',
  } = options;

  // Get all models to try for this strategy
  const modelsToTry = getModelsToTry(strategy);
  let lastError: Error | null = null;

  // Try each model in order until one succeeds
  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    const modelConfig = getModelConfig(modelId);

    try {
      const logPrefix = `[AI Helper][${strategy}]`;
      console.log(`${logPrefix} Attempting model: ${modelId} (${modelConfig?.provider})${i > 0 ? ' (fallback)' : ''}`);

      let result: string;

      if (modelConfig?.provider === 'openai') {
        // OpenAI API call
        const client = getOpenAIClient();

        // Skip this model if OpenAI API key is not configured
        if (!client) {
          throw new Error('OpenAI API key not configured - skipping OpenAI model');
        }

        const messages: any[] = [
          {
            role: 'user',
            content: prompt,
          },
        ];

        // OpenAI uses system message in the messages array
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
      } else {
        // Anthropic API call
        const client = getAnthropicClient();

        const requestParams: any = {
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

      // Success! Log if we had to use a fallback
      if (i > 0) {
        console.warn(`${logPrefix} ⚠️ Primary model failed, succeeded with fallback: ${modelId} (${modelConfig?.provider})`);
      } else {
        console.log(`${logPrefix} ✅ Success with primary model: ${modelId} (${modelConfig?.provider})`);
      }

      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`[AI Helper][${strategy}] ❌ Model ${modelId} (${modelConfig?.provider}) failed:`, error.message);

      // If this is the last model, throw the error
      if (i === modelsToTry.length - 1) {
        console.error(`[AI Helper][${strategy}] 🚨 ALL MODELS FAILED - This should never happen!`);
        throw new Error(`All AI models failed. Last error: ${error.message}`);
      }

      // Otherwise, continue to next fallback
      console.log(`[AI Helper][${strategy}] 🔄 Trying next fallback model...`);
    }
  }

  // This should never be reached due to the throw above, but TypeScript needs it
  throw new Error(`Failed to call Claude: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Call Claude with conversation history (for chat-like interactions)
 */
export async function callClaudeWithHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string,
  maxTokens: number = 2048,
  strategy: 'chat' | 'campaign' | 'enrichment' | 'emailTemplate' = 'chat'
): Promise<string> {
  const modelsToTry = getModelsToTry(strategy);
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    const modelConfig = getModelConfig(modelId);

    try {
      console.log(`[AI Helper][${strategy}] Attempting model: ${modelId} (${modelConfig?.provider})${i > 0 ? ' (fallback)' : ''}`);

      let result: string;

      if (modelConfig?.provider === 'openai') {
        // OpenAI API call
        const client = getOpenAIClient();

        // Skip this model if OpenAI API key is not configured
        if (!client) {
          throw new Error('OpenAI API key not configured - skipping OpenAI model');
        }

        const openaiMessages: any[] = [...messages];

        // OpenAI uses system message in the messages array
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
      } else {
        // Anthropic API call
        const client = getAnthropicClient();

        const requestParams: any = {
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
      } else {
        console.log(`[AI Helper][${strategy}] ✅ Success with primary model: ${modelId} (${modelConfig?.provider})`);
      }

      return result;
    } catch (error: any) {
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
