/**
 * SuperMemory Configuration
 * Provides cross-conversation memory for AI features
 */

// Validate SuperMemory API key
const hasSuperMemoryKey = !!process.env.SUPERMEMORY_API_KEY;
if (!hasSuperMemoryKey) {
  console.warn('⚠️  SUPERMEMORY_API_KEY not set - AI memory features will be disabled');
}

export const SUPERMEMORY_CONFIG = {
  // API Configuration
  enabled: hasSuperMemoryKey,
  apiKey: process.env.SUPERMEMORY_API_KEY || '',

  // SuperMemory API endpoints
  baseUrl: process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai/v3',

  // Anthropic proxy URL (routes through SuperMemory)
  anthropicProxyUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',

  // Memory storage settings
  maxMemoriesPerUser: Number.parseInt(process.env.SUPERMEMORY_MAX_MEMORIES || '1000'),
  memoryRetentionDays: Number.parseInt(process.env.SUPERMEMORY_RETENTION_DAYS || '90'),

  // Feature flags
  features: {
    aiChat: true, // Enable memory for AI chat
    campaignGeneration: true, // Enable memory for campaign generation
    contactEnrichment: false, // Disabled for now (less useful)
  },
};

/**
 * Get SuperMemory headers for API requests
 */
export function getSuperMemoryHeaders(userId: string, conversationId?: string) {
  const headers: Record<string, string> = {
    'x-api-key': SUPERMEMORY_CONFIG.apiKey,
    'x-sm-user-id': userId, // Track per-user memory
  };

  // Optional: Track conversation context
  if (conversationId) {
    headers['x-sm-conversation-id'] = conversationId;
  }

  return headers;
}

/**
 * Check if SuperMemory is available
 */
export function isSuperMemoryEnabled(): boolean {
  return SUPERMEMORY_CONFIG.enabled;
}
