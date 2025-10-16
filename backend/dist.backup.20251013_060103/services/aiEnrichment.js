"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichCompanyWithAI = enrichCompanyWithAI;
exports.bulkEnrichCompanies = bulkEnrichCompanies;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
async function enrichCompanyWithAI(companyName, website, linkedin) {
    console.log(`\n🤖 AI Enrichment: ${companyName}`);
    let scrapedContent = '';
    if (linkedin) {
        console.log(`   📡 Scraping LinkedIn: ${linkedin}`);
        scrapedContent += await scrapeLinkedIn(linkedin);
    }
    if (website) {
        console.log(`   📡 Scraping website: ${website}`);
        scrapedContent += await scrapeWebsite(website);
        const teamUrls = [
            '/team', '/about', '/about-us', '/leadership', '/people',
            '/our-team', '/company', '/contact', '/about/team'
        ];
        for (const path of teamUrls) {
            const teamUrl = website.replace(/\/$/, '') + path;
            console.log(`   📡 Checking ${path} page...`);
            const teamContent = await scrapeWebsite(teamUrl);
            if (teamContent.length > 100) {
                scrapedContent += '\n\n--- TEAM PAGE ---\n' + teamContent;
                console.log(`   ✅ Found team page: ${path}`);
                break;
            }
        }
    }
    console.log(`   🧠 Analyzing with Claude AI...`);
    const enrichment = await extractDataWithAI(companyName, scrapedContent);
    console.log(`   ✅ Enrichment complete - Confidence: ${enrichment.confidence}%`);
    return enrichment;
}
async function scrapeWebsite(url) {
    try {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        const response = await axios_1.default.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });
        const $ = cheerio.load(response.data);
        let content = '';
        content += $('meta[name="description"]').attr('content') || '';
        content += ' ' + $('meta[property="og:description"]').attr('content') || '';
        content += ' ' + $('title').text();
        content += ' ' + $('h1, h2, h3').text();
        content += ' ' + $('.about, .about-us, #about').text();
        content += ' ' + $('p').slice(0, 10).text();
        content = content.replace(/\s+/g, ' ').trim();
        return content.substring(0, 3000);
    }
    catch (error) {
        console.log(`   ⚠️  Website scraping failed: ${error.message}`);
        return '';
    }
}
async function scrapeLinkedIn(url) {
    try {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        const response = await axios_1.default.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            },
        });
        const $ = cheerio.load(response.data);
        let content = '';
        content += $('title').text();
        content += ' ' + $('.org-top-card-summary__tagline').text();
        content += ' ' + $('.org-about-us-organization-description__text').text();
        return content.replace(/\s+/g, ' ').trim().substring(0, 2000);
    }
    catch (error) {
        console.log(`   ⚠️  LinkedIn scraping failed: ${error.message}`);
        return '';
    }
}
async function extractDataWithAI(companyName, scrapedContent) {
    try {
        const prompt = `You are a company research analyst. Analyze the following information about "${companyName}" and extract structured data.

SCRAPED CONTENT:
${scrapedContent || 'No content available - use your knowledge'}

INSTRUCTIONS:
1. Determine the company's PRIMARY INDUSTRY (e.g., "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", etc.)
2. Identify the HEADQUARTERS location (City, State/Country format)
3. Extract a brief DESCRIPTION (1-2 sentences)
4. Estimate EMPLOYEE COUNT range (e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+")
5. Find FOUNDED YEAR if mentioned
6. Extract any VIDEO URL (YouTube, Vimeo, Loom, company website videos, etc.)
7. Identify HIRING INTENT (e.g., "Expanding engineering team", "Seeking sales leadership", "Building AI/ML capabilities")
8. Create a concise SALES PITCH (2-3 sentences) explaining why an AI/automation solution would benefit this company
9. Extract MAXIMUM PROFESSIONALS (10-15): Find as many key executives/decision makers as possible with their contact information (Name, Role, Email, Phone, LinkedIn). Prioritize:
   - C-level executives (CEO, CTO, CFO, CMO, COO)
   - VPs (VP of Sales, VP of Marketing, VP of Engineering, etc.)
   - Directors and Department Heads
   - Senior Managers in key departments

   For LinkedIn: Always include full LinkedIn profile URLs in format https://www.linkedin.com/in/firstname-lastname
   For Emails: Use company domain with formats: firstname.lastname@domain.com, first.last@domain.com, flast@domain.com
   For Phones: Include if available from website or LinkedIn

Respond ONLY in this exact JSON format (no other text):
{
  "industry": "Industry name",
  "headquarters": "City, State/Country",
  "description": "Brief description",
  "employeeCount": "Range",
  "foundedYear": year_or_null,
  "videoUrl": "video_url_or_null",
  "hiringIntent": "Hiring intent or null",
  "pitch": "Sales pitch for AI/automation solution",
  "professionals": [
    {
      "firstName": "First",
      "lastName": "Last",
      "role": "Title/Position",
      "email": "email@company.com or null",
      "phone": "phone_number or null",
      "linkedin": "linkedin_url or null"
    }
  ],
  "confidence": confidence_score_0_to_100
}

CRITICAL: Extract MAXIMUM number of professionals (aim for 10-15). Search deeply through:
- Company website "Team", "About Us", "Leadership", "Contact" pages
- LinkedIn company page employees section
- Press releases and news articles mentioning executives
- Any available directory or staff listing

If exact contact info isn't available:
1. Generate likely LinkedIn URLs: https://www.linkedin.com/in/firstname-lastname
2. Generate likely email addresses using company domain
3. Use your knowledge about the company to identify key decision makers

Set confidence based on available data quality.`;
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                industry: result.industry || undefined,
                headquarters: result.headquarters || undefined,
                description: result.description || undefined,
                employeeCount: result.employeeCount || undefined,
                foundedYear: result.foundedYear || undefined,
                videoUrl: result.videoUrl || undefined,
                hiringIntent: result.hiringIntent || undefined,
                pitch: result.pitch || undefined,
                professionals: result.professionals || undefined,
                confidence: result.confidence || 50,
            };
        }
        return {
            confidence: 20,
        };
    }
    catch (error) {
        console.log(`   ❌ AI extraction failed: ${error.message}`);
        return {
            confidence: 0,
        };
    }
}
async function bulkEnrichCompanies(companies) {
    console.log(`\n🚀 Starting bulk enrichment for ${companies.length} companies...\n`);
    const results = new Map();
    for (const company of companies) {
        try {
            const enrichment = await enrichCompanyWithAI(company.name, company.website, company.linkedin);
            results.set(company.id, enrichment);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.log(`   ❌ Failed to enrich ${company.name}: ${error.message}`);
            results.set(company.id, { confidence: 0 });
        }
    }
    console.log(`\n✨ Bulk enrichment complete! Processed ${results.size} companies.\n`);
    return results;
}
//# sourceMappingURL=aiEnrichment.js.map