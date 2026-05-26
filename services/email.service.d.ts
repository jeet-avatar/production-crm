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
    static generateOTP(): string;
    static getOTPExpiry(): Date;
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
    sendVerificationEmail(email: string, firstName: string, otp: string): Promise<boolean>;
    sendPasswordResetEmail(email: string, firstName: string, resetUrl: string, token: string): Promise<boolean>;
}
//# sourceMappingURL=email.service.d.ts.map