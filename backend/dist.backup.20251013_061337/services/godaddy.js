"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.godaddyService = void 0;
const axios_1 = __importDefault(require("axios"));
class GoDaddyService {
    constructor() {
        this.baseURL = 'https://api.godaddy.com/v1';
        this.apiKey = process.env.GODADDY_API_KEY || '';
        this.apiSecret = process.env.GODADDY_API_SECRET || '';
        if (!this.apiKey || !this.apiSecret) {
            console.warn('GoDaddy API credentials not configured');
        }
        this.client = axios_1.default.create({
            baseURL: this.baseURL,
            headers: {
                Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
                'Content-Type': 'application/json',
            },
        });
    }
    validateDomain(domain) {
        if (!domain || typeof domain !== 'string') {
            throw new Error('Invalid domain: domain must be a non-empty string');
        }
        const trimmedDomain = domain.trim();
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(trimmedDomain)) {
            throw new Error('Invalid domain: domain contains invalid characters or format');
        }
        const lowercaseDomain = trimmedDomain.toLowerCase();
        const blockedPatterns = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '169.254',
            '10.',
            '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
            '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
            '192.168.',
        ];
        for (const pattern of blockedPatterns) {
            if (lowercaseDomain.includes(pattern)) {
                throw new Error('Invalid domain: private or local domains are not allowed');
            }
        }
        if (trimmedDomain.includes('://') || trimmedDomain.includes('/')) {
            throw new Error('Invalid domain: domain should not contain URL components');
        }
    }
    isConfigured() {
        return !!(this.apiKey && this.apiSecret);
    }
    async listDomains() {
        try {
            const response = await this.client.get('/domains');
            return {
                success: true,
                domains: response.data,
            };
        }
        catch (error) {
            console.error('GoDaddy List Domains Error:', error.response?.data || error.message);
            throw new Error(`Failed to list domains: ${error.response?.data?.message || error.message}`);
        }
    }
    async getDomain(domain) {
        this.validateDomain(domain);
        try {
            const response = await this.client.get(`/domains/${domain}`);
            return {
                success: true,
                domain: response.data,
            };
        }
        catch (error) {
            console.error('GoDaddy Get Domain Error:', error.response?.data || error.message);
            throw new Error(`Failed to get domain: ${error.response?.data?.message || error.message}`);
        }
    }
    async getDNSRecords(domain, type, name) {
        this.validateDomain(domain);
        try {
            let url = `/domains/${domain}/records`;
            if (type && name) {
                url += `/${type}/${name}`;
            }
            else if (type) {
                url += `/${type}`;
            }
            const response = await this.client.get(url);
            return {
                success: true,
                records: response.data,
            };
        }
        catch (error) {
            console.error('GoDaddy Get DNS Records Error:', error.response?.data || error.message);
            throw new Error(`Failed to get DNS records: ${error.response?.data?.message || error.message}`);
        }
    }
    async updateDNSRecords(domain, records) {
        this.validateDomain(domain);
        try {
            const response = await this.client.put(`/domains/${domain}/records`, records);
            return {
                success: true,
                message: 'DNS records updated successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Update DNS Records Error:', error.response?.data || error.message);
            throw new Error(`Failed to update DNS records: ${error.response?.data?.message || error.message}`);
        }
    }
    async addDNSRecord(domain, record) {
        this.validateDomain(domain);
        try {
            const response = await this.client.patch(`/domains/${domain}/records`, [record]);
            return {
                success: true,
                message: 'DNS record added successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Add DNS Record Error:', error.response?.data || error.message);
            throw new Error(`Failed to add DNS record: ${error.response?.data?.message || error.message}`);
        }
    }
    async deleteDNSRecord(domain, type, name) {
        this.validateDomain(domain);
        try {
            await this.client.delete(`/domains/${domain}/records/${type}/${name}`);
            return {
                success: true,
                message: 'DNS record deleted successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Delete DNS Record Error:', error.response?.data || error.message);
            throw new Error(`Failed to delete DNS record: ${error.response?.data?.message || error.message}`);
        }
    }
    async setupEmailForwarding(domain, fromEmail, toEmail) {
        this.validateDomain(domain);
        try {
            const mxRecords = [
                {
                    type: 'MX',
                    name: '@',
                    data: 'smtp.secureserver.net',
                    priority: 0,
                    ttl: 3600,
                },
                {
                    type: 'MX',
                    name: '@',
                    data: 'mailstore1.secureserver.net',
                    priority: 10,
                    ttl: 3600,
                },
            ];
            await this.updateDNSRecords(domain, mxRecords);
            return {
                success: true,
                message: 'Email forwarding MX records configured',
            };
        }
        catch (error) {
            console.error('GoDaddy Email Forwarding Setup Error:', error.response?.data || error.message);
            throw new Error(`Failed to setup email forwarding: ${error.response?.data?.message || error.message}`);
        }
    }
    async addSPFRecord(domain, spfValue) {
        this.validateDomain(domain);
        const defaultSPF = spfValue || 'v=spf1 include:_spf.google.com include:amazonses.com ~all';
        try {
            await this.addDNSRecord(domain, {
                type: 'TXT',
                name: '@',
                data: defaultSPF,
                ttl: 3600,
            });
            return {
                success: true,
                message: 'SPF record added successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Add SPF Record Error:', error.response?.data || error.message);
            throw new Error(`Failed to add SPF record: ${error.response?.data?.message || error.message}`);
        }
    }
    async addDKIMRecord(domain, selector, dkimValue) {
        this.validateDomain(domain);
        try {
            await this.addDNSRecord(domain, {
                type: 'TXT',
                name: `${selector}._domainkey`,
                data: dkimValue,
                ttl: 3600,
            });
            return {
                success: true,
                message: 'DKIM record added successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Add DKIM Record Error:', error.response?.data || error.message);
            throw new Error(`Failed to add DKIM record: ${error.response?.data?.message || error.message}`);
        }
    }
    async addDMARCRecord(domain, reportEmail) {
        this.validateDomain(domain);
        const dmarcValue = `v=DMARC1; p=quarantine; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; fo=1`;
        try {
            await this.addDNSRecord(domain, {
                type: 'TXT',
                name: '_dmarc',
                data: dmarcValue,
                ttl: 3600,
            });
            return {
                success: true,
                message: 'DMARC record added successfully',
            };
        }
        catch (error) {
            console.error('GoDaddy Add DMARC Record Error:', error.response?.data || error.message);
            throw new Error(`Failed to add DMARC record: ${error.response?.data?.message || error.message}`);
        }
    }
    async setupEmailAuthentication(domain, config) {
        this.validateDomain(domain);
        const results = [];
        try {
            if (config.spf !== undefined) {
                const spfResult = await this.addSPFRecord(domain, config.spf);
                results.push({ type: 'SPF', ...spfResult });
            }
            if (config.dkim) {
                const dkimResult = await this.addDKIMRecord(domain, config.dkim.selector, config.dkim.value);
                results.push({ type: 'DKIM', ...dkimResult });
            }
            if (config.dmarc) {
                const dmarcResult = await this.addDMARCRecord(domain, config.dmarc.reportEmail);
                results.push({ type: 'DMARC', ...dmarcResult });
            }
            return {
                success: true,
                message: 'Email authentication records configured',
                results,
            };
        }
        catch (error) {
            console.error('GoDaddy Email Authentication Setup Error:', error);
            throw error;
        }
    }
    async pointDomainToServer(domain, ipAddress, subdomain) {
        this.validateDomain(domain);
        try {
            const recordName = subdomain || '@';
            await this.addDNSRecord(domain, {
                type: 'A',
                name: recordName,
                data: ipAddress,
                ttl: 600,
            });
            return {
                success: true,
                message: `Domain ${subdomain ? subdomain + '.' : ''}${domain} pointed to ${ipAddress}`,
            };
        }
        catch (error) {
            console.error('GoDaddy Point Domain Error:', error.response?.data || error.message);
            throw new Error(`Failed to point domain: ${error.response?.data?.message || error.message}`);
        }
    }
    async addCNAMERecord(domain, subdomain, target) {
        this.validateDomain(domain);
        try {
            await this.addDNSRecord(domain, {
                type: 'CNAME',
                name: subdomain,
                data: target,
                ttl: 600,
            });
            return {
                success: true,
                message: `CNAME record added: ${subdomain}.${domain} → ${target}`,
            };
        }
        catch (error) {
            console.error('GoDaddy Add CNAME Error:', error.response?.data || error.message);
            throw new Error(`Failed to add CNAME record: ${error.response?.data?.message || error.message}`);
        }
    }
    async setupForAWSSES(domain, sesConfig) {
        this.validateDomain(domain);
        const records = [];
        records.push({
            type: 'TXT',
            name: '_amazonses',
            data: sesConfig.verificationToken,
            ttl: 3600,
        });
        sesConfig.dkimTokens.forEach((token, index) => {
            records.push({
                type: 'CNAME',
                name: `${token}._domainkey`,
                data: `${token}.dkim.amazonses.com`,
                ttl: 3600,
            });
        });
        try {
            await this.updateDNSRecords(domain, records);
            return {
                success: true,
                message: 'Domain configured for AWS SES',
                recordsAdded: records.length,
            };
        }
        catch (error) {
            console.error('GoDaddy AWS SES Setup Error:', error.response?.data || error.message);
            throw new Error(`Failed to setup AWS SES: ${error.response?.data?.message || error.message}`);
        }
    }
}
exports.godaddyService = new GoDaddyService();
exports.default = exports.godaddyService;
//# sourceMappingURL=godaddy.js.map