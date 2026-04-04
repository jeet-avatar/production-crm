export interface GeneratedEmail {
    email: string;
    pattern: string;
    confidence: 'high' | 'medium' | 'low';
}
export declare function extractDomain(websiteOrName: string): string | null;
export declare function generateEmailPatterns(firstName: string, lastName: string, domain: string): GeneratedEmail[];
export declare function generateBestGuessEmail(firstName: string, lastName: string, domain: string): GeneratedEmail | null;
export declare function isValidEmailFormat(email: string): boolean;
export declare function learnDomainFromContacts(prisma: any, companyId: string): Promise<string | null>;
//# sourceMappingURL=emailPatternGenerator.d.ts.map