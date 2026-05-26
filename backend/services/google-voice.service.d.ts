export declare class GoogleVoiceService {
    private userGoogleVoiceNumber;
    constructor(userGoogleVoiceNumber?: string);
    generateSMSLink(to: string, body: string): {
        smsLink: string;
        googleMessagesLink: string;
        recipient: string;
        body: string;
        method: string;
        instructions: {
            mobile: string;
            desktop: string;
            setup: string;
        };
        isFree: boolean;
        requiresSetup: boolean;
    };
    generateCallLink(to: string): {
        callLink: string;
        googleVoiceLink: string;
        recipient: string;
        method: string;
        instructions: {
            mobile: string;
            desktop: string;
            setup: string;
        };
        isFree: boolean;
        requiresSetup: boolean;
    };
    createSMSActivity(to: string, body: string): Promise<{
        type: string;
        status: string;
        method: string;
        recipient: string;
        message: string;
        smsLink: string;
        googleMessagesLink: string;
        sentAt: string;
        metadata: {
            service: string;
            cost: number;
            requiresUserAction: boolean;
            instructions: {
                mobile: string;
                desktop: string;
                setup: string;
            };
        };
    }>;
    createCallActivity(to: string): Promise<{
        type: string;
        status: string;
        method: string;
        recipient: string;
        callLink: string;
        googleVoiceLink: string;
        initiatedAt: string;
        metadata: {
            service: string;
            cost: number;
            requiresUserAction: boolean;
            instructions: {
                mobile: string;
                desktop: string;
                setup: string;
            };
        };
    }>;
    validatePhoneNumber(phoneNumber: string): {
        phoneNumber: string;
        valid: boolean;
        format: string;
        error: string;
    };
    getSetupInstructions(): {
        title: string;
        steps: ({
            step: number;
            title: string;
            url: string;
            description: string;
        } | {
            step: number;
            title: string;
            description: string;
            url?: undefined;
        })[];
        benefits: string[];
        vstwilio: {
            googleVoice: {
                cost: string;
                setup: string;
                features: string;
            };
            twilio: {
                cost: string;
                setup: string;
                features: string;
            };
        };
    };
}
//# sourceMappingURL=google-voice.service.d.ts.map