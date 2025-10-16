export interface EmailOptions {
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content?: string | Buffer;
        path?: string;
    }>;
}
export declare class EmailService {
    private transporter;
    constructor();
    sendEmail(options: EmailOptions): Promise<{
        messageId: any;
        accepted: any;
        rejected: any;
        response: any;
        envelope: any;
    }>;
    sendTemplatedEmail(options: EmailOptions, templateVariables: Record<string, string>): Promise<{
        messageId: any;
        accepted: any;
        rejected: any;
        response: any;
        envelope: any;
    }>;
    verifyConnection(): Promise<boolean>;
    private stripHtml;
    static generateHtmlTemplate(body: string, title?: string): string;
}
//# sourceMappingURL=email.service.d.ts.map