export declare class DefaultTemplateService {
    static getDefaultTemplate(): {
        name: string;
        subject: string;
        templateType: string;
        fromEmail: string;
        fromName: string;
        isActive: boolean;
        variables: string[];
        htmlContent: string;
        textContent: string;
    };
    static ensureDefaultTemplate(userId: string): Promise<void>;
    static seedAllUsers(): Promise<{
        created: number;
        skipped: number;
    }>;
}
//# sourceMappingURL=default-template.service.d.ts.map