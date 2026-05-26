interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
interface OrchestrationContext {
    userId: string;
    conversationHistory: ChatMessage[];
    currentTask?: string;
    pendingApprovals?: any[];
    metadata?: Record<string, any>;
}
interface OrchestrationResponse {
    message: string;
    requiresApproval: boolean;
    approvalData?: any;
    suggestedActions?: string[];
    completed?: boolean;
}
export declare class AIOrchestrator {
    processRequest(userMessage: string, context: OrchestrationContext): Promise<OrchestrationResponse>;
    executeApprovedAction(action: string, data: any, userId: string): Promise<{
        success: boolean;
        result: any;
    }>;
    private buildSystemPrompt;
    private callClaude;
    private parseOrchestrationResponse;
    private getCRMContext;
    private createCampaign;
    private sendEmail;
    private createSegment;
    private scheduleCampaign;
}
export declare const aiOrchestrator: AIOrchestrator;
export {};
//# sourceMappingURL=ai-orchestrator.service.d.ts.map