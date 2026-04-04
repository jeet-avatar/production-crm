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
export declare function getPersonProfile(linkedinProfileUrl: string): Promise<any>;
export declare function searchPerson(firstName: string, lastName: string, companyName?: string): Promise<string | null>;
export declare function checkCredits(): Promise<{
    requests: number;
    limit: number;
}>;
export declare function fetchEmployeesByUrls(employeeUrls: string[]): Promise<EnrichedEmployee[]>;
declare const _default: {
    fetchCompanyEmployees: typeof fetchCompanyEmployees;
    getPersonProfile: typeof getPersonProfile;
    searchPerson: typeof searchPerson;
    checkCredits: typeof checkCredits;
    fetchEmployeesByUrls: typeof fetchEmployeesByUrls;
};
export default _default;
//# sourceMappingURL=rapidapi-linkedin.service.d.ts.map