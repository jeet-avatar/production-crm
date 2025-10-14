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
    const email = leadData.email && leadData.email.trim()
      ? leadData.email.trim()
      : null;

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

    // Create contact from lead data
    const contact = await prisma.contact.create({
      data: {
        firstName: leadData.LeadName?.split(' ')[0] || 'Unknown',
        lastName: leadData.LeadName?.split(' ').slice(1).join(' ') || '',
        email: email,
        title: leadData.jobTitle || '',
        linkedin: leadData.LinkedinLink || '',
        notes: `🎯 Imported from Lead Discovery\n\nCompany: ${leadData.company || 'N/A'}\nLinkedIn: ${leadData.LinkedinLink || 'N/A'}\nProfile: ${leadData.id || 'N/A'}`,
        source: 'lead_discovery',
        userId: userId,
        status: 'LEAD',
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
      }
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

export default router;
