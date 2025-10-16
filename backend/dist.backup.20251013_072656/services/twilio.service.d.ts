export declare class TwilioService {
    private client;
    private fromNumber;
    constructor();
    sendSMS(to: string, body: string): Promise<{
        sid: string;
        status: import("twilio/lib/rest/api/v2010/account/message").MessageStatus;
        to: string;
        from: string;
        body: string;
        dateCreated: Date;
        errorCode: number;
        errorMessage: string;
    }>;
    getSMSStatus(messageSid: string): Promise<{
        sid: string;
        status: import("twilio/lib/rest/api/v2010/account/message").MessageStatus;
        to: string;
        from: string;
        errorCode: number;
        errorMessage: string;
        dateCreated: Date;
        dateSent: Date;
        dateUpdated: Date;
    }>;
    getMessageDetails(messageSid: string): Promise<import("twilio/lib/rest/api/v2010/account/message").MessageInstance>;
    validatePhoneNumber(phoneNumber: string): Promise<{
        phoneNumber: string;
        countryCode: string;
        nationalFormat: string;
        valid: boolean;
        error?: undefined;
    } | {
        phoneNumber: string;
        valid: boolean;
        error: any;
        countryCode?: undefined;
        nationalFormat?: undefined;
    }>;
}
//# sourceMappingURL=twilio.service.d.ts.map