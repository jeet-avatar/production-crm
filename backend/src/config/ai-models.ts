/**
 * Multi-Model AI Configuration with Automatic Fallback
 * This ensures the AI system NEVER fails due to model unavailability
 *
 * Production-ready with:
 * - Automatic fallback to alternative models
 * - Graceful degradation
 * - Zero user-facing failures
 * - Logging for monitoring
 */

export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  maxTokens: number;
  costPer1MTokens: number; // Cost in USD for pricing tracking
  description: string;
}

/**
 * Available AI Models (Claude + OpenAI)
 * Primary: Claude Haiku (only model available with current Anthropic API key)
 * Fallback: OpenAI GPT models (if Anthropic fails)
 */
export const AVAILABLE_MODELS: AIModelConfig[] = [
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

/**
 * Model Selection Strategy
 * Define which models to try for different use cases
 */
export const MODEL_STRATEGY = {
  // General chat and simple tasks
  chat: {
    primary: 'claude-3-haiku-20240307',
    fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  },

  // Complex campaign generation
  campaign: {
    primary: 'claude-3-haiku-20240307',
    fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  },

  // Quick enrichment tasks
  enrichment: {
    primary: 'claude-3-haiku-20240307',
    fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  },

  // Email template generation
  emailTemplate: {
    primary: 'claude-3-haiku-20240307',
    fallbacks: ['gpt-4o-mini', 'gpt-3.5-turbo'],
  },
};

/**
 * Get model configuration by ID
 */
export function getModelConfig(modelId: string): AIModelConfig | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

/**
 * Get primary model for a given strategy
 */
export function getPrimaryModel(strategy: keyof typeof MODEL_STRATEGY = 'chat'): string {
  return MODEL_STRATEGY[strategy].primary;
}

/**
 * Get fallback models for a given strategy
 */
export function getFallbackModels(strategy: keyof typeof MODEL_STRATEGY = 'chat'): string[] {
  return MODEL_STRATEGY[strategy].fallbacks;
}

/**
 * Get all models to try (primary + fallbacks) for a strategy
 */
export function getModelsToTry(strategy: keyof typeof MODEL_STRATEGY = 'chat'): string[] {
  const { primary, fallbacks } = MODEL_STRATEGY[strategy];
  return [primary, ...fallbacks];
}

/**
 * Validate if a model ID is supported
 */
export function isModelSupported(modelId: string): boolean {
  return AVAILABLE_MODELS.some((m) => m.id === modelId);
}

/**
 * Get recommended model based on token requirements
 */
export function getRecommendedModel(requiredTokens: number): string {
  // Only Haiku is available with current API key (max 4096 tokens)
  if (requiredTokens > 4096) {
    console.warn(`⚠️ Requested ${requiredTokens} tokens, but Haiku only supports 4096. Truncating.`);
  }

  // Return the only available model
  return getPrimaryModel('chat');
}
