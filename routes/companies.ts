import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
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
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      industry,
      minRevenue,
      maxRevenue,
      minEmployees,
      maxEmployees
    } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
      industry?: string;
      minRevenue?: string;
      maxRevenue?: string;
      minEmployees?: string;
      maxEmployees?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with team collaboration support
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    const teamAccessConditions = [
      { userId: userId },
      ...(req.user?.teamRole === 'OWNER' ? [{
        user: {
          OR: [
            { id: accountOwnerId },
            { accountOwnerId: accountOwnerId }
          ]
        }
      }] : []),
      { shares: { some: { userId: userId } } }
    ];

    const where: any = {
      isActive: true,
      AND: [
        { OR: teamAccessConditions }
      ]
    };

    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    // Industry filter
    if (industry) {
      where.AND.push({
        industry: { contains: industry, mode: 'insensitive' }
      });
    }

    // Revenue filters (intelligent parsing)
    if (minRevenue || maxRevenue) {
      const revenueConditions: any = {};
      if (minRevenue) {
        revenueConditions.gte = minRevenue;
      }
      if (maxRevenue) {
        revenueConditions.lte = maxRevenue;
      }
      where.AND.push({
        revenue: revenueConditions
      });
    }

    // Employee count filters (intelligent parsing)
    if (minEmployees || maxEmployees) {
      const employeeConditions: any = {};
      if (minEmployees) {
        employeeConditions.gte = minEmployees;
      }
      if (maxEmployees) {
        employeeConditions.lte = maxEmployees;
      }
      where.AND.push({
        employeeCount: employeeConditions
      });
    }

    // Build orderBy clause
    let orderBy: any = {};
    const validSortFields = ['name', 'industry', 'revenue', 'employeeCount', 'createdAt', 'foundedYear'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    orderBy[sortField] = order;

    // Get companies with contact count and contact details
    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
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
      orderBy,
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
            contacts: {
              where: {
                isActive: true,
              },
            },
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

    // Extract domain from website if not provided
    let finalDomain = domain;
    if (!finalDomain && website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        const hostname = new URL(url).hostname;
        finalDomain = hostname.replace(/^www\./, '');
      } catch (e) {
        // If URL parsing fails, try simple extraction
        finalDomain = website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        domain: finalDomain,
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
            contacts: {
              where: {
                isActive: true,
              },
            },
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

    // Extract domain from website if not provided
    let finalDomain = domain;
    if (!finalDomain && website) {
      try {
        const url = website.startsWith('http') ? website : `https://${website}`;
        const hostname = new URL(url).hostname;
        finalDomain = hostname.replace(/^www\./, '');
      } catch (e) {
        // If URL parsing fails, try simple extraction
        finalDomain = website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      }
    }

    // SECURITY FIX: Atomic update with ownership check to prevent race condition
    // This ensures the userId check and update happen in a single operation
    const company = await prisma.company.update({
      where: {
        id,
        userId: req.user?.id, // Atomic ownership check
      },
      data: {
        name,
        domain: finalDomain,
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
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    res.json({ company });
  } catch (error: any) {
    // Handle record not found error
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Company not found' });
    }
    next(error);
  }
});

// DELETE /api/companies/:id - Delete company
router.delete('/:id', async (req, res, next) => {
  try {
    const { id} = req.params;

    // SECURITY FIX: Atomic soft delete with ownership check to prevent race condition
    // Soft delete - mark as inactive
    await prisma.company.update({
      where: {
        id,
        userId: req.user?.id, // Atomic ownership check
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    // Handle record not found error
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Company not found' });
    }
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
    const duplicateNames: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const record of records) {
      try {
        const companyData = parseCompanyData(record, fieldMapping);

        // Skip if no name
        if (!companyData.name || !companyData.name.trim()) {
          continue;
        }

        // Check for duplicate (case-insensitive)
        const existing = await prisma.company.findFirst({
          where: {
            name: {
              equals: companyData.name,
              mode: 'insensitive',
            },
            userId,
          },
        });

        if (existing) {
          // Track duplicate company name for UI display
          duplicateNames.push(companyData.name);

          // Update existing company with new data (optional fields only)
          const updateData: any = {};
          if (companyData.website) updateData.website = companyData.website;
          if (companyData.linkedin) updateData.linkedin = companyData.linkedin;
          if (companyData.industry) updateData.industry = companyData.industry;
          if (companyData.location) updateData.location = companyData.location;
          if (companyData.size) updateData.size = companyData.size;
          if (companyData.description) updateData.description = companyData.description;
          if (companyData.phone) updateData.phone = companyData.phone;
          if (companyData.revenue) updateData.revenue = companyData.revenue;
          if (companyData.employeeCount) updateData.employeeCount = companyData.employeeCount;
          if (companyData.domain) updateData.domain = companyData.domain;

          // Only update if there's new data
          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            const updated = await prisma.company.update({
              where: { id: existing.id },
              data: updateData,
              include: {
                _count: {
                  select: {
                    contacts: {
                      where: {
                        isActive: true,
                      },
                    },
                  },
                },
              },
            });
            importedCompanies.push(updated);
            updatedCount++;
          } else {
            // No new data, just skip
            continue;
          }
        } else {
          // Create new company
          const company = await prisma.company.create({
            data: {
              ...companyData,
              userId,
              dataSource: 'csv_import',
            },
            include: {
              _count: {
                select: {
                  contacts: {
                    where: {
                      isActive: true,
                    },
                  },
                },
              },
            },
          });

          importedCompanies.push(company);
          createdCount++;
        }
      } catch (error: any) {
        errors.push(`Row error: ${error.message}`);
      }
    }

    // Calculate skipped (duplicates with no new data)
    const skippedCount = duplicateNames.length - updatedCount;

    res.json({
      success: errors.length === 0,
      total: records.length,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      duplicates: duplicateNames.length > 0 ? duplicateNames : undefined,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? 'Company import completed successfully'
        : 'Company import completed with errors',
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
            contacts: {
              where: {
                isActive: true,
              },
            },
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
            contacts: {
              where: {
                isActive: true,
              },
            },
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
    else if (normalized.match(/linkedin|linkedinurl|linkedinprofile|companylinkedin/)) mapping[header] = 'linkedin';
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

// ==========================================
// ASSIGNMENT ENDPOINTS
// ==========================================

// GET /api/companies/assigned-to-me - Get all companies assigned to current user
// NOTE: This must come BEFORE /:id routes to avoid route conflict
router.get('/assigned-to-me', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const {
      page = '1',
      limit = '10'
    } = req.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const companies = await prisma.company.findMany({
      where: {
        assignedToId: userId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            contacts: true,
            deals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.company.count({
      where: {
        assignedToId: userId,
        isActive: true
      }
    });

    res.json({
      companies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/bulk-assign - Bulk assign multiple companies to a team member
router.post('/bulk-assign', async (req, res, next) => {
  try {
    const { companyIds, assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({ error: 'companyIds array is required' });
    }

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || (targetUser.accountOwnerId !== accountOwnerId && targetUser.id !== accountOwnerId)) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Only update companies that user owns or is account owner
    const whereClause = req.user?.teamRole === 'OWNER'
      ? { id: { in: companyIds } }
      : { id: { in: companyIds }, userId };

    const result = await prisma.company.updateMany({
      where: whereClause,
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Companies assigned successfully',
      assignedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/assign - Assign company to a team member
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Check if company exists and user has permission
    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only owner or company creator can assign
    if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to assign this company' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || targetUser.accountOwnerId !== accountOwnerId) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Assign the company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Company assigned successfully',
      company: updatedCompany
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/unassign - Unassign company from team member
router.post('/:id/unassign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if company exists and user has permission
    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only owner or company creator can unassign
    if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to unassign this company' });
    }

    // Unassign the company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { assignedToId: null }
    });

    res.json({
      message: 'Company unassigned successfully',
      company: updatedCompany
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/companies/:id/employees - Fetch LinkedIn employees for a company
router.get('/:id/employees', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = '10', enrich = 'false' } = req.query as { limit?: string; enrich?: string };

    // Get company with LinkedIn URL
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        linkedin: true,
        userId: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check ownership
    const accountOwnerId = getAccountOwnerId(req);
    if (company.userId !== accountOwnerId && company.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have permission to access this company' });
    }

    // Check if LinkedIn URL exists
    if (!company.linkedin) {
      return res.status(400).json({
        error: 'No LinkedIn URL set for this company',
        message: 'Please add a LinkedIn company URL to fetch employees'
      });
    }

    // Import RapidAPI LinkedIn service (replaces Proxycurl which shut down in July 2025)
    const rapidApiService = await import('../services/rapidapi-linkedin.service');

    // Fetch employees from RapidAPI
    const employees = await rapidApiService.fetchCompanyEmployees(company.linkedin, {
      limit: parseInt(limit),
      enrichProfiles: enrich === 'true',
      useCache: true
    });

    // Return employees
    res.json({
      companyId: company.id,
      companyName: company.name,
      linkedinUrl: company.linkedin,
      employeeCount: employees.length,
      employees: employees
    });

  } catch (error: any) {
    console.error('Error fetching company employees:', error);

    if (error.message?.includes('RAPIDAPI_KEY')) {
      return res.status(503).json({
        error: 'LinkedIn employee data service not configured',
        message: 'Please contact support to enable this feature'
      });
    }

    if (error.message?.includes('rate limit exceeded')) {
      return res.status(429).json({
        error: 'API rate limit exceeded',
        message: 'Please try again in a few minutes'
      });
    }

    next(error);
  }
});

// POST /api/companies/:id/employees/import - Import LinkedIn employees as contacts
router.post('/:id/employees/import', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeUrls } = req.body as { employeeUrls: string[] };

    if (!employeeUrls || !Array.isArray(employeeUrls) || employeeUrls.length === 0) {
      return res.status(400).json({ error: 'employeeUrls array is required' });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        userId: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check ownership
    const accountOwnerId = getAccountOwnerId(req);
    if (company.userId !== accountOwnerId && company.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have permission to import contacts for this company' });
    }

    // Import RapidAPI LinkedIn service (replaces Proxycurl which shut down in July 2025)
    const rapidApiService = await import('../services/rapidapi-linkedin.service');

    const importedContacts = [];
    const errors = [];

    // Process each employee URL
    for (const linkedinUrl of employeeUrls) {
      try {
        // Get person profile from RapidAPI
        const profile = await rapidApiService.getPersonProfile(linkedinUrl);

        // Create contact in database
        const contact = await prisma.contact.create({
          data: {
            firstName: profile.first_name || 'Unknown',
            lastName: profile.last_name || 'Name',
            email: profile.email || undefined,
            phone: profile.phone || undefined,
            title: profile.occupation || profile.headline || undefined,
            linkedin: linkedinUrl,
            status: 'LEAD',
            companyId: company.id,
            userId: company.userId,
            source: 'LinkedIn Import',
            notes: `Imported from LinkedIn via RapidAPI on ${new Date().toISOString()}`
          }
        });

        importedContacts.push(contact);
      } catch (error: any) {
        console.error(`Error importing employee ${linkedinUrl}:`, error.message);
        errors.push({
          linkedinUrl,
          error: error.message
        });
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      message: `Imported ${importedContacts.length} employees as contacts`,
      imported: importedContacts.length,
      errors: errors.length,
      contacts: importedContacts,
      errorDetails: errors
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/find-linkedin - Auto-find LinkedIn company URL
router.post('/:id/find-linkedin', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get company
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        linkedin: true,
        userId: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check ownership
    const accountOwnerId = getAccountOwnerId(req);
    if (company.userId !== accountOwnerId && company.userId !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have permission to update this company' });
    }

    // Check if LinkedIn URL already exists
    if (company.linkedin && company.linkedin.includes('linkedin.com/company/')) {
      return res.json({
        success: true,
        linkedinUrl: company.linkedin,
        updated: false,
        message: 'Company already has a valid LinkedIn URL'
      });
    }

    // Import LinkedIn URL finder service
    const linkedinFinder = await import('../services/linkedin-url-finder.service');

    // Find LinkedIn URL
    const result = await linkedinFinder.findLinkedInCompanyUrl(
      company.name,
      company.website || undefined
    );

    if (!result || !result.linkedinUrl) {
      return res.status(404).json({
        error: 'LinkedIn URL not found',
        message: 'Could not automatically find LinkedIn company URL. Please add it manually.',
        suggestions: [
          `Search Google for: "${company.name} LinkedIn company"`,
          'Look for URLs with /company/ in them',
          'Update the LinkedIn field manually'
        ]
      });
    }

    // Update company with found LinkedIn URL
    const updated = await prisma.company.update({
      where: { id },
      data: { linkedin: result.linkedinUrl }
    });

    res.json({
      success: true,
      linkedinUrl: result.linkedinUrl,
      confidence: result.confidence,
      method: result.method,
      updated: true,
      message: `LinkedIn URL found and saved (confidence: ${result.confidence})`
    });

  } catch (error: any) {
    console.error('Error finding LinkedIn URL:', error);

    if (error.message?.includes('RAPIDAPI_KEY')) {
      return res.status(503).json({
        error: 'API not configured',
        message: 'LinkedIn URL lookup service is not configured'
      });
    }

    next(error);
  }
});

// GET /api/companies/rapidapi/usage - Check RapidAPI usage (replaces Proxycurl credits endpoint)
router.get('/rapidapi/usage', async (req, res, next) => {
  try {
    // Check if user is account owner
    const accountOwnerId = getAccountOwnerId(req);
    if (accountOwnerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only account owners can check API usage' });
    }

    // Import RapidAPI service
    const rapidApiService = await import('../services/rapidapi-linkedin.service');

    // Check usage
    const usageInfo = await rapidApiService.checkCredits();

    res.json(usageInfo);
  } catch (error: any) {
    console.error('Error checking RapidAPI usage:', error);

    if (error.message?.includes('RAPIDAPI_KEY')) {
      return res.status(503).json({
        error: 'RapidAPI not configured',
        message: 'Please add RAPIDAPI_KEY to environment variables'
      });
    }

    next(error);
  }
});

export default router;