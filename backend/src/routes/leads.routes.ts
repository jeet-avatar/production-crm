import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authMiddleware);

// Discover leads from external API
router.post('/discover', async (req, res) => {
  try {
    const { query, mode, location, industry, techStack } = req.body;

    if (!query || !mode) {
      return res.status(400).json({
        error: 'Query and mode are required'
      });
    }

    // Build query params
    const params: any = {
      query,
      mode, // 'individual' or 'company'
      location: location || '',
    };

    if (mode === 'company') {
      if (industry) params.industry = industry;
      if (techStack) params.techStack = techStack;
    }

    // Call external lead generation API
    const response = await axios.get('http://13.53.133.99:8000/api/live-leads', {
      params,
      timeout: 30000, // 30 second timeout
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Lead discovery error:', error);
    res.status(500).json({
      error: 'Failed to discover leads',
      details: error.message
    });
  }
});

// Import individual lead as contact
router.post('/import-contact', async (req, res) => {
  try {
    const { leadData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create contact from lead data
    const contact = await prisma.contact.create({
      data: {
        firstName: leadData.LeadName?.split(' ')[0] || 'Unknown',
        lastName: leadData.LeadName?.split(' ').slice(1).join(' ') || '',
        email: leadData.email || '',
        company: leadData.company || '',
        title: leadData.jobTitle || '',
        linkedin: leadData.LinkedinLink || '',
        notes: `Imported from Lead Discovery\nLead Score: ${leadData.leadScore || 'N/A'}\nLinkedIn: ${leadData.LinkedinLink || 'N/A'}`,
        dataSource: 'lead_discovery',
        userId: userId,
        status: 'LEAD',
      },
    });

    res.json({
      success: true,
      contact
    });
  } catch (error: any) {
    console.error('Import contact error:', error);
    res.status(500).json({
      error: 'Failed to import contact',
      details: error.message
    });
  }
});

// Import company lead
router.post('/import-company', async (req, res) => {
  try {
    const { leadData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create company from lead data
    const company = await prisma.company.create({
      data: {
        name: leadData.LeadName || leadData.company || 'Unknown',
        linkedin: leadData.LinkedinLink || '',
        website: leadData.website || '',
        location: leadData.headquarters || leadData.location || '',
        industry: leadData.industry || leadData.jobTitle || '',
        description: `Lead Score: ${leadData.leadScore || 'N/A'}\nType: ${leadData.jobTitle || 'N/A'}\nImported from Lead Discovery`,
        dataSource: 'lead_discovery',
        userId: userId,
      },
    });

    res.json({
      success: true,
      company
    });
  } catch (error: any) {
    console.error('Import company error:', error);
    res.status(500).json({
      error: 'Failed to import company',
      details: error.message
    });
  }
});

export default router;
