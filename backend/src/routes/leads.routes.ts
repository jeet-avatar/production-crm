// File: backend/src/routes/leads.routes.ts
// Lead discovery routes with comprehensive error handling

import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication
router.use(authenticate);

// ============================================
// DISCOVER LEADS
// ============================================
router.post('/discover', async (req, res) => {
  try {
    const { query, mode, location, industry, techStack } = req.body;

    // Validation
    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    if (!mode || !['individual', 'company'].includes(mode)) {
      return res.status(400).json({
        error: 'Mode must be "individual" or "company"'
      });
    }

    // Log the request for debugging
    console.log('🔍 Lead Discovery Request:', { query, mode, location, industry, techStack });

    // Build query parameters
    const params: any = {
      query: query.trim(),
      mode: mode,
    };

    // Add optional parameters
    if (location && location.trim()) {
      params.location = location.trim();
    }

    if (mode === 'company') {
      if (industry && industry.trim()) {
        params.industry = industry.trim();
      }
      if (techStack && techStack.trim()) {
        params.techStack = techStack.trim();
      }
    }

    console.log('📤 API Request Params:', params);

    // Call external lead generation API with timeout and retry
    let attempts = 0;
    let lastError;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Attempt ${attempts}/${maxAttempts}`);

        const response = await axios.get('http://13.53.133.99:8000/api/live-leads', {
          params,
          timeout: 45000, // 45 second timeout
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'BrandMonkz-CRM/1.0',
          },
        });

        console.log('✅ API Response Status:', response.status);
        console.log('📥 API Response Data:', JSON.stringify(response.data).substring(0, 200));

        // Check if response is valid
        if (!response.data) {
          throw new Error('Empty response from lead API');
        }

        // Normalize response format
        let leads = [];
        if (response.data.categories && Array.isArray(response.data.categories)) {
          leads = response.data.categories[0]?.leads || [];
        } else if (Array.isArray(response.data)) {
          leads = response.data;
        }

        // Save leads to database
        const userId = req.user?.id;
        let savedCount = 0;
        let duplicateCount = 0;

        if (userId && leads.length > 0) {
          console.log(`💾 Saving ${leads.length} leads to database...`);

          for (const lead of leads) {
            try {
              // Check if lead already exists
              const existingLead = await prisma.lead.findFirst({
                where: {
                  userId: userId,
                  OR: [
                    { leadName: lead.LeadName || lead.name },
                    ...(lead.email ? [{ email: lead.email }] : []),
                    ...(lead.LinkedinLink ? [{ linkedinLink: lead.LinkedinLink }] : []),
                  ],
                },
              });

              if (existingLead) {
                duplicateCount++;
                continue;
              }

              // Save lead
              await prisma.lead.create({
                data: {
                  type: mode === 'individual' ? 'INDIVIDUAL' : 'COMPANY',
                  status: 'NEW',
                  leadName: lead.LeadName || lead.name || 'Unknown',
                  email: lead.email || null,
                  phone: lead.phone || null,
                  jobTitle: lead.jobTitle || '',
                  company: lead.company || '',
                  location: location || '',
                  headquarters: lead.headquarters || '',
                  industry: industry || lead.industry || '',
                  website: lead.website || '',
                  linkedinLink: lead.LinkedinLink || '',
                  leadScore: lead.leadScore || null,
                  searchQuery: query,
                  searchMode: mode,
                  searchLocation: location || null,
                  searchIndustry: industry || null,
                  searchTechStack: techStack || null,
                  rawData: lead,
                  userId: userId,
                },
              });

              savedCount++;
            } catch (saveError: any) {
              console.error(`Failed to save lead ${lead.LeadName}:`, saveError.message);
            }
          }

          console.log(`✅ Saved ${savedCount} leads, ${duplicateCount} duplicates skipped`);
        }

        return res.json({
          success: true,
          leads: leads,
          count: leads.length,
          mode: mode,
          saved: savedCount,
          duplicates: duplicateCount,
        });
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Attempt ${attempts} failed:`, error.message);

        if (attempts < maxAttempts) {
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // All attempts failed
    throw lastError;

  } catch (error: any) {
    console.error('❌ Lead Discovery Error:', error);

    // Categorize error types
    let errorMessage = 'Failed to discover leads';
    let statusCode = 500;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Lead discovery service is unavailable. Please try again later.';
      statusCode = 503;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The service is taking too long to respond.';
      statusCode = 504;
    } else if (error.response) {
      // API returned an error response
      statusCode = error.response.status;
      errorMessage = error.response.data?.error || error.response.data?.message || 'External API error';

      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'No response from lead discovery service';
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      suggestion: 'Try different search criteria or check your internet connection',
    });
  }
});

// ============================================
// TEST ENDPOINT (for debugging)
// ============================================
router.get('/test-api', async (req, res) => {
  try {
    console.log('🧪 Testing lead API connection...');

    const response = await axios.get('http://13.53.133.99:8000/api/live-leads', {
      params: {
        query: 'software engineer',
        mode: 'individual',
        location: 'USA',
      },
      timeout: 30000,
    });

    res.json({
      success: true,
      message: 'API connection successful',
      status: response.status,
      dataReceived: !!response.data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.response?.data,
    });
  }
});

// ============================================
// IMPORT INDIVIDUAL LEAD AS CONTACT
// ============================================
router.post('/import-contact', async (req, res) => {
  try {
    const { leadData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!leadData || !leadData.LeadName) {
      return res.status(400).json({ error: 'Invalid lead data' });
    }

    console.log('📥 Importing contact:', leadData.LeadName);

    // Generate unique email if none provided (to avoid unique constraint violation)
    // Use null for empty/missing emails to avoid unique constraint violations
    const email = leadData.email?.trim() || null;

    // Check for existing contact
    if (email) {
      const existingContact = await prisma.contact.findFirst({
        where: {
          userId: userId,
          email: email,
        },
      });

      if (existingContact) {
        return res.status(400).json({
          error: 'Contact already exists',
          contact: {
            id: existingContact.id,
            firstName: existingContact.firstName,
            lastName: existingContact.lastName,
          }
        });
      }
    }

    // Create or find company if leadData has company information
    let companyId: string | undefined = undefined;

    if (leadData.company && leadData.company.trim()) {
      const companyName = leadData.company.trim();

      // Check if company already exists for this user
      let company = await prisma.company.findFirst({
        where: {
          userId: userId,
          name: companyName,
        },
      });

      // If company doesn't exist, create it
      if (!company) {
        console.log('🏢 Creating company:', companyName);
        company = await prisma.company.create({
          data: {
            name: companyName,
            website: leadData.website || '',
            location: leadData.headquarters || leadData.location || '',
            linkedin: leadData.companyLinkedIn || '',
            description: `🎯 Auto-created from Lead Discovery\n\nLinkedIn: ${leadData.LinkedinLink || 'N/A'}`,
            dataSource: 'lead_discovery',
            userId: userId,
          },
        });
        console.log('✅ Company created:', company.id);
      } else {
        console.log('🏢 Using existing company:', company.id);
      }

      companyId = company.id;
    }

    // Create contact from lead data
    const contact = await prisma.contact.create({
      data: {
        firstName: leadData.LeadName?.split(' ')[0] || 'Unknown',
        lastName: leadData.LeadName?.split(' ').slice(1).join(' ') || '',
        email: email,
        title: leadData.jobTitle || '',
        linkedin: leadData.LinkedinLink || '',
        location: leadData.headquarters || leadData.location || '',
        notes: `🎯 Imported from Lead Discovery\n\nCompany: ${leadData.company || 'N/A'}\nLinkedIn: ${leadData.LinkedinLink || 'N/A'}\nProfile: ${leadData.id || 'N/A'}`,
        source: 'lead_discovery',
        userId: userId,
        status: 'LEAD',
        companyId: companyId, // Link to company
      },
    });

    console.log('✅ Contact imported:', contact.id);

    res.json({
      success: true,
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        companyId: companyId,
      },
      company: companyId ? {
        id: companyId,
        created: true,
        message: 'Company automatically created and linked'
      } : null,
    });
  } catch (error: any) {
    console.error('❌ Import contact error:', error);

    // Provide more helpful error messages
    let errorMessage = 'Failed to import contact';
    if (error.code === 'P2002') {
      errorMessage = 'This contact already exists in your CRM';
    }

    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ============================================
// IMPORT COMPANY LEAD
// ============================================
router.post('/import-company', async (req, res) => {
  try {
    const { leadData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!leadData || !leadData.LeadName) {
      return res.status(400).json({ error: 'Invalid lead data' });
    }

    console.log('📥 Importing company:', leadData.LeadName);

    // Create company from lead data
    const company = await prisma.company.create({
      data: {
        name: leadData.LeadName || leadData.company || 'Unknown',
        linkedin: leadData.LinkedinLink || '',
        website: leadData.website || '',
        location: leadData.headquarters || leadData.location || '',
        industry: leadData.industry || leadData.jobTitle || '',
        description: `🎯 Imported from Lead Discovery\n\nLead Score: ${leadData.leadScore || 'N/A'}\nType: ${leadData.jobTitle || 'N/A'}\nLinkedIn: ${leadData.LinkedinLink || 'N/A'}\nWebsite: ${leadData.website || 'N/A'}`,
        dataSource: 'lead_discovery',
        userId: userId,
      },
    });

    console.log('✅ Company imported:', company.id);

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        leadScore: leadData.leadScore,
      }
    });
  } catch (error: any) {
    console.error('❌ Import company error:', error);
    res.status(500).json({
      error: 'Failed to import company',
      details: error.message,
    });
  }
});

// ============================================
// BULK IMPORT COMPANIES
// ============================================
router.post('/import-companies-bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Invalid lead data - array of leads required' });
    }

    console.log(`📥 Bulk importing ${leads.length} companies`);

    const results = {
      imported: [] as any[],
      failed: [] as any[],
      duplicates: [] as any[],
    };

    // Process each lead
    for (const leadData of leads) {
      try {
        if (!leadData.LeadName) {
          results.failed.push({
            lead: leadData,
            error: 'Missing company name',
          });
          continue;
        }

        // Check for duplicates
        const existingCompany = await prisma.company.findFirst({
          where: {
            userId: userId,
            OR: [
              { name: leadData.LeadName || leadData.company },
              ...(leadData.LinkedinLink ? [{ linkedin: leadData.LinkedinLink }] : []),
            ],
          },
        });

        if (existingCompany) {
          results.duplicates.push({
            name: leadData.LeadName,
            existingId: existingCompany.id,
          });
          continue;
        }

        // Create company
        const company = await prisma.company.create({
          data: {
            name: leadData.LeadName || leadData.company || 'Unknown',
            linkedin: leadData.LinkedinLink || '',
            website: leadData.website || '',
            location: leadData.headquarters || leadData.location || '',
            industry: leadData.industry || leadData.jobTitle || '',
            description: `🎯 Imported from Lead Discovery

Lead Score: ${leadData.leadScore || 'N/A'}
Type: ${leadData.jobTitle || 'N/A'}
LinkedIn: ${leadData.LinkedinLink || 'N/A'}
Website: ${leadData.website || 'N/A'}`,
            dataSource: 'lead_discovery',
            userId: userId,
          },
        });

        results.imported.push({
          id: company.id,
          name: company.name,
          leadScore: leadData.leadScore,
        });

      } catch (error: any) {
        results.failed.push({
          lead: leadData.LeadName || 'Unknown',
          error: error.message,
        });
      }
    }

    console.log(`✅ Bulk import complete: ${results.imported.length} imported, ${results.duplicates.length} duplicates, ${results.failed.length} failed`);

    res.json({
      success: true,
      summary: {
        total: leads.length,
        imported: results.imported.length,
        duplicates: results.duplicates.length,
        failed: results.failed.length,
      },
      results: results,
    });

  } catch (error: any) {
    console.error('❌ Bulk import error:', error);
    res.status(500).json({
      error: 'Failed to bulk import companies',
      details: error.message,
    });
  }
});

// ============================================
// GET COMPANIES FROM LEADS
// Returns all unique companies from saved leads
// ============================================
router.get('/companies', async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('📊 Fetching companies from leads for user:', userId);

    // Get all leads with company information
    const leads = await prisma.lead.findMany({
      where: {
        userId: userId,
        AND: [
          {
            company: {
              not: null,
            },
          },
          {
            company: {
              not: '',
            },
          },
        ],
      },
      select: {
        id: true,
        leadName: true,
        company: true,
        website: true,
        linkedinLink: true,
        headquarters: true,
        location: true,
        industry: true,
        leadScore: true,
        imported: true,
        importedAsCompanyId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by company name to get unique companies
    const companiesMap = new Map<string, any>();

    for (const lead of leads) {
      const companyName = lead.company!;

      if (!companiesMap.has(companyName)) {
        // Check if this company is already in the companies table
        const existingCompany = await prisma.company.findFirst({
          where: {
            userId: userId,
            name: companyName,
          },
        });

        companiesMap.set(companyName, {
          companyName: companyName,
          website: lead.website || '',
          linkedinLink: lead.linkedinLink || '',
          location: lead.headquarters || lead.location || '',
          industry: lead.industry || '',
          leadScore: lead.leadScore || 0,
          leadCount: 1, // Will increment below
          imported: !!existingCompany,
          companyId: existingCompany?.id || null,
          firstSeen: lead.createdAt,
          leads: [lead],
        });
      } else {
        // Increment lead count for this company
        const companyData = companiesMap.get(companyName)!;
        companyData.leadCount += 1;
        companyData.leads.push(lead);
      }
    }

    // Convert map to array
    const companies = Array.from(companiesMap.values());

    console.log(`✅ Found ${companies.length} unique companies from ${leads.length} leads`);

    res.json({
      success: true,
      companies: companies,
      totalLeads: leads.length,
      uniqueCompanies: companies.length,
    });

  } catch (error: any) {
    console.error('❌ Get companies from leads error:', error);
    res.status(500).json({
      error: 'Failed to fetch companies from leads',
      details: error.message,
    });
  }
});

// ============================================
// IMPORT COMPANY FROM LEAD
// Import a specific company from lead data to companies table
// ============================================
router.post('/import-company-from-lead', async (req, res) => {
  try {
    const { companyName, enrich } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    console.log('🏢 Importing company from lead:', companyName);

    // Check if company already exists
    const existingCompany = await prisma.company.findFirst({
      where: {
        userId: userId,
        name: companyName.trim(),
      },
    });

    if (existingCompany) {
      return res.status(400).json({
        error: 'Company already exists',
        company: {
          id: existingCompany.id,
          name: existingCompany.name,
        },
      });
    }

    // Find the best lead data for this company (highest lead score)
    const lead = await prisma.lead.findFirst({
      where: {
        userId: userId,
        company: companyName.trim(),
      },
      orderBy: {
        leadScore: 'desc',
      },
    });

    if (!lead) {
      return res.status(404).json({
        error: 'No lead data found for this company',
      });
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        website: lead.website || '',
        location: lead.headquarters || lead.location || '',
        industry: lead.industry || '',
        linkedin: lead.linkedinLink || '',
        description: `🎯 Imported from Lead Discovery\n\nLead Score: ${lead.leadScore || 'N/A'}\nLocation: ${lead.headquarters || lead.location || 'N/A'}`,
        dataSource: 'lead_discovery',
        enriched: enrich === true, // Mark as enriched if requested
        userId: userId,
      },
    });

    // Update all leads for this company to mark as imported
    await prisma.lead.updateMany({
      where: {
        userId: userId,
        company: companyName.trim(),
      },
      data: {
        imported: true,
        importedAsCompanyId: company.id,
      },
    });

    console.log('✅ Company imported:', company.id);

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        website: company.website,
        location: company.location,
      },
      leadsUpdated: await prisma.lead.count({
        where: {
          userId: userId,
          importedAsCompanyId: company.id,
        },
      }),
    });

  } catch (error: any) {
    console.error('❌ Import company from lead error:', error);
    res.status(500).json({
      error: 'Failed to import company',
      details: error.message,
    });
  }
});

export default router;
