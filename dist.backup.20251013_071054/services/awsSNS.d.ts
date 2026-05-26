export interface SMSParams {
    phoneNumber: string;
    message: string;
    senderID?: string;
    smsType?: 'Promotional' | 'Transactional';
}
export declare function sendSMS(params: SMSParams): Promise<{
    success: boolean;
    messageId: string;
}>;
export declare function sendBulkSMS(phoneNumbers: string[], message: string, smsType?: 'Promotional' | 'Transactional'): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: PromiseSettledResult<{
        success: boolean;
        messageId: string;
    }>[];
}>;
export declare function setSMSAttributes(attributes: Record<string, string>): Promise<{
    success: boolean;
}>;
export declare function getSMSAttributes(): Promise<Record<string, string>>;
export declare function publishToTopic(topicArn: string, message: string, subject?: string): Promise<{
    success: boolean;
    messageId: string;
}>;
//# sourceMappingURL=awsSNS.d.ts.map