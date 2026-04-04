import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
export declare function getAnthropicClient(): Anthropic;
export declare function getAnthropicClientWithMemory(userId: string, conversationId?: string): Anthropic;
export declare function getOpenAIClient(): OpenAI | null;
interface CallClaudeOptions {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    strategy?: 'chat' | 'campaign' | 'enrichment' | 'emailTemplate';
}
export declare function callClaudeWithFallback(options: CallClaudeOptions): Promise<string>;
export declare function callClaudeWithHistory(messages: Array<{
    role: 'user' | 'assistant';
    content: string;
}>, systemPrompt?: string, maxTokens?: number, strategy?: 'chat' | 'campaign' | 'enrichment' | 'emailTemplate'): Promise<string>;
export {};
//# sourceMappingURL=ai-helper.d.ts.map