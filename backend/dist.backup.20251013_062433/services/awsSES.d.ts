export interface EmailParams {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
    }>;
}
export declare function sendEmailViaSES(params: EmailParams): Promise<{
    success: boolean;
    messageId: string;
}>;
export declare function getSESStatistics(): Promise<import("@aws-sdk/client-ses").SendDataPoint[]>;
export declare function getSESQuota(): Promise<{
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
}>;
//# sourceMappingURL=awsSES.d.ts.map