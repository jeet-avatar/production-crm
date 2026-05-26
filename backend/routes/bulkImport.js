"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const XLSX = __importStar(require("xlsx"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    },
});
function validateEmail(email) {
    const result = { isValid: true, errors: [], warnings: [] };
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
function validatePhone(phone) {
    const result = { isValid: true, errors: [], warnings: [] };
    if (!phone || phone.trim() === '') {
        result.warnings.push('Phone is empty');
        return result;
    }
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
        result.warnings.push(`Phone format may be invalid: ${phone}`);
    }
    return result;
}
function validateUrl(url, fieldName) {
    const result = { isValid: true, errors: [], warnings: [] };
    if (!url || url.trim() === '') {
        return result;
    }
    try {
        let cleanUrl = url.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = 'https://' + cleanUrl;
        }
        new URL(cleanUrl);
    }
    catch (error) {
        result.warnings.push(`${fieldName} URL may be invalid: ${url}`);
    }
    return result;
}
function cleanCompanySize(size) {
    if (!size)
        return null;
    const sizeStr = typeof size === 'number' ? String(size) : size;
    if (sizeStr.trim() === '')
        return null;
    return sizeStr.trim().replace(/\s*[-–]\s*/g, '-');
}
function extractDomain(url) {
    if (!url || url.trim() === '')
        return null;
    try {
        let cleanUrl = url.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = 'https://' + cleanUrl;
        }
        const urlObj = new URL(cleanUrl);
        return urlObj.hostname.replace(/^www\./, '');
    }
    catch (error) {
        return null;
    }
}
function normalizeCompanyName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}
router.post('/bulk-import', auth_1.authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const userId = req.user.id;
        let rows = [];
        const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
        if (fileExt === '.csv') {
            const csvData = req.file.buffer.toString('utf-8');
            const workbook = XLSX.read(csvData, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }
        else {
            const workbook = XLSX.read(req.file.buffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        }
        console.log(`📊 Parsed ${rows.length} rows from file`);
        const result = {
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
        const companyMap = new Map();
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2;
            try {
                result.processedRows++;
                const parsedRow = {
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
                if (parsedRow.email) {
                    const emailValidation = validateEmail(parsedRow.email);
                    if (!emailValidation.isValid) {
                        result.errors.push({
                            row: rowNumber,
                            field: 'email',
                            message: emailValidation.errors.join(', '),
                        });
                        parsedRow.email = '';
                    }
                    if (emailValidation.warnings.length > 0) {
                        result.warnings.push({
                            row: rowNumber,
                            field: 'email',
                            message: emailValidation.warnings.join(', '),
                        });
                    }
                }
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
                const cleanSize = cleanCompanySize(parsedRow.size);
                const domain = extractDomain(parsedRow.website);
                const normalizedCompanyName = normalizeCompanyName(parsedRow.companyName);
                let companyId;
                if (companyMap.has(normalizedCompanyName)) {
                    companyId = companyMap.get(normalizedCompanyName);
                    result.companiesUpdated++;
                }
                else {
                    const existingCompany = await prisma.company.findFirst({
                        where: {
                            userId,
                            OR: [
                                { name: { equals: parsedRow.companyName, mode: 'insensitive' } },
                                domain ? { domain: { equals: domain, mode: 'insensitive' } } : undefined,
                            ].filter(Boolean),
                        },
                    });
                    if (existingCompany) {
                        companyId = existingCompany.id;
                        await prisma.company.update({
                            where: { id: companyId },
                            data: {
                                ...(parsedRow.website && { website: parsedRow.website }),
                                ...(parsedRow.industry && { industry: parsedRow.industry }),
                                ...(cleanSize && { size: cleanSize }),
                                ...(parsedRow.location && { location: parsedRow.location }),
                                ...(parsedRow.description && { description: parsedRow.description }),
                                ...(parsedRow.companyLinkedIn && { linkedin: parsedRow.companyLinkedIn }),
                                ...(domain && { domain }),
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
                    }
                    else {
                        let finalDomain = domain;
                        if (domain) {
                            const domainExists = await prisma.company.findUnique({
                                where: { domain },
                            });
                            if (domainExists) {
                                finalDomain = null;
                                result.warnings.push({
                                    row: rowNumber,
                                    field: 'domain',
                                    message: `Domain "${domain}" already exists in system - company created without domain`,
                                });
                            }
                        }
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
                                pitch: parsedRow.videoPitch || null,
                                videoUrl: parsedRow.videoLink || null,
                                ...(parsedRow.keywords
                                    ? { tags: parsedRow.keywords.split(',').map(t => t.trim()).filter(Boolean) }
                                    : {}),
                            },
                        });
                        companyId = newCompany.id;
                        result.companiesCreated++;
                    }
                    companyMap.set(normalizedCompanyName, companyId);
                }
                let existingContact = null;
                if (parsedRow.email && parsedRow.email.trim() !== '') {
                    existingContact = await prisma.contact.findFirst({
                        where: {
                            userId,
                            email: { equals: parsedRow.email, mode: 'insensitive' },
                        },
                    });
                }
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
                    await prisma.contact.update({
                        where: { id: existingContact.id },
                        data: {
                            ...(parsedRow.email && parsedRow.email !== existingContact.email && { email: parsedRow.email }),
                            ...(parsedRow.phone && { phone: parsedRow.phone }),
                            ...(parsedRow.position && { role: parsedRow.position }),
                            ...(parsedRow.linkedinUrl && { linkedin: parsedRow.linkedinUrl }),
                            ...(parsedRow.status && {
                                status: parsedRow.status.toUpperCase() || client_1.ContactStatus.LEAD,
                            }),
                            companyId,
                        },
                    });
                    result.contactsUpdated++;
                }
                else {
                    await prisma.contact.create({
                        data: {
                            firstName: parsedRow.firstName,
                            lastName: parsedRow.lastName || '',
                            email: parsedRow.email || null,
                            phone: parsedRow.phone || null,
                            role: parsedRow.position || null,
                            linkedin: parsedRow.linkedinUrl || null,
                            status: parsedRow.status ? parsedRow.status.toUpperCase() : client_1.ContactStatus.LEAD,
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
            }
            catch (rowError) {
                console.error(`❌ Error processing row ${rowNumber}:`, rowError);
                result.failedImports++;
                result.errors.push({
                    row: rowNumber,
                    message: rowError.message || 'Unknown error',
                });
            }
        }
        result.success = result.failedImports === 0;
        console.log('✅ Import completed:', {
            totalRows: result.totalRows,
            successful: result.successfulImports,
            failed: result.failedImports,
            companiesCreated: result.companiesCreated,
            contactsCreated: result.contactsCreated,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        console.error('❌ Bulk import error:', error);
        return res.status(500).json({
            success: false,
            error: 'Import failed',
            message: error.message,
        });
    }
});
router.get('/bulk-import/template', auth_1.authenticate, (req, res) => {
    const csvTemplate = `No,first name,last name,email,phone,job title,status,company name,tags,linkedin url,Company Name,Domain (LinkedIn),Website,Industry,Size,Location,Description,Video Link,Keywords,Video Pitch
1,John,Doe,john@example.com,+1234567890,CEO,LEAD,Example Corp,vip,https://linkedin.com/in/johndoe,Example Corp,https://linkedin.com/company/example,https://example.com,Technology,51-200,"New York, NY, USA",Leading tech company,https://youtu.be/example,automation keywords,"Sample pitch text"`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bulk-import-template.csv');
    res.send(csvTemplate);
});
exports.default = router;
//# sourceMappingURL=bulkImport.js.map