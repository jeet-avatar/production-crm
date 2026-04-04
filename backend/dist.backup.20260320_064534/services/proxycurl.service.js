"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCompanyEmployees = fetchCompanyEmployees;
exports.getCompanyProfile = getCompanyProfile;
exports.searchPerson = searchPerson;
exports.getPersonProfile = getPersonProfile;
exports.checkCredits = checkCredits;
const axios_1 = __importDefault(require("axios"));
const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY || '';
const PROXYCURL_BASE_URL = 'https://nubela.co/proxycurl/api/v2';
async function fetchCompanyEmployees(linkedinCompanyUrl, options = {}) {
    try {
        if (!PROXYCURL_API_KEY) {
            throw new Error('PROXYCURL_API_KEY not configured');
        }
        if (!linkedinCompanyUrl.includes('linkedin.com/company/')) {
            throw new Error('Invalid LinkedIn company URL');
        }
        console.log(`🔍 Fetching employees from: ${linkedinCompanyUrl}`);
        const params = {
            url: linkedinCompanyUrl,
            country: 'US,GB,CA,AU,IE,NZ,SG,IL',
            enrich_profiles: options.enrichProfiles ? 'enrich' : 'skip',
            page_size: options.limit || 10,
            employment_status: 'current',
        };
        if (options.useCache !== undefined) {
            params.use_cache = options.useCache ? 'if-present' : 'if-recent';
        }
        const response = await axios_1.default.get(`${PROXYCURL_BASE_URL}/linkedin/company/employees/`, {
            params,
            headers: {
                'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        const data = response.data;
        if (!data.employees || data.employees.length === 0) {
            console.log('⚠️  No employees found');
            return [];
        }
        console.log(`✅ Found ${data.employees.length} employees`);
        const employees = data.employees.map((emp) => ({
            linkedinUrl: emp.profile_url || emp.linkedin_profile_url || '',
            firstName: emp.first_name,
            lastName: emp.last_name,
            fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            title: emp.title,
            location: emp.location,
            profilePicture: emp.profile_pic_url,
        }));
        return employees;
    }
    catch (error) {
        console.error('❌ Proxycurl API error:', error.message);
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            if (status === 401) {
                throw new Error('Proxycurl API key is invalid');
            }
            else if (status === 402) {
                throw new Error('Proxycurl credits exhausted - please upgrade plan');
            }
            else if (status === 404) {
                throw new Error('LinkedIn company not found or not accessible');
            }
            else if (status === 429) {
                throw new Error('Proxycurl rate limit exceeded - please try again later');
            }
            else {
                throw new Error(`Proxycurl API error: ${message}`);
            }
        }
        throw error;
    }
}
async function getCompanyProfile(linkedinCompanyUrl) {
    try {
        if (!PROXYCURL_API_KEY) {
            throw new Error('PROXYCURL_API_KEY not configured');
        }
        console.log(`🔍 Fetching company profile: ${linkedinCompanyUrl}`);
        const response = await axios_1.default.get(`${PROXYCURL_BASE_URL}/linkedin/company`, {
            params: {
                url: linkedinCompanyUrl,
            },
            headers: {
                'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        console.log(`✅ Company profile fetched successfully`);
        return response.data;
    }
    catch (error) {
        console.error('❌ Proxycurl company profile error:', error.message);
        throw error;
    }
}
async function searchPerson(firstName, lastName, companyName) {
    try {
        if (!PROXYCURL_API_KEY) {
            throw new Error('PROXYCURL_API_KEY not configured');
        }
        const params = {
            first_name: firstName,
            last_name: lastName,
            enrich_profile: 'skip',
        };
        if (companyName) {
            params.current_company_name = companyName;
        }
        const response = await axios_1.default.get(`${PROXYCURL_BASE_URL}/linkedin/profile/resolve`, {
            params,
            headers: {
                'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        return response.data.linkedin_profile_url || null;
    }
    catch (error) {
        console.error('❌ Proxycurl person search error:', error.message);
        return null;
    }
}
async function getPersonProfile(linkedinProfileUrl) {
    try {
        if (!PROXYCURL_API_KEY) {
            throw new Error('PROXYCURL_API_KEY not configured');
        }
        console.log(`🔍 Fetching person profile: ${linkedinProfileUrl}`);
        const response = await axios_1.default.get(`${PROXYCURL_BASE_URL}/linkedin/profile`, {
            params: {
                url: linkedinProfileUrl,
            },
            headers: {
                'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        console.log(`✅ Person profile fetched successfully`);
        return response.data;
    }
    catch (error) {
        console.error('❌ Proxycurl person profile error:', error.message);
        throw error;
    }
}
async function checkCredits() {
    try {
        if (!PROXYCURL_API_KEY) {
            throw new Error('PROXYCURL_API_KEY not configured');
        }
        const response = await axios_1.default.get(`${PROXYCURL_BASE_URL}/credit-balance`, {
            headers: {
                'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
            },
            timeout: 10000,
        });
        return {
            credits: response.data.credit_balance || 0,
            plan: response.data.plan_name || 'unknown',
        };
    }
    catch (error) {
        console.error('❌ Proxycurl credits check error:', error.message);
        throw error;
    }
}
exports.default = {
    fetchCompanyEmployees,
    getCompanyProfile,
    searchPerson,
    getPersonProfile,
    checkCredits,
};
//# sourceMappingURL=proxycurl.service.js.map