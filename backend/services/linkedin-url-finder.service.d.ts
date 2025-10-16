interface CompanySearchResult {
    linkedinUrl?: string;
    confidence: 'high' | 'medium' | 'low';
    method: string;
}
export declare function findLinkedInCompanyUrl(companyName: string, website?: string): Promise<CompanySearchResult | null>;
export declare function batchFindLinkedInUrls(companies: Array<{
    id: string;
    name: string;
    website?: string;
}>): Promise<Map<string, CompanySearchResult>>;
export {};
//# sourceMappingURL=linkedin-url-finder.service.d.ts.map