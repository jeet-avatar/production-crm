interface EnrichedCompanyData {
    aiDescription: string;
    aiIndustry: string;
    aiKeywords: string[];
    aiCompanyType: string;
    aiTechStack: string[];
    aiRecentNews: string;
    aiEmployeeRange: string;
    aiRevenue: string;
    aiFoundedYear: number | null;
}
export declare class CompanyEnrichmentService {
    enrichCompany(companyName: string, website: string): Promise<EnrichedCompanyData>;
    enrichCompanyBatch(companies: Array<{
        name: string;
        website: string;
    }>): Promise<Map<string, EnrichedCompanyData>>;
}
export declare const companyEnrichmentService: CompanyEnrichmentService;
export {};
//# sourceMappingURL=companyEnrichment.d.ts.map