interface EnrichedEmployee {
    linkedinUrl: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    title?: string;
    location?: string;
    profilePicture?: string;
}
export declare function fetchCompanyEmployees(linkedinCompanyUrl: string, options?: {
    limit?: number;
    enrichProfiles?: boolean;
    useCache?: boolean;
}): Promise<EnrichedEmployee[]>;
export declare function getCompanyProfile(linkedinCompanyUrl: string): Promise<any>;
export declare function searchPerson(firstName: string, lastName: string, companyName?: string): Promise<string | null>;
export declare function getPersonProfile(linkedinProfileUrl: string): Promise<any>;
export declare function checkCredits(): Promise<{
    credits: number;
    plan: string;
}>;
declare const _default: {
    fetchCompanyEmployees: typeof fetchCompanyEmployees;
    getCompanyProfile: typeof getCompanyProfile;
    searchPerson: typeof searchPerson;
    getPersonProfile: typeof getPersonProfile;
    checkCredits: typeof checkCredits;
};
export default _default;
//# sourceMappingURL=proxycurl.service.d.ts.map