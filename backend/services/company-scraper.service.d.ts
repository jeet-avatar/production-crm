interface CompanyData {
    company_name: string;
    company_logo_url: string;
    primary_color: string;
    secondary_color: string;
    company_tagline: string;
    email_address: string;
    phone_number: string;
    office_address: string;
    linkedin_url: string;
    twitter_url: string;
    facebook_url: string;
    instagram_url: string;
    youtube_url: string;
    privacy_policy_url: string;
    terms_url: string;
    office_hours_text: string;
    email_footer_disclaimer: string;
}
export declare class CompanyScraperService {
    private anthropic;
    constructor();
    scrapeCompanyData(domain: string): Promise<Partial<CompanyData>>;
    isValidDomain(domain: string): boolean;
}
export {};
//# sourceMappingURL=company-scraper.service.d.ts.map