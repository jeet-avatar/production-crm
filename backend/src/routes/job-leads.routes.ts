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
// DOMAIN EXTRACTION
// ============================================
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ============================================
// STREAM CLASSIFICATION
// ============================================
function classifyStream(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/netsuite|oracle netsuite|netsuite administrator|netsuite developer|erp/.test(text)) return 'NetSuite';
  if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration testing|infosec/.test(text)) return 'Cybersecurity';
  if (/recruiter|talent acquisition|hr manager|human resources|staffing/.test(text)) return 'Staffing/HR';
  return 'Other';
}

// ============================================
// GET /api/job-leads/fetch
// Fetch job leads from Remotive API + classify
// ============================================
router.get('/fetch', async (req, res) => {
  try {
    const { stream } = req.query as { stream?: string };

    const response = await axios.get('https://remotive.com/api/remote-jobs?search=india', {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BrandMonkz-CRM/1.0',
      },
    });

    if (!response.data || !Array.isArray(response.data.jobs)) {
      return res.json({ leads: [], total: 0, streams: {}, error: 'Unexpected response from job board' });
    }

    const leads = response.data.jobs.map((job: any) => {
      const domain = extractDomain(job.url || '');
      return {
        id: job.id,
        title: job.title,
        companyName: job.company_name,
        companyLogo: job.company_logo || null,
        url: job.url,
        location: job.candidate_required_location || 'Remote',
        postedAt: job.publication_date,
        stream: classifyStream(job.title || '', job.description || ''),
        tags: job.tags || [],
        companyDomain: domain || '',
        companyEmail: domain ? `hr@${domain}` : '',
        emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
      };
    });

    // Count by stream
    const streams: Record<string, number> = { NetSuite: 0, Cybersecurity: 0, 'Staffing/HR': 0, Other: 0 };
    for (const lead of leads) {
      streams[lead.stream] = (streams[lead.stream] || 0) + 1;
    }

    // Filter by stream if query param provided
    const filtered = stream ? leads.filter((l: any) => l.stream === stream) : leads;

    return res.json({ leads: filtered, total: filtered.length, streams });
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
              website: lead.url || '',
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
