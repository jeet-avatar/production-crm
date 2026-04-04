export interface ScriptEnhancementRequest {
    script: string;
    industry?: string;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'enthusiastic' | 'authoritative';
    maxLength?: number;
}
export interface ScriptEnhancementResponse {
    enhancedScript: string;
    videoPrompt: string;
    improvements: string[];
    estimatedDuration: number;
}
export declare class ScriptEnhancementService {
    private openai;
    constructor();
    enhanceScript(request: ScriptEnhancementRequest): Promise<ScriptEnhancementResponse>;
    private callGPT4ForEnhancement;
    private generateVideoPrompt;
    private generateSimpleVideoPrompt;
    private analyzeImprovements;
    private estimateDuration;
    isConfigured(): boolean;
}
export declare const scriptEnhancementService: ScriptEnhancementService;
//# sourceMappingURL=scriptEnhancement.service.d.ts.map