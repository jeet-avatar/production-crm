export interface LongCatVideoConfig {
    prompt: string;
    duration?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    seed?: number;
    guidanceScale?: number;
    numInferenceSteps?: number;
}
export interface LongCatVideoResponse {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    progress?: number;
}
export declare class LongCatVideoService {
    private serverUrl;
    private isAvailable;
    constructor();
    private checkAvailability;
    generateVideo(config: LongCatVideoConfig): Promise<string>;
    private pollTask;
    generateImageToVideo(imageUrl: string, prompt: string): Promise<string>;
    isConfigured(): boolean;
    getInfo(): {
        service: string;
        serverUrl: string;
        isAvailable: boolean;
        isFree: boolean;
        openSource: boolean;
        license: string;
        features: string[];
        quality: string;
    };
}
export declare const longcatVideoService: LongCatVideoService;
//# sourceMappingURL=longcatVideo.service.d.ts.map