import { Response } from 'express';
export interface CampaignProgress {
    stepId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    progress?: number;
    message?: string;
    timestamp: string;
}
export interface ActiveCampaign {
    clients: Response[];
    currentStep?: string;
    startedAt: Date;
}
export declare const activeCampaigns: Map<string, ActiveCampaign>;
export declare class CampaignProgressEmitter {
    private campaignId;
    constructor(campaignId: string);
    emitProgress(stepId: string, progress: number, message?: string): Promise<void>;
    emitStepStart(stepId: string, message?: string): Promise<void>;
    emitStepComplete(stepId: string, message?: string): Promise<void>;
    emitError(stepId: string, errorMessage: string): Promise<void>;
    emitComplete(): Promise<void>;
    cleanup(): void;
    static registerClient(campaignId: string, client: Response): void;
    static unregisterClient(campaignId: string, client: Response): void;
}
//# sourceMappingURL=campaign-progress.d.ts.map