export declare const ELEVENLABS_VOICES: string[];
export declare function validateVoiceId(voiceId: string): Promise<{
    valid: boolean;
    error?: string;
    details?: string;
}>;
export declare function validateEmailTemplate(templateId: string): Promise<{
    valid: boolean;
    template?: any;
    error?: string;
    details?: string;
}>;
export declare function sanitizeForVoiceover(text: string): string;
export declare function validateNarrationScript(script: string): {
    valid: boolean;
    sanitized: string;
    error?: string;
    details?: string;
};
export declare function logCampaignFailure(campaignId: string, step: string, error: Error, additionalData?: any): Promise<void>;
export declare function validateVideoCampaignInput(input: {
    voiceId?: string;
    templateId?: string;
    narrationScript?: string;
    companyName?: string;
}): Promise<{
    valid: boolean;
    errors: Array<{
        field: string;
        message: string;
        details: string;
    }>;
    warnings: Array<{
        field: string;
        message: string;
    }>;
    sanitizedScript?: string;
}>;
declare const _default: {
    validateVoiceId: typeof validateVoiceId;
    validateEmailTemplate: typeof validateEmailTemplate;
    sanitizeForVoiceover: typeof sanitizeForVoiceover;
    validateNarrationScript: typeof validateNarrationScript;
    logCampaignFailure: typeof logCampaignFailure;
    validateVideoCampaignInput: typeof validateVideoCampaignInput;
    ELEVENLABS_VOICES: string[];
};
export default _default;
//# sourceMappingURL=videoValidation.d.ts.map