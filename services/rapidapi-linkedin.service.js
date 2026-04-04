"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCompanyEmployees = fetchCompanyEmployees;
exports.getPersonProfile = getPersonProfile;
exports.searchPerson = searchPerson;
exports.checkCredits = checkCredits;
exports.fetchEmployeesByUrls = fetchEmployeesByUrls;
const axios_1 = __importDefault(require("axios"));
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'fresh-linkedin-profile-data.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;
async function getCompanyId(linkedinCompanyUrl) {
    try {
        const response = await axios_1.default.get(`${BASE_URL}/get-company-details`, {
            params: {
                linkedin_url: linkedinCompanyUrl
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 30000
        });
        return response.data?.company_id || response.data?.id || null;
    }
    catch (error) {
        console.error('Error getting company ID:', error.message);
        return null;
    }
}
async function fetchCompanyEmployees(linkedinCompanyUrl, options = {}) {
    try {
        if (!RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not configured');
        }
        if (!linkedinCompanyUrl.includes('linkedin.com/company/')) {
            if (linkedinCompanyUrl.includes('linkedin.com/in/')) {
                throw new Error('This appears to be a personal LinkedIn profile URL. Please provide the company LinkedIn URL (e.g., linkedin.com/company/company-name)');
            }
            throw new Error('Invalid LinkedIn company URL. Expected format: linkedin.com/company/company-name');
        }
        console.log(`🔍 Fetching employees from: ${linkedinCompanyUrl}`);
        const companyId = await getCompanyId(linkedinCompanyUrl);
        if (!companyId) {
            const urlMatch = linkedinCompanyUrl.match(/\/company\/([^\/\?]+)/);
            if (urlMatch && urlMatch[1]) {
                console.log(`   Using company identifier from URL: ${urlMatch[1]}`);
                return await fetchEmployeesByIdentifier(urlMatch[1], options.limit || 10);
            }
            throw new Error('Could not determine company ID from LinkedIn URL');
        }
        console.log(`   Company ID: ${companyId}`);
        const employees = [];
        const limit = Math.min(options.limit || 10, 50);
        const response = await axios_1.default.get(`${BASE_URL}/get-company-employees`, {
            params: {
                company_id: companyId,
                page: 1,
                per_page: limit
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 30000
        });
        const employeeData = response.data?.employees || response.data?.data || [];
        if (!employeeData || employeeData.length === 0) {
            console.log('   No employees found');
            return [];
        }
        console.log(`   ✅ Found ${employeeData.length} employees`);
        for (const emp of employeeData) {
            employees.push({
                linkedinUrl: emp.profile_url || `https://linkedin.com/in/${emp.public_identifier}` || '',
                firstName: emp.first_name,
                lastName: emp.last_name,
                fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                title: emp.headline || emp.occupation,
                location: emp.location,
                profilePicture: emp.profile_pic_url
            });
        }
        return employees;
    }
    catch (error) {
        console.error('❌ RapidAPI error:', error.message);
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            if (status === 401 || status === 403) {
                throw new Error('RapidAPI key is invalid or unauthorized');
            }
            else if (status === 429) {
                throw new Error('RapidAPI rate limit exceeded - please try again later');
            }
            else if (status === 404) {
                throw new Error('LinkedIn company not found');
            }
            else {
                throw new Error(`RapidAPI error: ${message}`);
            }
        }
        throw error;
    }
}
async function fetchEmployeesByIdentifier(identifier, limit = 10) {
    try {
        const response = await axios_1.default.get(`${BASE_URL}/get-company-employees-by-url`, {
            params: {
                company_url: `https://linkedin.com/company/${identifier}`,
                limit: limit
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 30000
        });
        const employeeData = response.data?.employees || response.data?.data || [];
        return employeeData.map((emp) => ({
            linkedinUrl: emp.profile_url || `https://linkedin.com/in/${emp.public_identifier}` || '',
            firstName: emp.first_name,
            lastName: emp.last_name,
            fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            title: emp.headline || emp.occupation,
            location: emp.location,
            profilePicture: emp.profile_pic_url
        }));
    }
    catch (error) {
        console.error('Fallback employee fetch failed:', error.message);
        return [];
    }
}
async function getPersonProfile(linkedinProfileUrl) {
    try {
        if (!RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not configured');
        }
        console.log(`🔍 Fetching person profile: ${linkedinProfileUrl}`);
        const response = await axios_1.default.get(`${BASE_URL}/get-linkedin-profile`, {
            params: {
                linkedin_url: linkedinProfileUrl,
                include_skills: 'true'
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 30000
        });
        console.log(`✅ Person profile fetched successfully`);
        return response.data;
    }
    catch (error) {
        console.error('❌ RapidAPI person profile error:', error.message);
        if (error.response) {
            const status = error.response.status;
            if (status === 401 || status === 403) {
                throw new Error('RapidAPI key is invalid');
            }
            else if (status === 429) {
                throw new Error('Rate limit exceeded');
            }
            else if (status === 404) {
                throw new Error('LinkedIn profile not found');
            }
        }
        throw error;
    }
}
async function searchPerson(firstName, lastName, companyName) {
    try {
        if (!RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not configured');
        }
        const response = await axios_1.default.get(`${BASE_URL}/search-people`, {
            params: {
                first_name: firstName,
                last_name: lastName,
                company: companyName
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 30000
        });
        return response.data?.profile_url || response.data?.linkedin_url || null;
    }
    catch (error) {
        console.error('❌ RapidAPI person search error:', error.message);
        return null;
    }
}
async function checkCredits() {
    try {
        return {
            requests: 0,
            limit: 20000
        };
    }
    catch (error) {
        console.error('❌ RapidAPI usage check error:', error.message);
        throw error;
    }
}
async function fetchEmployeesByUrls(employeeUrls) {
    try {
        if (!RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not configured');
        }
        console.log(`🔍 Fetching ${employeeUrls.length} employee profiles...`);
        const employees = [];
        for (const url of employeeUrls) {
            try {
                const profile = await getPersonProfile(url);
                employees.push({
                    linkedinUrl: url,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    fullName: profile.full_name || `${profile.first_name} ${profile.last_name}`,
                    title: profile.headline || profile.occupation,
                    location: profile.location,
                    profilePicture: profile.profile_pic_url
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`   ⚠️  Failed to fetch ${url}:`, error.message);
            }
        }
        console.log(`✅ Fetched ${employees.length} employee profiles`);
        return employees;
    }
    catch (error) {
        console.error('❌ Batch fetch error:', error.message);
        throw error;
    }
}
exports.default = {
    fetchCompanyEmployees,
    getPersonProfile,
    searchPerson,
    checkCredits,
    fetchEmployeesByUrls
};
//# sourceMappingURL=rapidapi-linkedin.service.js.map