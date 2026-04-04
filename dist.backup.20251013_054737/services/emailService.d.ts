export declare class EmailService {
    private transporter;
    constructor();
    sendEmail(options: {
        to: string | string[];
        subject: string;
        html: string;
        text?: string;
        from?: string;
    }): Promise<void>;
    sendTemplateEmail(options: {
        to: string | string[];
        templateId: string;
        variables: Record<string, any>;
        subject?: string;
    }): Promise<void>;
    sendBulkEmails(emails: Array<{
        to: string;
        subject: string;
        html: string;
        text?: string;
    }>): Promise<void>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=emailService.d.ts.map