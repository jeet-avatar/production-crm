"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findLinkedInCompanyUrl = findLinkedInCompanyUrl;
exports.batchFindLinkedInUrls = batchFindLinkedInUrls;
const axios_1 = __importDefault(require("axios"));
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'fresh-linkedin-profile-data.p.rapidapi.com';
async function findByDomain(domain) {
    try {
        if (!RAPIDAPI_KEY) {
            console.log('   ⚠️  RAPIDAPI_KEY not configured');
            return null;
        }
        const cleanDomain = domain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];
        console.log(`   🔍 Searching LinkedIn by domain: ${cleanDomain}`);
        const response = await axios_1.default.get(`https://${RAPIDAPI_HOST}/get-company-by-domain`, {
            params: { domain: cleanDomain },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 10000
        });
        if (response.data && response.data.data && response.data.data.url) {
            const linkedinUrl = response.data.data.url;
            if (linkedinUrl.includes('linkedin.com/company/')) {
                console.log(`   ✅ Found via domain: ${linkedinUrl}`);
                return {
                    linkedinUrl,
                    confidence: 'high',
                    method: 'domain_lookup'
                };
            }
        }
        return null;
    }
    catch (error) {
        console.log(`   ⚠️  Domain lookup failed: ${error.message}`);
        return null;
    }
}
async function findByCompanyName(companyName) {
    try {
        if (!RAPIDAPI_KEY) {
            return null;
        }
        console.log(`   🔍 Searching LinkedIn by company name: ${companyName}`);
        const response = await axios_1.default.get(`https://${RAPIDAPI_HOST}/search-company`, {
            params: {
                query: companyName,
                page: 1,
                per_page: 5
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            },
            timeout: 10000
        });
        if (response.data && response.data.data && response.data.data.length > 0) {
            const firstResult = response.data.data[0];
            if (firstResult.url && firstResult.url.includes('linkedin.com/company/')) {
                console.log(`   ✅ Found via name search: ${firstResult.url}`);
                const nameSimilarity = firstResult.name?.toLowerCase() === companyName.toLowerCase();
                return {
                    linkedinUrl: firstResult.url,
                    confidence: nameSimilarity ? 'high' : 'medium',
                    method: 'name_search'
                };
            }
        }
        return null;
    }
    catch (error) {
        console.log(`   ⚠️  Name search failed: ${error.message}`);
        return null;
    }
}
function constructLinkedInUrl(companyName) {
    const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const linkedinUrl = `https://www.linkedin.com/company/${slug}`;
    console.log(`   ⚠️  Constructed URL (not verified): ${linkedinUrl}`);
    return {
        linkedinUrl,
        confidence: 'low',
        method: 'constructed'
    };
}
async function findLinkedInCompanyUrl(companyName, website) {
    console.log(`\n🔍 Finding LinkedIn URL for: ${companyName}`);
    if (website) {
        const domainResult = await findByDomain(website);
        if (domainResult) {
            return domainResult;
        }
    }
    const nameResult = await findByCompanyName(companyName);
    if (nameResult && nameResult.confidence !== 'low') {
        return nameResult;
    }
    if (companyName.length > 3 && !['inc', 'llc', 'ltd', 'corp'].includes(companyName.toLowerCase())) {
        console.log(`   ⚠️  Using constructed URL as fallback`);
        const constructedResult = constructLinkedInUrl(companyName);
        return constructedResult;
    }
    console.log(`   ❌ Could not find LinkedIn URL for ${companyName}`);
    return null;
}
async function batchFindLinkedInUrls(companies) {
    const results = new Map();
    console.log(`\n📊 Batch finding LinkedIn URLs for ${companies.length} companies...\n`);
    for (const company of companies) {
        try {
            const result = await findLinkedInCompanyUrl(company.name, company.website);
            if (result) {
                results.set(company.id, result);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.log(`   ❌ Error finding LinkedIn for ${company.name}: ${error.message}`);
        }
    }
    console.log(`\n✅ Found LinkedIn URLs for ${results.size} out of ${companies.length} companies`);
    return results;
}
//# sourceMappingURL=linkedin-url-finder.service.js.map