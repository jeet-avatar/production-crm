export interface SVDVideoConfig {
    prompt: string;
    duration?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    numFrames?: number;
    fps?: number;
}
export interface SVDVideoResponse {
    taskId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    progress?: number;
}
export declare class StableVideoDiffusionService {
    private apiKey;
    private baseURL;
    private modelId;
    private textToVideoModel;
    constructor();
    generateVideo(config: SVDVideoConfig): Promise<string>;
    private callTextToVideoAPI;
    private uploadVideo;
    isConfigured(): boolean;
    getInfo(): {
        service: string;
        model: string;
        isConfigured: boolean;
        isFree: boolean;
        openSource: boolean;
    };
}
export declare const stableVideoDiffusionService: StableVideoDiffusionService;
//# sourceMappingURL=stableVideoDiffusion.service.d.ts.map