"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyEnrichmentService = exports.CompanyEnrichmentService = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const webScraper_1 = require("./webScraper");
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
class CompanyEnrichmentService {
    async enrichCompany(companyName, website) {
        try {
            console.log(`🤖 Enriching company: ${companyName} - ${website}`);
            const scrapedData = await webScraper_1.webScraperService.scrapeWebsite(website);
            const prompt = `Analyze this company website data and extract key business intelligence:

Company Name: ${companyName}
Website: ${website}

Scraped Data:
Title: ${scrapedData.title}
Description: ${scrapedData.description}
Content Preview: ${scrapedData.content.substring(0, 2000)}
Keywords: ${scrapedData.keywords.join(', ')}
Main Headings: ${scrapedData.headings.slice(0, 10).join(', ')}

Please provide a JSON response with the following fields:
{
  "aiDescription": "Clear 2-3 sentence description of what the company does",
  "aiIndustry": "Primary industry (e.g., SaaS, Manufacturing, Healthcare, etc.)",
  "aiKeywords": ["keyword1", "keyword2", ...] (5-10 relevant business keywords),
  "aiCompanyType": "B2B, B2C, Enterprise, SMB, or Startup",
  "aiTechStack": ["tech1", "tech2", ...] (technologies mentioned or likely used),
  "aiRecentNews": "Summary of recent news, achievements, or updates if mentioned",
  "aiEmployeeRange": "Estimated employee range (e.g., 1-10, 11-50, 51-200, 201-500, 500+)",
  "aiRevenue": "Estimated revenue if mentioned or 'Unknown'",
  "aiFoundedYear": Founded year as number or null if not found
}

Only return valid JSON, no additional text.`;
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                messages: [{
                        role: 'user',
                        content: prompt
                    }]
            });
            const aiResponse = message.content[0].type === 'text'
                ? message.content[0].text
                : '';
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI did not return valid JSON');
            }
            const enrichedData = JSON.parse(jsonMatch[0]);
            console.log(`✅ Successfully enriched: ${companyName}`);
            return enrichedData;
        }
        catch (error) {
            console.error(`❌ Failed to enrich company ${companyName}:`, error.message);
            throw error;
        }
    }
    async enrichCompanyBatch(companies) {
        const results = new Map();
        for (const company of companies) {
            try {
                const enrichedData = await this.enrichCompany(company.name, company.website);
                results.set(company.name, enrichedData);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`Failed to enrich ${company.name}:`, error.message);
            }
        }
        return results;
    }
}
exports.CompanyEnrichmentService = CompanyEnrichmentService;
exports.companyEnrichmentService = new CompanyEnrichmentService();
//# sourceMappingURL=companyEnrichment.js.map