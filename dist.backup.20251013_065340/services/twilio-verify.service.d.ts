export declare class TwilioVerifyService {
    private client;
    private verifySid;
    constructor();
    sendVerificationCode(phoneNumber: string, channel?: 'sms' | 'call'): Promise<{
        success: boolean;
        status: string;
        to: string;
        channel: import("twilio/lib/rest/verify/v2/service/verification").VerificationChannel;
        valid: boolean;
    }>;
    verifyCode(phoneNumber: string, code: string): Promise<{
        success: boolean;
        status: string;
        to: string;
        valid: boolean;
    }>;
    sendVerificationCall(phoneNumber: string): Promise<{
        success: boolean;
        status: string;
        to: string;
        channel: import("twilio/lib/rest/verify/v2/service/verification").VerificationChannel;
        valid: boolean;
    }>;
}
//# sourceMappingURL=twilio-verify.service.d.ts.map