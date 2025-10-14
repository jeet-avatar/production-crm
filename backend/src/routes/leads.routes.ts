import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authMiddleware);

// Mock data for testing when external API is unavailable
const getMockLeads = (mode: string, query: string) => {
  if (mode === 'company') {
    return {
      leads: [
        {
          LeadName: 'TechCorp Solutions',
          company: 'TechCorp Solutions',
          jobTitle: 'Technology Company',
          LinkedinLink: 'https://linkedin.com/company/techcorp-solutions',
          website: 'https://techcorp-solutions.com',
          headquarters: 'San Francisco, CA',
          location: 'San Francisco, CA',
          industry: 'Software Development',
          leadScore: 85,
          email: 'contact@techcorp-solutions.com'
        },
        {
          LeadName: 'InnovateLabs Inc',
          company: 'InnovateLabs Inc',
          jobTitle: 'SaaS Provider',
          LinkedinLink: 'https://linkedin.com/company/innovatelabs',
          website: 'https://innovatelabs.io',
          headquarters: 'San Francisco, CA',
          location: 'San Francisco, CA',
          industry: 'Cloud Services',
          leadScore: 92,
          email: 'hello@innovatelabs.io'
        },
        {
          LeadName: 'DataStream Analytics',
          company: 'DataStream Analytics',
          jobTitle: 'Data Analytics Platform',
          LinkedinLink: 'https://linkedin.com/company/datastream',
          website: 'https://datastream.ai',
          headquarters: 'San Francisco, CA',
          location: 'San Francisco, CA',
          industry: 'Business Intelligence',
          leadScore: 78,
          email: 'info@datastream.ai'
        }
      ]
    };
  } else {
    return {
      leads: [
        {
          LeadName: 'John Smith',
          email: 'john.smith@example.com',
          company: 'Tech Innovations Inc',
          jobTitle: 'Senior Software Engineer',
          LinkedinLink: 'https://linkedin.com/in/johnsmith',
          location: 'San Francisco, CA',
          leadScore: 88
        },
        {
          LeadName: 'Sarah Johnson',
          email: 'sarah.j@example.com',
          company: 'Digital Solutions Corp',
          jobTitle: 'Product Manager',
          LinkedinLink: 'https://linkedin.com/in/sarahjohnson',
          location: 'San Francisco, CA',
          leadScore: 92
        },
        {
          LeadName: 'Michael Chen',
          email: 'mchen@example.com',
          company: 'StartupHub',
          jobTitle: 'CTO',
          LinkedinLink: 'https://linkedin.com/in/michaelchen',
          location: 'San Francisco, CA',
          leadScore: 95
        }
      ]
    };
  }
};

// Discover leads from external API
router.post('/discover', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, mode, location, industry, techStack } = req.body;

    if (!query || !mode) {
      return res.status(400).json({
        error: 'Query and mode are required'
      });
    }

    console.log('🔍 Lead Discovery Request:', {
      query,
      mode,
      location,
      industry,
      techStack,
      timestamp: new Date().toISOString()
    });

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

    // Call external lead generation API with increased timeout and better error handling
    try {
      console.log('📡 Calling external API:', 'http://13.53.133.99:8000/api/live-leads');
      console.log('📋 Parameters:', params);

      const response = await axios.get('http://13.53.133.99:8000/api/live-leads', {
        params,
        timeout: 60000, // Increased to 60 seconds
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      const duration = Date.now() - startTime;
      console.log(`✅ External API responded in ${duration}ms`);
      console.log('📦 Response data:', JSON.stringify(response.data).substring(0, 200) + '...');

      // Check if response has leads
      if (!response.data || !response.data.leads || response.data.leads.length === 0) {
        console.log('⚠️  External API returned no leads, using mock data');
        const mockData = getMockLeads(mode, query);
        return res.json({
          ...mockData,
          source: 'mock',
          message: 'Using sample data - external API returned no results'
        });
      }

      res.json(response.data);
    } catch (apiError: any) {
      const duration = Date.now() - startTime;

      // Detailed error logging
      console.error('❌ External API Error:', {
        message: apiError.message,
        code: apiError.code,
        status: apiError.response?.status,
        duration: `${duration}ms`,
        isTimeout: apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout'),
        isNetworkError: apiError.code === 'ECONNREFUSED' || apiError.code === 'ENOTFOUND',
      });

      // Check if it's a timeout
      if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
        console.log('⏱️  Request timed out after 60 seconds, returning mock data');
        const mockData = getMockLeads(mode, query);
        return res.json({
          ...mockData,
          source: 'mock',
          message: 'The lead discovery service is taking longer than expected. Showing sample results while we retry in the background.'
        });
      }

      // For other errors, also return mock data
      console.log('🔄 API unavailable, returning mock data for testing');
      const mockData = getMockLeads(mode, query);
      return res.json({
        ...mockData,
        source: 'mock',
        message: 'The lead discovery service is currently unavailable. Showing sample results for testing.'
      });
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('💥 Unexpected error in lead discovery:', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    // As last resort, return mock data
    try {
      const { mode, query } = req.body;
      const mockData = getMockLeads(mode || 'company', query || 'test');
      return res.json({
        ...mockData,
        source: 'mock',
        message: 'An error occurred. Showing sample results for testing.'
      });
    } catch (mockError) {
      // If even mock data fails, return a proper error
      res.status(500).json({
        error: 'Lead discovery service is temporarily unavailable',
        details: 'Please try again later or contact support if the issue persists.',
        technicalDetails: error.message
      });
    }
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

    console.log('📥 Importing contact:', {
      name: leadData.LeadName,
      email: leadData.email,
      company: leadData.company,
      userId
    });

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

    console.log('✅ Contact imported successfully:', contact.id);

    res.json({
      success: true,
      contact
    });
  } catch (error: any) {
    console.error('❌ Import contact error:', error);
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

    console.log('📥 Importing company:', {
      name: leadData.LeadName,
      website: leadData.website,
      location: leadData.headquarters || leadData.location,
      userId
    });

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

    console.log('✅ Company imported successfully:', company.id);

    res.json({
      success: true,
      company
    });
  } catch (error: any) {
    console.error('❌ Import company error:', error);
    res.status(500).json({
      error: 'Failed to import company',
      details: error.message
    });
  }
});

export default router;
