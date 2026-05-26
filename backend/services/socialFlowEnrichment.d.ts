export interface SocialFlowEnrichmentData {
    creditRating?: {
        score?: string;
        rating?: string;
        confidence?: string;
    };
    socialMedia?: {
        twitter?: string;
        facebook?: string;
        linkedin?: string;
        youtube?: string;
        instagram?: string;
    };
    technographics?: string[];
    revenue?: string;
    funding?: string;
    growth?: string;
    employees?: string;
    enrichmentStatus?: {
        creditRating?: {
            success: boolean;
            error?: string;
        };
        socialMedia?: {
            success: boolean;
            error?: string;
        };
        aiAnalysis?: {
            success: boolean;
            error?: string;
        };
    };
}
export declare function enrichCompanyWithSocialFlow(companyName: string, linkedinUrl?: string): Promise<SocialFlowEnrichmentData>;
//# sourceMappingURL=socialFlowEnrichment.d.ts.map