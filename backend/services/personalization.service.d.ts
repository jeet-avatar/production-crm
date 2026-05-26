export interface PersonalizationContext {
    contact: {
        firstName: string;
        lastName: string;
        email: string;
        position?: string | null;
        role?: string | null;
    };
    company: {
        id: string;
        name: string;
        industry?: string | null;
        size?: string | null;
        location?: string | null;
        website?: string | null;
        intent?: string | null;
        hiringInfo?: string | null;
        jobPostings?: string | null;
        hiringIntent?: string | null;
        aiDescription?: string | null;
        aiIndustry?: string | null;
        aiRecentNews?: string | null;
        techStack?: string | null;
    };
    campaignType: 'video_script' | 'email_subject' | 'email_body' | 'follow_up';
    userCompany?: string;
}
export interface PersonalizationResult {
    content: string;
    confidence: number;
    personalizedElements: string[];
    usedSignals: string[];
    fallbackUsed: boolean;
}
export declare class PersonalizationService {
    generateVideoScript(contactId: string, companyId: string, userCompanyName?: string): Promise<PersonalizationResult>;
    generateEmailSubject(contactId: string, companyId: string, userCompanyName?: string): Promise<PersonalizationResult>;
    generateEmailBody(contactId: string, companyId: string, userCompanyName?: string): Promise<PersonalizationResult>;
    private buildContext;
    private generateContent;
    private buildSystemPrompt;
    private buildUserPrompt;
    private calculateConfidence;
    private generateFallbackContent;
}
export declare const personalizationService: PersonalizationService;
//# sourceMappingURL=personalization.service.d.ts.map