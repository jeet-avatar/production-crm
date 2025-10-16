declare class GoDaddyService {
    private apiKey;
    private apiSecret;
    private client;
    private baseURL;
    constructor();
    private validateDomain;
    isConfigured(): boolean;
    listDomains(): Promise<{
        success: boolean;
        domains: any;
    }>;
    getDomain(domain: string): Promise<{
        success: boolean;
        domain: any;
    }>;
    getDNSRecords(domain: string, type?: string, name?: string): Promise<{
        success: boolean;
        records: any;
    }>;
    updateDNSRecords(domain: string, records: Array<{
        type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS';
        name: string;
        data: string;
        ttl?: number;
        priority?: number;
        port?: number;
        weight?: number;
    }>): Promise<{
        success: boolean;
        message: string;
    }>;
    addDNSRecord(domain: string, record: {
        type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS';
        name: string;
        data: string;
        ttl?: number;
        priority?: number;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteDNSRecord(domain: string, type: string, name: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setupEmailForwarding(domain: string, fromEmail: string, toEmail: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addSPFRecord(domain: string, spfValue?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addDKIMRecord(domain: string, selector: string, dkimValue: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addDMARCRecord(domain: string, reportEmail: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setupEmailAuthentication(domain: string, config: {
        spf?: string;
        dkim?: {
            selector: string;
            value: string;
        };
        dmarc?: {
            reportEmail: string;
        };
    }): Promise<{
        success: boolean;
        message: string;
        results: any[];
    }>;
    pointDomainToServer(domain: string, ipAddress: string, subdomain?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addCNAMERecord(domain: string, subdomain: string, target: string): Promise<{
        success: boolean;
        message: string;
    }>;
    setupForAWSSES(domain: string, sesConfig: {
        verificationToken: string;
        dkimTokens: string[];
    }): Promise<{
        success: boolean;
        message: string;
        recordsAdded: number;
    }>;
}
export declare const godaddyService: GoDaddyService;
export default godaddyService;
//# sourceMappingURL=godaddy.d.ts.map