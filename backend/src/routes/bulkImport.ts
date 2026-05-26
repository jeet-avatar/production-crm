import { Router, Request, Response } from 'express';
import { PrismaClient, ContactStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import * as XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

// ===================================================================
// DATA VALIDATION & CLEANING FUNCTIONS
// ===================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates and cleans email addresses
 */
function validateEmail(email: string | undefined | null): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

  if (!email || email.trim() === '') {
    result.warnings.push('Email is empty');
    return result;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    result.isValid = false;
    result.errors.push(`Invalid email format: ${email}`);
  }

  return result;
}

/**
 * Validates and cleans phone numbers
 */
function validatePhone(phone: string | undefined | null): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

  if (!phone || phone.trim() === '') {
    result.warnings.push('Phone is empty');
    return result;
  }

  // Remove common formatting characters
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's a valid phone number (at least 10 digits)
  if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
    result.warnings.push(`Phone format may be invalid: ${phone}`);
  }

  return result;
}

/**
 * Validates and cleans URLs
 */
function validateUrl(url: string | undefined | null, fieldName: string): ValidationResult {
  const result: ValidationResult = { isValid: true, errors: [], warnings: [] };

  if (!url || url.trim() === '') {
    return result; // Empty URLs are ok
  }

  try {
    // Add protocol if missing
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    new URL(cleanUrl);
  } catch (error) {
    result.warnings.push(`${fieldName} URL may be invalid: ${url}`);
  }

  return result;
}

/**
 * Cleans and validates company size
 */
function cleanCompanySize(size: string | number | undefined | null): string | null {
  if (!size) return null;

  // Convert to string if it's a number
  const sizeStr = typeof size === 'number' ? String(size) : size;

  if (sizeStr.trim() === '') return null;

  // Normalize common formats: "51-200", "51–200" (em dash), "51 - 200"
  return sizeStr.trim().replace(/\s*[-–]\s*/g, '-');
}

/**
 * Extracts domain from URL
 */
function extractDomain(url: string | undefined | null): string | null {
  if (!url || url.trim() === '') return null;

  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return null;
  }
}

/**
 * Normalizes company name for deduplication
 */
function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

// ===================================================================
// BULK IMPORT ENDPOINT
// ===================================================================

interface ParsedRow {
  rowNumber: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  status?: string;
  linkedinUrl?: string;
  tags?: string;

  // Company fields
  companyName?: string;
  companyLinkedIn?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;

  // Campaign/Custom fields
  videoLink?: string;
  keywords?: string;
  videoPitch?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  successfulImports: number;
  failedImports: number;
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

/**
 * POST /api/bulk-import
 * Bulk import contacts and companies from CSV/Excel
 */
router.post('/bulk-import', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = (req as any).user.id;

    // Parse the file (CSV or Excel)
    let rows: ParsedRow[] = [];
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (fileExt === '.csv') {
      // Parse CSV
      const csvData = req.file.buffer.toString('utf-8');
      const workbook = XLSX.read(csvData, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    console.log(`📊 Parsed ${rows.length} rows from file`);

    // Initialize result tracking
    const result: ImportResult = {
      success: true,
      totalRows: rows.length,
      processedRows: 0,
      successfulImports: 0,
      failedImports: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      errors: [],
      warnings: [],
    };

    // Company deduplication map
    const companyMap = new Map<string, string>(); // normalizedName -> companyId

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      const rowNumber = i + 2; // +2 because: 1 for header, 1 for 0-index

      try {
        result.processedRows++;

        // Map column names (handle variations)
        const parsedRow: ParsedRow = {
          rowNumber,
          firstName: row['first name'] || row['First Name'] || row['firstName'] || '',
          lastName: row['last name'] || row['Last Name'] || row['lastName'] || '',
          email: row['email'] || row['Email'] || '',
          phone: row['phone'] || row['Phone'] || '',
          position: row['job title'] || row['Job Title'] || row['position'] || row['Position'] || '',
          status: row['status'] || row['Status'] || '',
          linkedinUrl: row['linkedin url'] || row['LinkedIn URL'] || row['linkedinUrl'] || '',
          tags: row['tags'] || row['Tags'] || '',

          companyName: row['company name'] || row['Company Name'] || '',
          companyLinkedIn: row['Domain (LinkedIn)'] || row['LinkedIn Domain'] || row['LinkedIn'] || row['linkedin'] || row['LinkedIn URL'] || row['linkedin url'] || row['LinkedIn Profile'] || row['Company LinkedIn'] || '',
          website: row['Website'] || row['website'] || '',
          industry: row['Industry'] || row['industry'] || '',
          size: row['Size'] || row['size'] || '',
          location: row['Location'] || row['location'] || '',
          description: row['Description'] || row['description'] || '',

          videoLink: row['Video Link'] || row['videoLink'] || '',
          keywords: row['Keywords'] || row['keywords'] || '',
          videoPitch: row['Video Pitch'] || row['videoPitch'] || '',
        };

        // Validate required fields
        if (!parsedRow.firstName || parsedRow.firstName.trim() === '') {
          result.warnings.push({
            row: rowNumber,
            field: 'firstName',
            message: 'First name is empty - skipping row',
          });
          continue;
        }

        if (!parsedRow.companyName || parsedRow.companyName.trim() === '') {
          result.warnings.push({
            row: rowNumber,
            field: 'companyName',
            message: 'Company name is empty - skipping row',
          });
          continue;
        }

        // Validate email if provided
        if (parsedRow.email) {
          const emailValidation = validateEmail(parsedRow.email);
          if (!emailValidation.isValid) {
            result.errors.push({
              row: rowNumber,
              field: 'email',
              message: emailValidation.errors.join(', '),
            });
            parsedRow.email = ''; // Clear invalid email
          }
          if (emailValidation.warnings.length > 0) {
            result.warnings.push({
              row: rowNumber,
              field: 'email',
              message: emailValidation.warnings.join(', '),
            });
          }
        }

        // Validate URLs
        if (parsedRow.website) {
          const websiteValidation = validateUrl(parsedRow.website, 'Website');
          if (websiteValidation.warnings.length > 0) {
            result.warnings.push({
              row: rowNumber,
              field: 'website',
              message: websiteValidation.warnings.join(', '),
            });
          }
        }

        // Clean company size
        const cleanSize = cleanCompanySize(parsedRow.size);

        // Extract domain from website
        const domain = extractDomain(parsedRow.website);

        // ============================================================
        // STEP 1: Create or Update Company (with deduplication)
        // ============================================================
        const normalizedCompanyName = normalizeCompanyName(parsedRow.companyName);
        let companyId: string;

        if (companyMap.has(normalizedCompanyName)) {
          // Company already processed in this import
          companyId = companyMap.get(normalizedCompanyName)!;
          result.companiesUpdated++;
        } else {
          // Check if company exists in database (for this user)
          const existingCompany = await prisma.company.findFirst({
            where: {
              userId,
              OR: [
                { name: { equals: parsedRow.companyName, mode: 'insensitive' } },
                domain ? { domain: { equals: domain, mode: 'insensitive' } } : undefined,
              ].filter(Boolean) as any,
            },
          });

          if (existingCompany) {
            // Update existing company with new data
            companyId = existingCompany.id;

            await prisma.company.update({
              where: { id: companyId },
              data: {
                // Update fields only if new data is provided
                ...(parsedRow.website && { website: parsedRow.website }),
                ...(parsedRow.industry && { industry: parsedRow.industry }),
                ...(cleanSize && { size: cleanSize }),
                ...(parsedRow.location && { location: parsedRow.location }),
                ...(parsedRow.description && { description: parsedRow.description }),
                ...(parsedRow.companyLinkedIn && { linkedin: parsedRow.companyLinkedIn }),
                ...(domain && { domain }),

                // Store campaign data in customFields if provided
                ...(parsedRow.videoLink || parsedRow.keywords || parsedRow.videoPitch
                  ? {
                      pitch: parsedRow.videoPitch || existingCompany.pitch,
                      videoUrl: parsedRow.videoLink || existingCompany.videoUrl,
                    }
                  : {}),

                dataSource: 'csv_import',
                importedAt: new Date(),
              },
            });

            result.companiesUpdated++;
          } else {
            // Check if domain already exists globally (unique constraint)
            let finalDomain = domain;
            if (domain) {
              const domainExists = await prisma.company.findUnique({
                where: { domain },
              });

              if (domainExists) {
                // Domain already exists for another user - set to null to avoid unique constraint violation
                finalDomain = null;
                result.warnings.push({
                  row: rowNumber,
                  field: 'domain',
                  message: `Domain "${domain}" already exists in system - company created without domain`,
                });
              }
            }

            // Create new company
            const newCompany = await prisma.company.create({
              data: {
                name: parsedRow.companyName,
                website: parsedRow.website || null,
                industry: parsedRow.industry || null,
                size: cleanSize,
                location: parsedRow.location || null,
                description: parsedRow.description || null,
                linkedin: parsedRow.companyLinkedIn || null,
                domain: finalDomain,
                userId,
                dataSource: 'csv_import',
                importedAt: new Date(),

                // Store campaign data
                pitch: parsedRow.videoPitch || null,
                videoUrl: parsedRow.videoLink || null,

                // Parse keywords/tags
                ...(parsedRow.keywords
                  ? { tags: parsedRow.keywords.split(',').map(t => t.trim()).filter(Boolean) }
                  : {}),
              },
            });

            companyId = newCompany.id;
            result.companiesCreated++;
          }

          // Add to deduplication map
          companyMap.set(normalizedCompanyName, companyId);
        }

        // ============================================================
        // STEP 2: Create or Update Contact
        // ============================================================

        // Check if contact exists (by email or name+company)
        let existingContact = null;

        if (parsedRow.email && parsedRow.email.trim() !== '') {
          existingContact = await prisma.contact.findFirst({
            where: {
              userId,
              email: { equals: parsedRow.email, mode: 'insensitive' },
            },
          });
        }

        // If not found by email, try by name + company
        if (!existingContact) {
          existingContact = await prisma.contact.findFirst({
            where: {
              userId,
              firstName: { equals: parsedRow.firstName, mode: 'insensitive' },
              lastName: { equals: parsedRow.lastName || '', mode: 'insensitive' },
              companyId,
            },
          });
        }

        if (existingContact) {
          // Update existing contact
          await prisma.contact.update({
            where: { id: existingContact.id },
            data: {
              ...(parsedRow.email && parsedRow.email !== existingContact.email && { email: parsedRow.email }),
              ...(parsedRow.phone && { phone: parsedRow.phone }),
              ...(parsedRow.position && { role: parsedRow.position }),
              ...(parsedRow.linkedinUrl && { linkedin: parsedRow.linkedinUrl }),
              ...(parsedRow.status && {
                status: (parsedRow.status.toUpperCase() as ContactStatus) || ContactStatus.LEAD,
              }),
              companyId, // Update company association
            },
          });

          result.contactsUpdated++;
        } else {
          // Create new contact
          await prisma.contact.create({
            data: {
              firstName: parsedRow.firstName,
              lastName: parsedRow.lastName || '',
              email: parsedRow.email || null,
              phone: parsedRow.phone || null,
              role: parsedRow.position || null,
              linkedin: parsedRow.linkedinUrl || null,
              status: parsedRow.status ? (parsedRow.status.toUpperCase() as ContactStatus) : ContactStatus.LEAD,
              userId,
              companyId,
              source: 'csv_import',
              fieldSources: {
                firstName: 'csv_import',
                lastName: 'csv_import',
                email: 'csv_import',
                phone: 'csv_import',
                role: 'csv_import',
                linkedin: 'csv_import',
              },
            },
          });

          result.contactsCreated++;
        }

        result.successfulImports++;

      } catch (rowError: any) {
        console.error(`❌ Error processing row ${rowNumber}:`, rowError);
        result.failedImports++;
        result.errors.push({
          row: rowNumber,
          message: rowError.message || 'Unknown error',
        });
      }
    }

    // Final result
    result.success = result.failedImports === 0;

    console.log('✅ Import completed:', {
      totalRows: result.totalRows,
      successful: result.successfulImports,
      failed: result.failedImports,
      companiesCreated: result.companiesCreated,
      contactsCreated: result.contactsCreated,
    });

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('❌ Bulk import error:', error);
    return res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/bulk-import/template
 * Download a CSV template with correct column headers
 */
router.get('/bulk-import/template', authenticate, (req: Request, res: Response) => {
  const csvTemplate = `No,first name,last name,email,phone,job title,status,company name,tags,linkedin url,Company Name,Domain (LinkedIn),Website,Industry,Size,Location,Description,Video Link,Keywords,Video Pitch
1,John,Doe,john@example.com,+1234567890,CEO,LEAD,Example Corp,vip,https://linkedin.com/in/johndoe,Example Corp,https://linkedin.com/company/example,https://example.com,Technology,51-200,"New York, NY, USA",Leading tech company,https://youtu.be/example,automation keywords,"Sample pitch text"`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=bulk-import-template.csv');
  res.send(csvTemplate);
});

export default router;
