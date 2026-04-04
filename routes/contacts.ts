import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { validatePhoneNumber, validateEmail, validateContactData } from '../utils/validation';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all contact routes
router.use(authenticate);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/contacts - Get all contacts with pagination and search
router.get('/', async (req, res, next) => {
  try {
    const { 
      search, 
      status, 
      page = '1', 
      limit = '10' 
    } = req.query as {
      search?: string;
      status?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with team collaboration support
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    // Team collaboration: Show contacts that are:
    // 1. Owned by the user
    // 2. Owned by team members (if user is account owner)
    // 3. Shared with the user
    const teamAccessConditions = [
      { userId: userId }, // User's own contacts
      ...(req.user?.teamRole === 'OWNER' ? [{
        user: {
          OR: [
            { id: accountOwnerId },
            { accountOwnerId: accountOwnerId }
          ]
        }
      }] : []),
      { shares: { some: { userId: userId } } } // Shared contacts
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
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    if (status && status !== '') {
      where.status = status;
    }

    // Get contacts with relations
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            industry: true,
          },
        },
        tags: {
          include: {
            tag: true,
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
    const total = await prisma.contact.count({ where });

    // Transform the data
    const transformedContacts = contacts.map(contact => ({
      ...contact,
      tags: contact.tags.map(ct => ct.tag),
    }));

    res.json({
      contacts: transformedContacts,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/status - Get contact statistics (for debugging)
// IMPORTANT: This must come BEFORE /:id route to avoid route matching issues
router.get('/status', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;

    // Use Prisma's ORM methods - let Prisma handle the table name mapping
    const allContacts = await prisma.contact.findMany({
      where: { userId },
      select: { id: true, isActive: true }
    });

    const totalCount = allContacts.length;
    const activeCount = allContacts.filter(c => c.isActive === true).length;
    const inactiveCount = allContacts.filter(c => c.isActive === false || c.isActive === null).length;

    // Debug: Check if contacts exist for OTHER users (to see if data exists at all)
    const totalContactsAllUsers = await prisma.contact.count();
    const allUsers = await prisma.user.count();

    res.json({
      total: totalCount,
      active: activeCount,
      inactive: inactiveCount,
      message: inactiveCount > 0
        ? `You have ${inactiveCount} hidden contacts. Use POST /api/contacts/activate-all to show them.`
        : totalCount === activeCount && totalCount > 0
        ? 'All contacts are active and visible.'
        : 'Database migration needed: isActive column not found',
      debug: {
        yourUserId: userId,
        totalContactsInDatabase: totalContactsAllUsers,
        totalUsersInDatabase: allUsers,
        hint: totalContactsAllUsers > 0 && totalCount === 0
          ? 'Contacts exist but belong to a different user account. You may be logged in as the wrong user.'
          : totalContactsAllUsers === 0
          ? 'No contacts found in entire database. Data may have been deleted or never imported.'
          : 'OK'
      }
    });
  } catch (error: any) {
    console.error('Status endpoint error:', error);
    res.status(500).json({
      error: error.constructor.name || 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/contacts/:id - Get single contact
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id, // Only allow access to user's own contacts
      },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Transform the data
    const transformedContact = {
      ...contact,
      tags: contact.tags.map(ct => ct.tag),
    };

    return res.json({ contact: transformedContact });
  } catch (error) {
    return next(error);
  }
});

// POST /api/contacts - Create new contact
router.post('/', async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      companyId,
      companyName, // NEW: Allow creating company by name
      status = 'LEAD',
      tagIds = [],
    } = req.body;

    // Validate contact data
    const validation = validateContactData({ firstName, lastName, email, phone });
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.errors.join(', '),
        errors: validation.errors
      });
    }

    // Handle company creation/lookup if companyName provided
    let finalCompanyId = companyId || null;

    if (!companyId && companyName && companyName.trim()) {
      const companyNameTrimmed = companyName.trim();

      // Check if company already exists
      const existingCompany = await prisma.company.findFirst({
        where: {
          userId: req.user!.id,
          name: companyNameTrimmed,
        },
      });

      if (existingCompany) {
        console.log('🏢 Using existing company:', existingCompany.name);
        finalCompanyId = existingCompany.id;
      } else {
        // Create new company
        console.log('🏢 Creating new company:', companyNameTrimmed);
        const newCompany = await prisma.company.create({
          data: {
            name: companyNameTrimmed,
            dataSource: 'manual_contact', // Mark as created from contact form
            userId: req.user!.id,
          },
        });
        finalCompanyId = newCompany.id;
        console.log('✅ Company created:', newCompany.id);
      }
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email && email.trim() ? email.trim() : null,
        phone: phone && phone.trim() ? phone.trim() : null,
        role: role && role.trim() ? role.trim() : null,
        status,
        companyId: finalCompanyId,
        userId: req.user!.id,
        isActive: true, // FIX: Set isActive to true so contacts are visible in the list
      },
      include: {
        company: true,
      },
    });

    // Add tags if provided
    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId: string) => ({
          contactId: contact.id,
          tagId,
        })),
      });
    }

    // Fetch the complete contact with tags
    const completeContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const transformedContact = {
      ...completeContact,
      tags: completeContact?.tags.map(ct => ct.tag) || [],
    };

    res.status(201).json({ contact: transformedContact });
  } catch (error: any) {
    // Handle unique constraint violation for email
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({
        error: 'This email address is already in use. Please use a different email or leave it blank.'
      });
    }
    next(error);
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      companyId,
      status,
      tagIds = [],
    } = req.body;

    // Verify ownership before update
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Only validate if we're updating contact details (not just status/assignment fields)
    if (firstName !== undefined || lastName !== undefined || email !== undefined || phone !== undefined) {
      const validation = validateContactData({
        firstName: firstName || existingContact.firstName,
        lastName: lastName || existingContact.lastName,
        email,
        phone
      });
      if (!validation.isValid) {
        return res.status(400).json({
          error: validation.errors.join(', '),
          errors: validation.errors
        });
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (companyId !== undefined) updateData.companyId = companyId || null;

    // SECURITY FIX: Atomic update with ownership check to prevent race condition
    const contact = await prisma.contact.update({
      where: {
        id,
        userId: req.user?.id, // Atomic ownership check
      },
      data: updateData,
      include: {
        company: true,
      },
    });

    // Update tags - remove old ones and add new ones
    await prisma.contactTag.deleteMany({
      where: { contactId: id },
    });

    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId: string) => ({
          contactId: id,
          tagId,
        })),
      });
    }

    // Fetch the complete contact with tags
    const completeContact = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const transformedContact = {
      ...completeContact,
      tags: completeContact?.tags.map(ct => ct.tag) || [],
    };

    res.json({ contact: transformedContact });
  } catch (error: any) {
    // Handle record not found error
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contact not found' });
    }
    next(error);
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    // Build team access conditions for deletion
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

    // Verify ownership or team access before delete
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        isActive: true,
        OR: teamAccessConditions
      },
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found or you do not have permission to delete it' });
    }

    // SECURITY FIX: Soft delete with ownership verification
    // Note: We keep the findFirst above for team access check, but ensure the actual delete
    // operation checks userId to prevent race conditions
    await prisma.contact.updateMany({
      where: {
        id,
        OR: teamAccessConditions, // Atomic check with team access conditions
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error: any) {
    // Handle record not found error
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Contact not found' });
    }
    next(error);
  }
});

// AI Field Mapping Function - Enhanced to detect CSV type and preserve ALL fields
function mapCSVFieldsToContact(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');

    // Email detection (more permissive)
    if (normalized.match(/email|e-?mail|mail|contact.*email|email.*address/)) {
      mapping[header] = 'email';
    }
    // Phone detection (more permissive)
    else if (normalized.match(/phone|mobile|cell|telephone|tel|contact.*phone|phone.*number|phonenumber/)) {
      mapping[header] = 'phone';
    }
    // Name fields
    else if (normalized.match(/^(first.*name|fname|givenname|firstname)$/)) {
      mapping[header] = 'firstName';
    }
    else if (normalized.match(/^(last.*name|lname|surname|familyname|lastname)$/)) {
      mapping[header] = 'lastName';
    }
    else if (normalized === 'fullname' || normalized === 'name' || normalized === 'contactname') {
      mapping[header] = 'fullName';
    }
    // Job title/role
    else if (normalized.match(/title|position|jobtitle|designation|job/)) {
      mapping[header] = 'title';
    }
    else if (normalized.match(/role|jobrole/)) {
      mapping[header] = 'role';
    }
    // Company
    else if (normalized.match(/^(company|organization|employer|business|companyname|orgname)$/)) {
      mapping[header] = 'company';
    }
    // Company details
    else if (normalized.match(/industry|sector|vertical/)) {
      mapping[header] = 'companyIndustry';
    }
    else if (normalized.match(/companysize|employeecount|employees|headcount|size/)) {
      mapping[header] = 'companySize';
    }
    else if (normalized.match(/companylocation|companycity|companyaddress|headquarters|hq|location/)) {
      mapping[header] = 'companyLocation';
    }
    else if (normalized.match(/website|companywebsite|url|domain|site/)) {
      mapping[header] = 'companyWebsite';
    }
    else if (normalized.match(/companydescription|aboutcompany|companyinfo/)) {
      mapping[header] = 'companyDescription';
    }
    else if (normalized.match(/revenue|annualrevenue|sales/)) {
      mapping[header] = 'companyRevenue';
    }
    else if (normalized.match(/linkedin|linkedinurl|companylinkedin|li|linkedinprofile/)) {
      mapping[header] = 'companyLinkedIn';
    }
    else if (normalized.match(/founded|foundedyear|yearfounded/)) {
      mapping[header] = 'companyFoundedYear';
    }
    else if (normalized.match(/companyphone|mainphone|officenumber/)) {
      mapping[header] = 'companyPhone';
    }
    // Lead status
    else if (normalized.match(/status|stage|leadstatus|lead/)) {
      mapping[header] = 'status';
    }
    // Notes
    else if (normalized.match(/note|comment|description|remark|notes|comments/)) {
      mapping[header] = 'notes';
    }
    // IMPORTANT: Everything else becomes a custom field with original header name
    else {
      // Keep original header name for custom fields (more readable)
      mapping[header] = `custom_${header}`;
      console.log(`📋 Custom field detected: "${header}" → will be stored in customFields`);
    }
  });

  console.log('🗺️ Field mapping complete:', {
    standardFields: Object.values(mapping).filter(v => !v.startsWith('custom_')).length,
    customFields: Object.values(mapping).filter(v => v.startsWith('custom_')).length
  });

  return mapping;
}

/**
 * Detect CSV type based on headers
 */
function detectCSVType(fieldMapping: Record<string, string>): 'contact' | 'company' | 'mixed' {
  const fields = Object.values(fieldMapping);

  const hasContactFields = fields.some(f =>
    ['firstName', 'lastName', 'fullName', 'email', 'phone'].includes(f)
  );

  const hasCompanyOnlyFields = fields.some(f =>
    f.startsWith('company') && !['company'].includes(f)
  );

  const hasCompanyName = fields.includes('company');

  // If has contact fields (name or email), treat as contact import
  if (hasContactFields) {
    return hasCompanyName || hasCompanyOnlyFields ? 'mixed' : 'contact';
  }

  // If only has company fields, treat as company import
  if (hasCompanyName || hasCompanyOnlyFields) {
    return 'company';
  }

  // Default to contact (will be skipped if no valid data)
  return 'contact';
}

// Helper functions for CSV import

/**
 * Parse contact data from CSV record
 */
function parseContactData(record: any, fieldMapping: Record<string, string>) {
  const contactData: any = { customFields: {}, fieldSources: {} };
  const companyData: any = { fieldSources: {} };

  for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
    const value = record[csvHeader]?.trim();
    if (!value) continue;

    if (dbField === 'fullName') {
      const nameParts = value.split(' ').filter(part => part.trim());
      if (nameParts.length > 0) {
        contactData.firstName = nameParts[0];
        contactData.lastName = nameParts.slice(1).join(' ') || '';
      }
    } else if (dbField.startsWith('company')) {
      parseCompanyField(dbField, value, companyData);
    } else if (dbField.startsWith('custom_')) {
      // Store custom field with ORIGINAL header name (not normalized)
      const fieldName = dbField.replace('custom_', '');
      contactData.customFields[fieldName] = value;
      console.log(`📌 Storing custom field: ${fieldName} = ${value}`);
    } else if (dbField === 'status') {
      const normalizedStatus = value.toUpperCase();
      if (['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER'].includes(normalizedStatus)) {
        contactData.status = normalizedStatus;
      }
    } else {
      contactData[dbField] = value;
      contactData.fieldSources[dbField] = 'csv_import';
    }
  }

  // Log summary of what we're storing
  const customFieldCount = Object.keys(contactData.customFields).length;
  if (customFieldCount > 0) {
    console.log(`✅ Contact has ${customFieldCount} custom fields:`, Object.keys(contactData.customFields));
  }

  return { contactData, companyData };
}

/**
 * Parse company-specific field
 */
function parseCompanyField(dbField: string, value: string, companyData: any) {
  if (dbField === 'company') companyData.name = value;
  else if (dbField === 'companyIndustry') companyData.industry = value;
  else if (dbField === 'companySize') companyData.size = value;
  else if (dbField === 'companyLocation') companyData.location = value;
  else if (dbField === 'companyWebsite') companyData.website = value;
  else if (dbField === 'companyDescription') companyData.description = value;
  else if (dbField === 'companyRevenue') companyData.revenue = value;
  else if (dbField === 'companyLinkedIn') companyData.linkedin = value;
  else if (dbField === 'companyFoundedYear') {
    const year = Number.parseInt(value);
    if (!isNaN(year)) companyData.foundedYear = year;
  }
  else if (dbField === 'companyPhone') companyData.phone = value;
}

/**
 * Check if contact already exists (duplicate detection)
 */
async function checkDuplicateContact(contactData: any, companyData: any, userId: string) {
  const duplicateChecks = [];

  if (contactData.email) {
    duplicateChecks.push({ email: contactData.email, userId, isActive: true });
  }
  if (contactData.firstName && contactData.lastName && companyData.name) {
    duplicateChecks.push({
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      company: { name: companyData.name },
      userId,
      isActive: true
    });
  }
  if (!contactData.email && contactData.phone) {
    duplicateChecks.push({ phone: contactData.phone, userId, isActive: true });
  }

  if (duplicateChecks.length > 0) {
    return await prisma.contact.findFirst({
      where: {
        OR: duplicateChecks,
        isActive: true  // FIX: Only check for duplicates among active contacts
      }
    });
  }

  return null;
}

/**
 * Find or create company for contact
 * Returns { id, wasCreated, company } to track newly created companies
 */
async function findOrCreateCompany(companyData: any, userId: string): Promise<{ id: string; wasCreated: boolean; company: any } | null> {
  if (!companyData.name) return null;

  // Generate domain only if we have a valid website
  let domain = null;
  if (companyData.website && companyData.website.trim()) {
    try {
      const url = companyData.website.startsWith('http') ? companyData.website : 'https://' + companyData.website;
      const hostname = new URL(url).hostname;
      // Remove www. prefix
      domain = hostname.replace(/^www\./, '');

      // Skip generic domains like linkedin.com
      if (domain.includes('linkedin.com') || domain.includes('facebook.com') || domain.includes('twitter.com')) {
        domain = null;
      }
    } catch (error) {
      // Invalid URL, try simple extraction as fallback
      try {
        domain = companyData.website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
        // Skip generic domains
        if (domain.includes('linkedin.com') || domain.includes('facebook.com') || domain.includes('twitter.com')) {
          domain = null;
        }
      } catch {
        domain = null;
      }
    }
  }

  // Find company ONLY by exact name match to avoid incorrect grouping
  let company = await prisma.company.findFirst({
    where: {
      name: companyData.name,
      userId
    }
  });

  if (company) {
    // Found existing company
    return { id: company.id, wasCreated: false, company };
  }

  // Create new company
  const companyCreateData: any = {
    name: companyData.name,
    userId,
    dataSource: 'csv_import',
    fieldSources: companyData.fieldSources,
    domain
  };

  // Add optional fields
  if (companyData.industry) companyCreateData.industry = companyData.industry;
  if (companyData.size) companyCreateData.size = companyData.size;
  if (companyData.location) companyCreateData.location = companyData.location;
  if (companyData.website) companyCreateData.website = companyData.website;
  if (companyData.description) companyCreateData.description = companyData.description;
  if (companyData.revenue) companyCreateData.revenue = companyData.revenue;
  if (companyData.linkedin) companyCreateData.linkedin = companyData.linkedin;
  if (companyData.foundedYear) companyCreateData.foundedYear = companyData.foundedYear;
  if (companyData.phone) companyCreateData.phone = companyData.phone;

  try {
    company = await prisma.company.create({ data: companyCreateData });
    return { id: company.id, wasCreated: true, company };
  } catch (error: any) {
    // Handle unique constraint violation on domain
    if (error.code === 'P2002') {
      delete companyCreateData.domain;
      company = await prisma.company.create({ data: companyCreateData });
      return { id: company.id, wasCreated: true, company };
    } else {
      throw error;
    }
  }
}

/**
 * Process a single CSV record and create contact
 */
async function processCSVRecord(record: any, fieldMapping: Record<string, string>, userId: string, fileName: string) {
  console.log('🔧 processCSVRecord - Starting...');
  const { contactData, companyData } = parseContactData(record, fieldMapping);
  console.log('🔧 processCSVRecord - Parsed contactData:', JSON.stringify(contactData, null, 2));
  console.log('🔧 processCSVRecord - Parsed companyData:', JSON.stringify(companyData, null, 2));

  // Skip contacts without a valid first name
  if (!contactData.firstName || !contactData.firstName.trim()) {
    console.log('⏭️  processCSVRecord - Skipping: No first name');
    return { skipped: true };
  }

  if (!contactData.lastName) contactData.lastName = '';

  // Validate phone number if provided
  if (contactData.phone) {
    const phoneValidation = validatePhoneNumber(contactData.phone);
    if (!phoneValidation.isValid) {
      console.log('❌ processCSVRecord - Invalid phone:', phoneValidation.error);
      return {
        error: true,
        message: `Invalid phone number for ${contactData.firstName} ${contactData.lastName}: ${phoneValidation.error}`
      };
    }
  }

  // Validate email if provided
  if (contactData.email) {
    const emailValidation = validateEmail(contactData.email);
    if (!emailValidation.isValid) {
      console.log('❌ processCSVRecord - Invalid email:', emailValidation.error);
      return {
        error: true,
        message: `Invalid email for ${contactData.firstName} ${contactData.lastName}: ${emailValidation.error}`
      };
    }
  }

  // Check for duplicates
  console.log('🔍 processCSVRecord - Checking for duplicates...');
  const existing = await checkDuplicateContact(contactData, companyData, userId);
  if (existing) {
    console.log('🔁 processCSVRecord - Duplicate found:', existing.id);
    return {
      duplicate: true,
      identifier: `${contactData.email || contactData.firstName + ' ' + contactData.lastName} (from ${fileName})`
    };
  }

  // Find or create company
  console.log('🏢 processCSVRecord - Finding/creating company...');
  const companyResult = await findOrCreateCompany(companyData, userId);
  const companyId = companyResult?.id || null;
  const companyCreated = companyResult?.wasCreated ? companyResult.company : null;
  console.log('🏢 processCSVRecord - Company ID:', companyId);
  if (companyCreated) {
    console.log('🏢 processCSVRecord - New company created:', companyCreated.name);
  }

  // Create contact
  console.log('👤 processCSVRecord - Creating contact with isActive: true...');
  const contactCreateData = {
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone,
    title: contactData.title,
    role: contactData.role,
    status: contactData.status || 'LEAD',
    notes: contactData.notes,
    companyId,
    userId,
    isActive: true, // FIX: Set isActive to true so imported contacts are visible in the list
    customFields: contactData.customFields,
    fieldSources: contactData.fieldSources
  };
  console.log('👤 processCSVRecord - Contact create data:', JSON.stringify(contactCreateData, null, 2));

  const contact = await prisma.contact.create({
    data: contactCreateData
  });

  console.log('✅ processCSVRecord - Contact created successfully:', contact.id, 'isActive:', contact.isActive);

  return { contact, companyCreated };
}

// POST /api/contacts/csv-import - AI CSV Import with multiple files
router.post('/csv-import', upload.array('files', 10), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    console.log('🔍 CSV IMPORT DEBUG - User ID:', userId);
    console.log('🔍 CSV IMPORT DEBUG - Files received:', files?.length || 0);

    if (!files || files.length === 0) {
      console.log('❌ CSV IMPORT DEBUG - No files uploaded');
      return res.status(400).json({ error: 'No CSV files uploaded' });
    }

    const allImportedContacts: any[] = [];
    const allImportedCompanies: any[] = [];
    const allErrors: string[] = [];
    const allDuplicates: string[] = [];
    const allSkipped: string[] = [];
    let totalProcessed = 0;
    let detectedTypes: string[] = [];

    for (const file of files) {
      try {
        console.log(`\n📄 CSV IMPORT DEBUG - Processing file: ${file.originalname}`);
        const csvContent = file.buffer.toString('utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        console.log(`📊 CSV IMPORT DEBUG - Records parsed: ${records.length}`);

        if (records.length === 0) {
          allErrors.push(`File ${file.originalname}: No valid records found`);
          continue;
        }

        const headers = Object.keys(records[0]);
        const fieldMapping = mapCSVFieldsToContact(headers);
        const csvType = detectCSVType(fieldMapping);

        console.log('🗺️ CSV IMPORT DEBUG - Field mapping:', JSON.stringify(fieldMapping, null, 2));
        console.log('📊 CSV IMPORT DEBUG - Detected CSV type:', csvType);

        detectedTypes.push(`${file.originalname}: ${csvType}`);

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          totalProcessed++;

          console.log(`\n🔄 CSV IMPORT DEBUG - Processing record ${i + 1}/${records.length}`);
          console.log('📝 CSV IMPORT DEBUG - Record data:', JSON.stringify(record, null, 2));

          const result = await processCSVRecord(record, fieldMapping, userId, file.originalname);

          console.log('✅ CSV IMPORT DEBUG - Process result:', JSON.stringify(result, null, 2));

          if (result.skipped) {
            allSkipped.push(`Record ${i + 1} from ${file.originalname}: Missing required fields`);
            console.log(`⏭️  CSV IMPORT DEBUG - Skipped record ${i + 1}`);
            continue;
          }

          if (result.duplicate) {
            allDuplicates.push(result.identifier!);
            console.log(`🔁 CSV IMPORT DEBUG - Duplicate found: ${result.identifier}`);
            continue;
          }

          if (result.error) {
            allErrors.push(result.message!);
            console.log(`❌ CSV IMPORT DEBUG - Error: ${result.message}`);
            continue;
          }

          if (result.contact) {
            allImportedContacts.push(result.contact);
            console.log(`✅ CSV IMPORT DEBUG - Contact created: ${result.contact.firstName} ${result.contact.lastName} (ID: ${result.contact.id})`);

            // Track if a new company was created
            if (result.companyCreated) {
              allImportedCompanies.push(result.companyCreated);
              console.log(`🏢 CSV IMPORT DEBUG - New company created: ${result.companyCreated.name}`);
            }
          }
        }
      } catch (error: any) {
        console.error(`❌ CSV IMPORT DEBUG - File processing error for ${file.originalname}:`, error);
        allErrors.push(`File ${file.originalname}: ${error.message}`);
      }
    }

    // Get unique companies (deduplicate by ID)
    const uniqueCompanies = Array.from(
      new Map(allImportedCompanies.map(c => [c.id, c])).values()
    );

    console.log('\n📊 CSV IMPORT DEBUG - Final Summary:');
    console.log(`   CSV Types Detected: ${detectedTypes.join(', ')}`);
    console.log(`   Total Processed: ${totalProcessed}`);
    console.log(`   Contacts Imported: ${allImportedContacts.length}`);
    console.log(`   Companies Created: ${uniqueCompanies.length}`);
    console.log(`   Duplicates: ${allDuplicates.length}`);
    console.log(`   Skipped: ${allSkipped.length}`);
    console.log(`   Errors: ${allErrors.length}`);

    // CRITICAL FIX: Check if 100% of records were skipped (total failure)
    if (allSkipped.length === totalProcessed && totalProcessed > 0) {
      const csvType = detectedTypes.length > 0 ? detectedTypes[0].split(': ')[1] : 'unknown';

      return res.status(422).json({
        success: false,
        error: 'CSV validation failed',
        message: csvType === 'company'
          ? 'All records were skipped because your CSV contains company information only. Contact imports require at least First Name or Full Name, and Email or Phone Number.'
          : 'All records were skipped due to missing required contact fields (First Name, Email, or Phone).',
        details: {
          detectedCsvType: csvType,
          totalRows: totalProcessed,
          validRows: 0,
          skippedRows: allSkipped.length,
          requiredFields: ['First Name or Full Name', 'Email or Phone Number'],
        },
        suggestions: csvType === 'company'
          ? [
              'Add contact information (Name, Email, Phone) to your CSV',
              'Or use the Bulk Import feature to import companies and contacts together',
              'Download a sample CSV template for reference'
            ]
          : [
              'Ensure your CSV has at least: First Name or Full Name',
              'Include Email or Phone Number for each contact',
              'Download a sample CSV template for reference'
            ]
      });
    }

    // CRITICAL FIX: Check if nothing was imported (complete failure)
    if (allImportedContacts.length === 0 && uniqueCompanies.length === 0 && allErrors.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Import failed: No records were successfully imported',
        message: 'None of the records in your CSV could be imported. Please check the format and try again.',
        details: {
          totalProcessed,
          contactsImported: 0,
          companiesCreated: 0,
          duplicates: allDuplicates.length,
          skipped: allSkipped.length,
          errors: allErrors.length
        },
        duplicatesList: allDuplicates,
        skippedList: allSkipped,
        errorsList: allErrors
      });
    }

    // CRITICAL FIX: Add success boolean field
    const success = allImportedContacts.length > 0 || uniqueCompanies.length > 0;

    const responseData = {
      success,
      message: success
        ? `CSV import completed successfully. ${allImportedContacts.length} contact(s) and ${uniqueCompanies.length} compan${uniqueCompanies.length === 1 ? 'y' : 'ies'} imported.`
        : 'CSV import completed with warnings',
      detectedTypes,
      totalProcessed,
      contactsImported: allImportedContacts.length,
      companiesCreated: uniqueCompanies.length,
      duplicates: allDuplicates.length,
      skipped: allSkipped.length,
      errors: allErrors.length,
      duplicatesList: allDuplicates,
      skippedList: allSkipped,
      errorsList: allErrors.length > 0 ? allErrors : undefined,
      contacts: allImportedContacts,
      companies: uniqueCompanies,
      // Legacy fields for backward compatibility
      imported: allImportedContacts.length
    };

    res.json(responseData);
  } catch (error) {
    console.error('❌ CSV IMPORT DEBUG - Fatal error:', error);
    next(error);
  }
});

// GET /api/contacts/detect-duplicates
router.get('/detect-duplicates', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const allContacts = await prisma.contact.findMany({
      where: { userId, isActive: true },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const duplicateGroups: any[] = [];
    const processedIds = new Set<string>();

    // Email duplicates
    const emailMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (contact.email) {
        const key = contact.email.toLowerCase();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(contact);
      }
    });

    emailMap.forEach((contacts, email) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'email',
          field: email,
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
        contacts.forEach(c => processedIds.add(c.id));
      }
    });

    // Phone duplicates
    const phoneMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (contact.phone && !processedIds.has(contact.id)) {
        const key = contact.phone.replace(/\D/g, '');
        if (key.length >= 10) {
          if (!phoneMap.has(key)) phoneMap.set(key, []);
          phoneMap.get(key)!.push(contact);
        }
      }
    });

    phoneMap.forEach((contacts, phone) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'phone',
          field: phone,
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
        contacts.forEach(c => processedIds.add(c.id));
      }
    });

    // Name + Company duplicates
    const nameCompanyMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (!processedIds.has(contact.id) && contact.firstName && contact.lastName && contact.company) {
        const key = `${contact.firstName.toLowerCase()}_${contact.lastName.toLowerCase()}_${contact.company.name.toLowerCase()}`;
        if (!nameCompanyMap.has(key)) nameCompanyMap.set(key, []);
        nameCompanyMap.get(key)!.push(contact);
      }
    });

    nameCompanyMap.forEach((contacts, key) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'name_company',
          field: key.replace(/_/g, ' '),
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
      }
    });

    res.json({
      totalDuplicateGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      groups: duplicateGroups
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/remove-duplicates
router.post('/remove-duplicates', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { duplicateIds } = req.body;

    if (!duplicateIds || !Array.isArray(duplicateIds)) {
      return res.status(400).json({ error: 'duplicateIds array is required' });
    }

    const result = await prisma.contact.updateMany({
      where: {
        id: { in: duplicateIds },
        userId
      },
      data: { isActive: false }
    });

    res.json({
      message: 'Duplicates removed successfully',
      removedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/activate-all - Activate all inactive contacts (for data recovery)
router.post('/activate-all', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Find all inactive contacts for this user
    const inactiveCount = await prisma.contact.count({
      where: {
        userId,
        OR: [
          { isActive: false },
          { isActive: null }
        ]
      }
    });

    if (inactiveCount === 0) {
      return res.json({
        message: 'No inactive contacts found',
        activatedCount: 0
      });
    }

    // Activate all inactive contacts
    const result = await prisma.contact.updateMany({
      where: {
        userId,
        OR: [
          { isActive: false },
          { isActive: null }
        ]
      },
      data: { isActive: true }
    });

    res.json({
      message: `Successfully activated ${result.count} previously hidden contacts`,
      activatedCount: result.count,
      totalInactive: inactiveCount
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/delete-all - PERMANENTLY delete all contacts for current user
router.post('/delete-all', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    console.log('🗑️ DELETE-ALL: Starting deletion for user:', userId);

    // Count contacts before deletion
    const totalContacts = await prisma.contact.count({
      where: { userId }
    });

    console.log(`🗑️ DELETE-ALL: Found ${totalContacts} contacts to delete`);

    if (totalContacts === 0) {
      return res.json({
        message: 'No contacts found to delete',
        deletedCount: 0
      });
    }

    // Step 1: Delete all contact tags first (foreign key constraint)
    const contactIds = await prisma.contact.findMany({
      where: { userId },
      select: { id: true }
    });
    const ids = contactIds.map(c => c.id);

    const deletedTags = await prisma.contactTag.deleteMany({
      where: { contactId: { in: ids } }
    });
    console.log(`🗑️ DELETE-ALL: Deleted ${deletedTags.count} contact tags`);

    // Step 2: Delete all contact shares (foreign key constraint)
    const deletedShares = await prisma.contactShare.deleteMany({
      where: { contactId: { in: ids } }
    });
    console.log(`🗑️ DELETE-ALL: Deleted ${deletedShares.count} contact shares`);

    // Step 3: Delete all activities related to these contacts
    const deletedActivities = await prisma.activity.deleteMany({
      where: { contactId: { in: ids } }
    });
    console.log(`🗑️ DELETE-ALL: Deleted ${deletedActivities.count} activities`);

    // Step 4: Now delete all contacts
    const deletedContacts = await prisma.contact.deleteMany({
      where: { userId }
    });
    console.log(`🗑️ DELETE-ALL: Deleted ${deletedContacts.count} contacts`);

    res.json({
      message: `Successfully deleted all ${deletedContacts.count} contacts and related data`,
      deletedCount: deletedContacts.count,
      relatedData: {
        contactTags: deletedTags.count,
        contactShares: deletedShares.count,
        activities: deletedActivities.count
      }
    });
  } catch (error) {
    console.error('🗑️ DELETE-ALL: Error:', error);
    next(error);
  }
});

// ==========================================
// ASSIGNMENT ENDPOINTS
// ==========================================

// GET /api/contacts/assigned-to-me - Get all contacts assigned to current user
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

    const contacts = await prisma.contact.findMany({
      where: {
        assignedToId: userId,
        isActive: true
      },
      include: {
        company: true,
        tags: {
          include: { tag: true }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.contact.count({
      where: {
        assignedToId: userId,
        isActive: true
      }
    });

    res.json({
      contacts,
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

// POST /api/contacts/bulk-assign - Bulk assign multiple contacts to a team member
router.post('/bulk-assign', async (req, res, next) => {
  try {
    const { contactIds, assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
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

    // Only update contacts that user owns or is account owner
    const whereClause = req.user?.teamRole === 'OWNER'
      ? { id: { in: contactIds } }
      : { id: { in: contactIds }, userId };

    const result = await prisma.contact.updateMany({
      where: whereClause,
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Contacts assigned successfully',
      assignedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/assign - Assign contact to a team member
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Check if contact exists and user has permission
    const contact = await prisma.contact.findUnique({
      where: { id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Only owner or contact creator can assign
    if (contact.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to assign this contact' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || targetUser.accountOwnerId !== accountOwnerId) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Assign the contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Contact assigned successfully',
      contact: updatedContact
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/unassign - Unassign contact from team member
router.post('/:id/unassign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if contact exists and user has permission
    const contact = await prisma.contact.findUnique({
      where: { id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Only owner or contact creator can unassign
    if (contact.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to unassign this contact' });
    }

    // Unassign the contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { assignedToId: null }
    });

    res.json({
      message: 'Contact unassigned successfully',
      contact: updatedContact
    });
  } catch (error) {
    next(error);
  }
});

export default router;