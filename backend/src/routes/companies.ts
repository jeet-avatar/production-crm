import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { companyEnrichmentService } from '../services/companyEnrichment';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Enable authentication for all company routes
router.use(authenticate);

// GET /api/companies - Get all companies
router.get('/', async (req, res, next) => {
  try {
    const { 
      search, 
      page = '1', 
      limit = '10' 
    } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with user isolation
    const where: any = {
      isActive: true,
      userId: req.user?.id, // Only show companies owned by this user
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get companies with contact count and contact details
    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.company.count({ where });

    res.json({
      companies,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/companies/:id - Get single company
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id, // Only allow access to user's own companies
      },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            title: true,
            status: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json({ company });
  } catch (error) {
    return next(error);
  }
});

// POST /api/companies/:id/enrich - Trigger enrichment for a company
router.post('/:id/enrich', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get company
    const company = await prisma.company.findFirst({
      where: { id, userId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.website) {
      return res.status(400).json({ error: 'Company has no website to enrich from' });
    }

    // Check if already enriching
    if (company.enrichmentStatus === 'enriching') {
      return res.status(409).json({ error: 'Company is already being enriched' });
    }

    // Update status to enriching
    await prisma.company.update({
      where: { id },
      data: { enrichmentStatus: 'enriching' }
    });

    // Start enrichment in background (don't await)
    companyEnrichmentService.enrichCompany(company.name, company.website)
      .then(async (enrichedData) => {
        await prisma.company.update({
          where: { id },
          data: {
            ...enrichedData,
            enrichedAt: new Date(),
            enrichmentStatus: 'enriched'
          }
        });
        console.log(`✅ Company ${company.name} enriched successfully`);
      })
      .catch(async (error) => {
        await prisma.company.update({
          where: { id },
          data: { enrichmentStatus: 'failed' }
        });
        console.error(`❌ Failed to enrich company ${company.name}:`, error);
      });

    res.json({
      message: 'Company enrichment started',
      status: 'enriching'
    });

  } catch (error) {
    console.error('Enrichment endpoint error:', error);
    next(error);
  }
});

// POST /api/companies - Create new company
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      domain,
      industry,
      size,
      description,
      website,
      location,
    } = req.body;

    const company = await prisma.company.create({
      data: {
        name,
        domain,
        industry,
        size,
        description,
        website,
        location,
        userId: req.user!.id,
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    res.status(201).json({ company });
  } catch (error) {
    next(error);
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      domain,
      industry,
      size,
      description,
      website,
      location,
    } = req.body;

    // Verify ownership before update
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        domain,
        industry,
        size,
        description,
        website,
        location,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    res.json({ company });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/companies/:id - Delete company
router.delete('/:id', async (req, res, next) => {
  try {
    const { id} = req.params;

    // Verify ownership before delete
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Soft delete - mark as inactive
    await prisma.company.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

      res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/import - Import companies from CSV
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // AI Field Mapping for Companies
    const headers = Object.keys(records[0]);
    const fieldMapping = mapCSVFieldsToCompany(headers);

    const importedCompanies = [];
    const errors = [];
    let duplicates = 0;

    for (const record of records) {
      try {
        const companyData = parseCompanyData(record, fieldMapping);

        // Skip if no name
        if (!companyData.name || !companyData.name.trim()) {
          continue;
        }

        // Check for duplicate
        const existing = await prisma.company.findFirst({
          where: {
            name: companyData.name,
            userId,
          },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        // Create company
        const company = await prisma.company.create({
          data: {
            ...companyData,
            userId,
            dataSource: 'csv_import',
          },
        });

        importedCompanies.push(company);
      } catch (error: any) {
        errors.push(`Row error: ${error.message}`);
      }
    }

    res.json({
      message: 'Company import completed',
      totalProcessed: records.length,
      imported: importedCompanies.length,
      duplicates,
      errors: errors.length > 0 ? errors : undefined,
      companies: importedCompanies,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/upload-details - Upload company details via CSV
router.post('/:id/upload-details', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify ownership
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // Take the first record (assuming one company per upload)
    const record: any = records[0];

    // Map CSV fields to company fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map common fields
    if (record.website || record.Website || record.WEBSITE) {
      updateData.website = record.website || record.Website || record.WEBSITE;
    }
    if (record.industry || record.Industry || record.INDUSTRY) {
      updateData.industry = record.industry || record.Industry || record.INDUSTRY;
    }
    if (record.size || record.Size || record.SIZE || record.companySize) {
      updateData.size = record.size || record.Size || record.SIZE || record.companySize;
    }
    if (record.location || record.Location || record.LOCATION || record.headquarters) {
      updateData.location = record.location || record.Location || record.LOCATION || record.headquarters;
    }
    if (record.description || record.Description || record.DESCRIPTION) {
      updateData.description = record.description || record.Description || record.DESCRIPTION;
    }
    if (record.linkedin || record.LinkedIn || record.LINKEDIN) {
      updateData.linkedin = record.linkedin || record.LinkedIn || record.LINKEDIN;
    }
    if (record.domain || record.Domain || record.DOMAIN) {
      updateData.domain = record.domain || record.Domain || record.DOMAIN;
    }
    if (record.employeeCount || record['Employee Count'] || record.employees) {
      updateData.employeeCount = record.employeeCount || record['Employee Count'] || record.employees;
    }
    if (record.revenue || record.Revenue || record.REVENUE) {
      updateData.revenue = record.revenue || record.Revenue || record.REVENUE;
    }
    if (record.foundedYear || record['Founded Year'] || record.founded) {
      updateData.foundedYear = parseInt(record.foundedYear || record['Founded Year'] || record.founded);
    }
    if (record.phone || record.Phone || record.PHONE) {
      updateData.phone = record.phone || record.Phone || record.PHONE;
    }

    // Track which fields came from CSV
    const fieldSources = existingCompany.fieldSources as any || {};
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedAt') {
        fieldSources[key] = 'csv_upload';
      }
    });
    updateData.fieldSources = fieldSources;

    // Mark data source as CSV upload
    updateData.dataSource = 'csv_upload';
    updateData.importedAt = new Date();

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    res.json({
      message: 'Company details uploaded successfully from CSV',
      company: updatedCompany,
      fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'fieldSources'),
      dataSource: 'csv_upload',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/manual-update - Update company details manually
router.post('/:id/manual-update', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const {
      website,
      industry,
      size,
      location,
      description,
      linkedin,
      domain,
      employeeCount,
      revenue,
      foundedYear,
      phone,
      email,
    } = req.body;

    // Verify ownership
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add provided fields
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;
    if (size !== undefined) updateData.size = size;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (domain !== undefined) updateData.domain = domain;
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount;
    if (revenue !== undefined) updateData.revenue = revenue;
    if (foundedYear !== undefined) updateData.foundedYear = foundedYear;
    if (phone !== undefined) updateData.phone = phone;

    // Track which fields came from manual research
    const fieldSources = existingCompany.fieldSources as any || {};
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedAt') {
        fieldSources[key] = 'manual_research';
      }
    });
    updateData.fieldSources = fieldSources;

    // Mark data source as manual if not already set
    if (!existingCompany.dataSource || existingCompany.dataSource === 'manual') {
      updateData.dataSource = 'manual_research';
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    res.json({
      message: 'Company details updated manually',
      company: updatedCompany,
      fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'fieldSources'),
      dataSource: 'manual_research',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/enrich - Enrich companies with AI (placeholder)
router.post('/enrich', async (req, res, next) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ error: 'Companies array is required' });
    }

    // For now, just return the companies as-is
    // In the future, integrate with real enrichment APIs (Clearbit, Hunter.io, etc.)
    const enrichedCompanies = companies.map(company => ({
      ...company,
      enriched: false,
      aiEnhanced: [],
    }));

    res.json({
      message: 'Company enrichment completed',
      companies: enrichedCompanies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * AI Field Mapping for Companies
 * Automatically detects and maps CSV columns to company fields
 */
function mapCSVFieldsToCompany(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');

    if (normalized.match(/^(company.*name|name|business.*name)$/)) mapping[header] = 'name';
    else if (normalized.match(/domain|companywebsite/)) mapping[header] = 'domain';
    else if (normalized.match(/^(website|url|site)$/)) mapping[header] = 'website';
    else if (normalized.match(/industry|sector|vertical/)) mapping[header] = 'industry';
    else if (normalized.match(/location|city|address|headquarters|hq/)) mapping[header] = 'location';
    else if (normalized.match(/size|companysize|employees/)) mapping[header] = 'size';
    else if (normalized.match(/description|about|overview/)) mapping[header] = 'description';
    else if (normalized.match(/phone|telephone|tel/)) mapping[header] = 'phone';
    else if (normalized.match(/revenue|annualrevenue/)) mapping[header] = 'revenue';
    else if (normalized.match(/employeecount|headcount|numberofemployees/)) mapping[header] = 'employeeCount';
    else mapping[header] = `custom_${header}`;
  });

  return mapping;
}

/**
 * Parse company data from CSV record
 */
function parseCompanyData(record: any, fieldMapping: Record<string, string>): any {
  const companyData: any = {};

  for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
    const value = record[csvHeader]?.trim();
    if (!value) continue;

    // Handle custom fields
    if (dbField.startsWith('custom_')) {
      continue; // Skip custom fields for now
    }

    // Map standard fields
    companyData[dbField] = value;
  }

  // Extract domain from website if not provided
  if (companyData.website && !companyData.domain) {
    try {
      const url = companyData.website.startsWith('http')
        ? companyData.website
        : 'https://' + companyData.website;
      const urlObj = new URL(url);
      companyData.domain = urlObj.hostname;
    } catch (error) {
      // Invalid URL, skip domain extraction
    }
  }

  return companyData;
}

export default router;