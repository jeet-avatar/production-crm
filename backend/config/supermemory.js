"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPERMEMORY_CONFIG = void 0;
exports.getSuperMemoryHeaders = getSuperMemoryHeaders;
exports.isSuperMemoryEnabled = isSuperMemoryEnabled;
const hasSuperMemoryKey = !!process.env.SUPERMEMORY_API_KEY;
if (!hasSuperMemoryKey) {
    console.warn('⚠️  SUPERMEMORY_API_KEY not set - AI memory features will be disabled');
}
exports.SUPERMEMORY_CONFIG = {
    enabled: hasSuperMemoryKey,
    apiKey: process.env.SUPERMEMORY_API_KEY || '',
    baseUrl: process.env.SUPERMEMORY_BASE_URL || 'https://api.supermemory.ai/v3',
    anthropicProxyUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
    maxMemoriesPerUser: Number.parseInt(process.env.SUPERMEMORY_MAX_MEMORIES || '1000'),
    memoryRetentionDays: Number.parseInt(process.env.SUPERMEMORY_RETENTION_DAYS || '90'),
    features: {
        aiChat: true,
        campaignGeneration: true,
        contactEnrichment: false,
    },
};
function getSuperMemoryHeaders(userId, conversationId) {
    const headers = {
        'x-api-key': exports.SUPERMEMORY_CONFIG.apiKey,
        'x-sm-user-id': userId,
    };
    if (conversationId) {
        headers['x-sm-conversation-id'] = conversationId;
    }
    return headers;
}
function isSuperMemoryEnabled() {
    return exports.SUPERMEMORY_CONFIG.enabled;
}
//# sourceMappingURL=supermemory.js.map