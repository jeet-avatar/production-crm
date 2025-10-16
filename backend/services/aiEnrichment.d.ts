interface CompanyProfessional {
    firstName: string;
    lastName: string;
    role: string;
    email?: string;
    phone?: string;
    linkedin?: string;
}
interface CompanyEnrichmentResult {
    industry?: string;
    headquarters?: string;
    description?: string;
    employeeCount?: string;
    foundedYear?: number;
    videoUrl?: string;
    hiringIntent?: string;
    pitch?: string;
    professionals?: CompanyProfessional[];
    discoveredWebsite?: string;
    discoveredLinkedIn?: string;
    confidence: number;
}
interface ContactEnrichmentResult {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    linkedin?: string;
    company?: string;
    location?: string;
    bio?: string;
    skills?: string[];
    experience?: string[];
    education?: string[];
    currentCompany?: string;
    currentRole?: string;
    confidence: number;
}
export declare function enrichCompanyWithAI(companyName: string, website?: string, linkedin?: string, location?: string): Promise<CompanyEnrichmentResult>;
export declare function bulkEnrichCompanies(companies: Array<{
    id: string;
    name: string;
    website?: string;
    linkedin?: string;
}>): Promise<Map<string, CompanyEnrichmentResult>>;
export declare function enrichContactWithAI(contactEmail?: string, contactName?: string, linkedinUrl?: string): Promise<ContactEnrichmentResult>;
export {};
//# sourceMappingURL=aiEnrichment.d.ts.map