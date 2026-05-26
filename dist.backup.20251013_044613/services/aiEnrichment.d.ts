interface CompanyEnrichmentResult {
    industry?: string;
    headquarters?: string;
    description?: string;
    employeeCount?: string;
    foundedYear?: number;
    videoUrl?: string;
    hiringIntent?: string;
    pitch?: string;
    confidence: number;
}
export declare function enrichCompanyWithAI(companyName: string, website?: string, linkedin?: string): Promise<CompanyEnrichmentResult>;
export declare function bulkEnrichCompanies(companies: Array<{
    id: string;
    name: string;
    website?: string;
    linkedin?: string;
}>): Promise<Map<string, CompanyEnrichmentResult>>;
export {};
//# sourceMappingURL=aiEnrichment.d.ts.map