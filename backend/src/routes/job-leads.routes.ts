// File: backend/src/routes/job-leads.routes.ts
// Job Leads Pipeline — fetch from Remotive API, classify by stream, import to CRM

import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// ============================================
// DOMAIN FROM COMPANY NAME
// "Coalition Technologies" -> "coalitiontechnologies.com"
// "A.Team" -> "ateam.com"
// "Credit Wellness, LLC" -> "creditwellness.com"
// NOTE: We derive domain from company NAME, not the job URL.
// The job URL always points to remotive.com, not the actual company.
// ============================================
function companyToDomain(companyName: string): string {
  if (!companyName) return '';
  return companyName
    .toLowerCase()
    .replace(/[,.].*$/, '')           // strip suffix after comma/dot (e.g. ", LLC")
    .replace(/[^a-z0-9\s]/g, '')     // remove special chars
    .replace(/\s+/g, '')             // collapse spaces
    .trim() + '.com';
}

// Jobs open to India placements: Worldwide, India, Global, Anywhere, Asia/APAC, or unrestricted
function isOpenToIndia(location: string): boolean {
  if (!location || location.trim() === '') return true;
  const loc = location.toLowerCase();
  return loc.includes('india') || loc.includes('worldwide') || loc.includes('global') ||
    loc.includes('anywhere') || loc.includes('remote') || loc.includes('asia') || loc.includes('apac');
}

// ============================================
// STREAM CLASSIFICATION — All major technology hiring streams
// ============================================
function classifyStream(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // Enterprise / ERP
  if (/netsuite|oracle netsuite|netsuite administrator|netsuite developer/.test(text)) return 'NetSuite';
  if (/\berp\b|sap\b|dynamics 365|workday|oracle erp/.test(text)) return 'Enterprise/ERP';

  // AI / ML / Data Science
  if (/\bai\b|artificial intelligence|machine learning|\bml\b|deep learning|nlp|computer vision|llm|genai|generative ai|data scien|tensorflow|pytorch|hugging face/.test(text)) return 'AI/ML';

  // Cloud & Infrastructure
  if (/\baws\b|amazon web services|\bazure\b|google cloud|\bgcp\b|cloud architect|cloud engineer|devops|sre\b|site reliability|kubernetes|\bk8s\b|terraform|docker|infrastructure/.test(text)) return 'Cloud/DevOps';

  // Cybersecurity
  if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration test|infosec|security engineer|threat|vulnerability|devsecops|compliance/.test(text)) return 'Cybersecurity';

  // Full-Stack / Web Development
  if (/full.?stack|frontend|front.?end|backend|back.?end|\breact\b|\bangular\b|\bvue\b|next\.?js|node\.?js|\.net|django|rails|laravel|spring boot/.test(text)) return 'Full-Stack';

  // Data Engineering & Analytics
  if (/data engineer|data analyst|analytics|power bi|tableau|\bsql\b|snowflake|databricks|spark|airflow|\betl\b|data warehouse|business intelligence|\bbi\b/.test(text)) return 'Data/Analytics';

  // Mobile Development
  if (/\bios\b|android|swift|kotlin|react native|flutter|mobile developer|mobile engineer/.test(text)) return 'Mobile';

  // Blockchain / Web3
  if (/blockchain|web3|solidity|smart contract|crypto|defi|nft|ethereum|solana/.test(text)) return 'Web3';

  // Product / Design / UX
  if (/product manager|product owner|ux designer|ui designer|product design|user experience|figma/.test(text)) return 'Product/Design';

  // Staffing / HR
  if (/recruiter|talent acquisition|hr manager|human resources|staffing|people operations/.test(text)) return 'Staffing/HR';

  // QA / Testing
  if (/\bqa\b|quality assurance|test engineer|automation test|selenium|cypress|playwright/.test(text)) return 'QA/Testing';

  return 'Other';
}

// ============================================
// In-memory cache — refreshes once per day automatically
// ============================================
let cachedLeads: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isCacheValid(): boolean {
  return cachedLeads !== null && (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

// ============================================
// GET /api/job-leads/fetch
// Fetch job leads from Remotive API + classify
// Returns cached data if less than 24 hours old
// ============================================
router.get('/fetch', async (req, res) => {
  try {
    const { stream, refresh } = req.query as { stream?: string; refresh?: string };

    // Use cache if valid and no forced refresh
    if (isCacheValid() && refresh !== 'true') {
      const leads = cachedLeads!;
      const streams: Record<string, number> = {};
      for (const lead of leads) {
        streams[lead.stream] = (streams[lead.stream] || 0) + 1;
      }
      const filtered = stream ? leads.filter((l: any) => l.stream === stream) : leads;
      return res.json({
        leads: filtered,
        total: filtered.length,
        streams,
        totalFetched: leads.length,
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 60000) + ' minutes',
      });
    }

    // Fetch fresh data from Remotive API
    const response = await axios.get('https://remotive.com/api/remote-jobs', {
      timeout: 20000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; BrandMonkz-CRM/1.0)',
      },
    });

    if (!response.data || !Array.isArray(response.data.jobs)) {
      return res.json({ leads: [], total: 0, streams: {}, error: 'Unexpected response from job board' });
    }

    // Keep only jobs open to India / Worldwide / Global
    const indiaJobs = response.data.jobs.filter((job: any) =>
      isOpenToIndia(job.candidate_required_location || '')
    );

    const leads = indiaJobs.map((job: any) => {
      // Derive domain from company NAME, not the remotive.com job URL
      const domain = companyToDomain(job.company_name);
      return {
        id: job.id,
        title: job.title,
        companyName: job.company_name,
        companyLogo: job.company_logo || job.company_logo_url || null,
        url: job.url,
        location: job.candidate_required_location || 'Worldwide',
        postedAt: job.publication_date,
        stream: classifyStream(job.title || '', job.description || ''),
        tags: job.tags || [],
        companyDomain: domain,
        companyEmail: domain ? `hr@${domain}` : '',
        emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
      };
    });

    // Cache the results
    cachedLeads = leads;
    cacheTimestamp = Date.now();

    // Count by stream — all technology hiring categories
    const streams: Record<string, number> = {};
    for (const lead of leads) {
      streams[lead.stream] = (streams[lead.stream] || 0) + 1;
    }

    // Filter by stream if query param provided
    const filtered = stream ? leads.filter((l: any) => l.stream === stream) : leads;

    return res.json({ leads: filtered, total: filtered.length, streams, totalFetched: response.data.jobs.length, cached: false });
  } catch (error: any) {
    console.error('Job leads fetch error:', error.message);
    return res.json({ leads: [], total: 0, streams: {}, error: 'Failed to fetch from job board' });
  }
});

// ============================================
// POST /api/job-leads/import
// Import selected leads as Company + Contact records
// ============================================
router.post('/import', async (req, res) => {
  try {
    const { leads } = req.body as {
      leads: Array<{
        id?: number;
        companyName: string;
        url: string;
        stream: string;
        title: string;
        location: string;
        companyEmail?: string;
        companyDomain?: string;
      }>;
    };
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'No leads provided' });
    }

    const importedCompanyIds: string[] = [];
    let importedCount = 0;

    for (const lead of leads) {
      try {
        // Find or create Company (by name scoped to user)
        let company = await prisma.company.findFirst({
          where: { name: lead.companyName, userId },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              name: lead.companyName,
              website: lead.companyDomain ? `https://${lead.companyDomain}` : lead.url || '',
              industry: lead.stream,
              tags: [lead.stream, 'job-lead'],
              dataSource: 'job_board',
              userId,
            },
          });
        }

        importedCompanyIds.push(company.id);

        // Create Contact linked to the Company
        await prisma.contact.create({
          data: {
            firstName: 'Hiring',
            lastName: 'Manager',
            email: lead.companyEmail || undefined,
            title: lead.title,
            source: 'job_board',
            notes: `Job posting: ${lead.url}\nStream: ${lead.stream}\nLocation: ${lead.location}`,
            status: 'LEAD',
            companyId: company.id,
            userId,
          },
        });

        importedCount++;
      } catch (leadError: any) {
        console.error(`Failed to import lead for ${lead.companyName}:`, leadError.message);
      }
    }

    return res.json({ imported: importedCount, companies: importedCompanyIds });
  } catch (error: any) {
    console.error('Job leads import error:', error.message);
    return res.status(500).json({ error: 'Failed to import leads', details: error.message });
  }
});

export default router;
