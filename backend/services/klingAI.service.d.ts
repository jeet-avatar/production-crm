export type KlingModel = 'kling-v1' | 'kling-v1-6' | 'kling-v2-master' | 'kling-v2-1-master' | 'kling-v2-5-turbo';
export interface KlingVideoConfig {
    prompt: string;
    duration?: 5 | 10;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    model?: KlingModel;
    negativePrompt?: string;
}
export interface KlingVideoResponse {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    progress?: number;
}
export declare class KlingAIService {
    private accessKey;
    private secretKey;
    private baseURL;
    constructor();
    private generateJWT;
    generateVideo(config: KlingVideoConfig): Promise<string>;
    private createTask;
    private pollTask;
    getTaskStatus(taskId: string): Promise<KlingVideoResponse>;
    private mapStatus;
    private calculateProgress;
    isConfigured(): boolean;
}
export declare const klingAIService: KlingAIService;
//# sourceMappingURL=klingAI.service.d.ts.map