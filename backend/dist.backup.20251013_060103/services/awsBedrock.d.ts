export interface BedrockPrompt {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    modelId?: string;
}
export interface AgentTask {
    type: 'email_generation' | 'content_summarization' | 'lead_scoring' | 'sentiment_analysis' | 'custom';
    input: any;
    context?: any;
}
export declare function invokeClaude(params: BedrockPrompt): Promise<{
    content: any;
    stopReason: any;
    usage: any;
}>;
export declare function invokeClaudeStream(params: BedrockPrompt, onChunk: (chunk: string) => void): Promise<void>;
export declare function generateEmailContent(subject: string, context: any): Promise<any>;
export declare function scoreLead(leadData: any): Promise<any>;
export declare function summarizeContent(content: string, maxLength?: number): Promise<any>;
export declare function analyzeSentiment(text: string): Promise<any>;
export declare function generateReplysuggestions(emailContent: string, context: any): Promise<any>;
export declare function analyzeCampaignPerformance(campaignData: any): Promise<any>;
export declare function executeAgentTask(task: AgentTask): Promise<any>;
//# sourceMappingURL=awsBedrock.d.ts.map