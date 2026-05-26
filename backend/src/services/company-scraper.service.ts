import Anthropic from '@anthropic-ai/sdk';

interface CompanyData {
  company_name: string;
  company_logo_url: string;
  primary_color: string;
  secondary_color: string;
  company_tagline: string;
  email_address: string;
  phone_number: string;
  office_address: string;
  linkedin_url: string;
  twitter_url: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  privacy_policy_url: string;
  terms_url: string;
  office_hours_text: string;
  email_footer_disclaimer: string;
}

export class CompanyScraperService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Scrape company data from a domain using Claude AI
   */
  async scrapeCompanyData(domain: string): Promise<Partial<CompanyData>> {
    try {
      console.log(`🔍 Scraping company data from: ${domain}`);

      // Normalize domain
      const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const websiteUrl = `https://${normalizedDomain}`;

      // Fetch the website HTML
      console.log(`📡 Fetching website: ${websiteUrl}`);
      const htmlResponse = await fetch(websiteUrl);
      const html = await htmlResponse.text();
      console.log(`✅ Fetched ${html.length} characters of HTML`);

      // Extract just the first 50KB to avoid token limits
      const htmlSnippet = html.substring(0, 50000);

      // Use Claude to analyze the website HTML
      const prompt = `You are a web scraping assistant. I have fetched the HTML from the website ${websiteUrl}. Please analyze this HTML and extract the following company information:

1. Company Name
2. Company Logo URL (find the main logo image URL)
3. Primary Brand Color (hex code from the website design)
4. Secondary Brand Color (hex code, if available)
5. Company Tagline/Slogan
6. Email Address (contact email)
7. Phone Number (main contact number)
8. Office Address (physical address, if available)
9. LinkedIn URL
10. Twitter/X URL
11. Facebook URL
12. Instagram URL
13. YouTube URL
14. Privacy Policy URL
15. Terms of Service URL
16. Office Hours (if mentioned)
17. Email Footer Disclaimer (any legal text or disclaimer)

Please return ONLY a valid JSON object with these exact keys (use snake_case):
{
  "company_name": "...",
  "company_logo_url": "...",
  "primary_color": "#......",
  "secondary_color": "#......",
  "company_tagline": "...",
  "email_address": "...",
  "phone_number": "...",
  "office_address": "...",
  "linkedin_url": "...",
  "twitter_url": "...",
  "facebook_url": "...",
  "instagram_url": "...",
  "youtube_url": "...",
  "privacy_policy_url": "...",
  "terms_url": "...",
  "office_hours_text": "...",
  "email_footer_disclaimer": "..."
}

If any field is not found, use an empty string "". Do not include any explanation, only return the JSON object.

Here is the website HTML to analyze:

${htmlSnippet}`;

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Extract text from response
      const responseText = message.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      console.log('📥 Raw AI response length:', responseText.length);
      console.log('📥 Raw AI response preview:', responseText.substring(0, 500));

      // Parse JSON from response - find the JSON object
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        console.error('❌ No JSON found in response');
        throw new Error('Failed to extract JSON from AI response');
      }

      let companyData: Partial<CompanyData>;
      try {
        companyData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Failed to parse:', jsonMatch[0].substring(0, 500));
        throw new Error('Invalid JSON response from AI');
      }

      console.log('✅ Successfully extracted company data:', {
        company_name: companyData.company_name,
        has_logo: !!companyData.company_logo_url,
        has_email: !!companyData.email_address,
        has_phone: !!companyData.phone_number
      });

      // Add current year
      const dataWithYear = {
        ...companyData,
        current_year: new Date().getFullYear().toString()
      };

      return dataWithYear;

    } catch (error) {
      console.error('❌ Error scraping company data:', error);
      throw new Error(`Failed to scrape company data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a domain format
   */
  isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const normalized = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    return domainRegex.test(normalized);
  }
}
