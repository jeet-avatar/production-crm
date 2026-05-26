"use strict";
/**
 * SocialFlow Enrichment Service
 * Integrates with internal SocialFlow API for company credit rating lookup
 * API Endpoint: http://13.51.109.41:8000/api/company-analysis/lookup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichCompanyWithSocialFlow = enrichCompanyWithSocialFlow;
const logger_1 = require("../utils/logger");
const SOCIALFLOW_API_URL = process.env.SOCIALFLOW_API_URL || 'http://13.51.109.41:8000';
const USE_MOCK_DATA = process.env.SOCIALFLOW_USE_MOCK === 'true';
/**
 * Generate mock enrichment data for testing when API is unavailable
 */
function generateMockEnrichmentData(companyName) {
    logger_1.logger.info(`Using mock data for: ${companyName}`);
    return {
        creditRating: {
            score: 'A',
            rating: 'Excellent',
            confidence: 'High',
        },
        socialMedia: {
            twitter: `https://twitter.com/${companyName.toLowerCase().replace(/\s+/g, '')}`,
            facebook: `https://facebook.com/${companyName.toLowerCase().replace(/\s+/g, '')}`,
            linkedin: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
            youtube: `https://youtube.com/@${companyName.toLowerCase().replace(/\s+/g, '')}`,
            instagram: `https://instagram.com/${companyName.toLowerCase().replace(/\s+/g, '')}`,
        },
        technographics: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
        revenue: '$10M - $50M',
        funding: 'Series A',
        growth: 'High Growth',
        employees: '100-500',
        enrichmentStatus: {
            creditRating: { success: true },
            socialMedia: { success: true },
            aiAnalysis: { success: true },
        },
    };
}
/**
 * Enrich company data using SocialFlow internal API
 */
async function enrichCompanyWithSocialFlow(companyName, linkedinUrl) {
    try {
        logger_1.logger.info(`Enriching company via SocialFlow: ${companyName}`);
        if (linkedinUrl) {
            logger_1.logger.info(`  Using LinkedIn URL: ${linkedinUrl}`);
        }
        // If mock mode is enabled, return mock data immediately
        if (USE_MOCK_DATA) {
            logger_1.logger.info('SOCIALFLOW_USE_MOCK is enabled - returning mock data');
            return generateMockEnrichmentData(companyName);
        }
        // Build URL with LinkedIn parameter if available
        let url = `${SOCIALFLOW_API_URL}/api/company-analysis/lookup`;
        if (linkedinUrl) {
            url += `?linkedinUrl=${encodeURIComponent(linkedinUrl)}`;
        }
        else {
            url += `?companyName=${encodeURIComponent(companyName)}`;
        }
        logger_1.logger.info(`  API URL: ${url}`);
        // Add timeout to prevent hanging (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            if (response.status === 404) {
                logger_1.logger.warn(`Company not found in SocialFlow: ${companyName}`);
                return {
                    enrichmentStatus: {
                        creditRating: { success: false, error: 'Company not found in SocialFlow database' },
                        socialMedia: { success: false, error: 'Company not found in SocialFlow database' },
                        aiAnalysis: { success: false, error: 'Company not found in SocialFlow database' },
                    },
                };
            }
            throw new Error(`SocialFlow API error: ${response.status} ${response.statusText}`);
        }
        const apiResponse = await response.json();
        // Extract data from the actual API response structure
        // API returns: { success: true, data: { company, news, social, ... } }
        const data = apiResponse.data || apiResponse;
        // Extract company info from nested structure
        const companyData = data.company || {};
        const newsData = data.news || {};
        const socialData = data.social || [];
        logger_1.logger.info(`Processing SocialFlow data: company=${companyData.company_name}, industry=${companyData.industry}`);
        // Parse specialties - it comes as a single string with comma-separated values
        let technographics = [];
        if (companyData.specialties) {
            if (Array.isArray(companyData.specialties)) {
                // If it's an array, take the first element and split it
                const specialtiesStr = companyData.specialties[0] || '';
                technographics = specialtiesStr
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
            }
            else if (typeof companyData.specialties === 'string') {
                // If it's a string, split directly
                technographics = companyData.specialties
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
            }
        }
        logger_1.logger.info(`Extracted ${technographics.length} specialties/technologies`);
        // Build social media URLs from company name if not provided
        const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const companyHandle = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '');
        // Transform SocialFlow API response to expected format
        const socialFlowData = {
            // Credit Rating - not provided by this API, mark as unavailable
            creditRating: undefined,
            // Social Media profiles - construct likely URLs
            socialMedia: {
                linkedin: linkedinUrl || (companyData.linkedin ? `https://linkedin.com${companyData.linkedin}` : `https://linkedin.com/company/${companySlug}`),
                twitter: `https://twitter.com/${companyHandle}`,
                facebook: `https://facebook.com/${companyHandle}`,
                youtube: `https://youtube.com/@${companyHandle}`,
                instagram: `https://instagram.com/${companyHandle}`,
            },
            // Technology stack from parsed specialties
            technographics: technographics,
            // Financial and company data
            revenue: companyData.revenue || undefined,
            funding: companyData.funding || undefined,
            growth: newsData['Funding Rounds']?.length > 0 ? 'Active Funding' : undefined,
            employees: companyData.size || companyData.employee_count || undefined,
            // Enrichment status
            enrichmentStatus: {
                creditRating: {
                    success: false,
                    error: 'Credit rating not available from this data source'
                },
                socialMedia: {
                    success: true,
                    error: undefined
                },
                aiAnalysis: {
                    success: !!(companyData.company_name && companyData.industry && companyData.size),
                    error: !(companyData.company_name && companyData.industry && companyData.size) ? 'Limited company data available' : undefined
                },
            },
        };
        logger_1.logger.info(`SocialFlow enrichment successful for ${companyName}`);
        return socialFlowData;
    }
    catch (error) {
        logger_1.logger.error(`❌ SocialFlow enrichment failed for ${companyName}:`, error);
        logger_1.logger.error(`Error name: ${error.name}`);
        logger_1.logger.error(`Error message: ${error.message}`);
        logger_1.logger.error(`Error stack: ${error.stack}`);
        // Determine error message based on error type
        let errorMessage = 'API request failed';
        if (error.name === 'AbortError') {
            errorMessage = 'SocialFlow API is not responding (timeout after 30s). The service may be down or unreachable.';
        }
        else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Cannot connect to SocialFlow API. The service may be offline.';
        }
        else if (error.message) {
            errorMessage = error.message;
        }
        logger_1.logger.error(`Final error message: ${errorMessage}`);
        // Return partial error state with detailed message
        return {
            enrichmentStatus: {
                creditRating: { success: false, error: errorMessage },
                socialMedia: { success: false, error: errorMessage },
                aiAnalysis: { success: false, error: errorMessage },
            },
        };
    }
}
