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
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const companyEnrichment_1 = require("../services/companyEnrichment");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const { search, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc', industry, minRevenue, maxRevenue, minEmployees, maxEmployees } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const accountOwnerId = (0, auth_1.getAccountOwnerId)(req);
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
        const where = {
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
        if (industry) {
            where.AND.push({
                industry: { contains: industry, mode: 'insensitive' }
            });
        }
        if (minRevenue || maxRevenue) {
            const revenueConditions = {};
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
        if (minEmployees || maxEmployees) {
            const employeeConditions = {};
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
        let orderBy = {};
        const validSortFields = ['name', 'industry', 'revenue', 'employeeCount', 'createdAt', 'foundedYear'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        orderBy[sortField] = order;
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
        const total = await prisma.company.count({ where });
        res.json({
            companies,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const company = await prisma.company.findFirst({
            where: {
                id,
                userId: req.user?.id,
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
    }
    catch (error) {
        return next(error);
    }
});
router.post('/:id/enrich', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const company = await prisma.company.findFirst({
            where: { id, userId }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (!company.website) {
            return res.status(400).json({ error: 'Company has no website to enrich from' });
        }
        if (company.enrichmentStatus === 'enriching') {
            return res.status(409).json({ error: 'Company is already being enriched' });
        }
        await prisma.company.update({
            where: { id },
            data: { enrichmentStatus: 'enriching' }
        });
        companyEnrichment_1.companyEnrichmentService.enrichCompany(company.name, company.website)
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
    }
    catch (error) {
        console.error('Enrichment endpoint error:', error);
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, domain, industry, size, description, website, location, } = req.body;
        const company = await prisma.company.create({
            data: {
                name,
                domain,
                industry,
                size,
                description,
                website,
                location,
                userId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, domain, industry, size, description, website, location, } = req.body;
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
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingCompany = await prisma.company.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingCompany) {
            return res.status(404).json({ error: 'Company not found' });
        }
        await prisma.company.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
        res.json({ message: 'Company deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
router.post('/import', upload.single('file'), async (req, res, next) => {
    try {
        console.log('[CSV Import] Starting import process...');
        const userId = req.user.id;
        console.log('[CSV Import] User ID:', userId);
        if (!req.file) {
            console.error('[CSV Import] ERROR: No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('[CSV Import] File received:', req.file.originalname, 'Size:', req.file.size, 'bytes');
        let csvContent;
        let records;
        try {
            csvContent = req.file.buffer.toString('utf-8');
            console.log('[CSV Import] CSV content length:', csvContent.length, 'characters');
            console.log('[CSV Import] First 200 chars:', csvContent.substring(0, 200));
        }
        catch (error) {
            console.error('[CSV Import] ERROR parsing buffer to string:', error.message);
            throw error;
        }
        try {
            records = (0, sync_1.parse)(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
            console.log('[CSV Import] Parsed records count:', records.length);
        }
        catch (error) {
            console.error('[CSV Import] ERROR parsing CSV:', error.message);
            throw error;
        }
        if (records.length === 0) {
            console.error('[CSV Import] ERROR: No valid records found in CSV');
            return res.status(400).json({ error: 'No valid records found in CSV' });
        }
        const headers = Object.keys(records[0]);
        console.log('[CSV Import] CSV Headers:', headers.join(', '));
        const fieldMapping = mapCSVFieldsToCompany(headers);
        console.log('[CSV Import] Field Mapping:', JSON.stringify(fieldMapping, null, 2));
        const importedCompanies = [];
        const errors = [];
        let duplicates = 0;
        let skipped = 0;
        console.log('[CSV Import] Starting row-by-row processing...');
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                console.log(`[CSV Import] Processing row ${i + 1}/${records.length}...`);
                const companyData = parseCompanyData(record, fieldMapping);
                console.log(`[CSV Import] Row ${i + 1} parsed data:`, JSON.stringify(companyData, null, 2));
                if (!companyData.name || !companyData.name.trim()) {
                    console.log(`[CSV Import] Row ${i + 1} SKIPPED: No company name`);
                    skipped++;
                    continue;
                }
                console.log(`[CSV Import] Row ${i + 1} checking for duplicate: ${companyData.name}`);
                const existing = await prisma.company.findFirst({
                    where: {
                        name: companyData.name,
                        userId,
                    },
                });
                if (existing) {
                    console.log(`[CSV Import] Row ${i + 1} DUPLICATE: ${companyData.name} (ID: ${existing.id})`);
                    duplicates++;
                    continue;
                }
                console.log(`[CSV Import] Row ${i + 1} creating company: ${companyData.name}`);
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
                console.log(`[CSV Import] Row ${i + 1} SUCCESS: Created company ${company.name} (ID: ${company.id})`);
                importedCompanies.push(company);
            }
            catch (error) {
                console.error(`[CSV Import] Row ${i + 1} ERROR:`, error.message);
                console.error(`[CSV Import] Row ${i + 1} Stack:`, error.stack);
                errors.push(`Row ${i + 1}: ${error.message}`);
            }
        }
        console.log('[CSV Import] Import complete!');
        console.log('[CSV Import] Total processed:', records.length);
        console.log('[CSV Import] Imported:', importedCompanies.length);
        console.log('[CSV Import] Duplicates:', duplicates);
        console.log('[CSV Import] Skipped (no name):', skipped);
        console.log('[CSV Import] Errors:', errors.length);
        res.json({
            message: 'Company import completed',
            totalProcessed: records.length,
            imported: importedCompanies.length,
            duplicates,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            companies: importedCompanies,
        });
    }
    catch (error) {
        console.error('[CSV Import] CRITICAL ERROR:', error.message);
        console.error('[CSV Import] Stack trace:', error.stack);
        next(error);
    }
});
router.post('/:id/upload-details', upload.single('file'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const existingCompany = await prisma.company.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!existingCompany) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const csvContent = req.file.buffer.toString('utf-8');
        const records = (0, sync_1.parse)(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        if (records.length === 0) {
            return res.status(400).json({ error: 'No valid records found in CSV' });
        }
        const record = records[0];
        const updateData = {
            updatedAt: new Date(),
        };
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
        const fieldSources = existingCompany.fieldSources || {};
        Object.keys(updateData).forEach(key => {
            if (key !== 'updatedAt') {
                fieldSources[key] = 'csv_upload';
            }
        });
        updateData.fieldSources = fieldSources;
        updateData.dataSource = 'csv_upload';
        updateData.importedAt = new Date();
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/manual-update', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { website, industry, size, location, description, linkedin, domain, employeeCount, revenue, foundedYear, phone, email, } = req.body;
        const existingCompany = await prisma.company.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!existingCompany) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const updateData = {
            updatedAt: new Date(),
        };
        if (website !== undefined)
            updateData.website = website;
        if (industry !== undefined)
            updateData.industry = industry;
        if (size !== undefined)
            updateData.size = size;
        if (location !== undefined)
            updateData.location = location;
        if (description !== undefined)
            updateData.description = description;
        if (linkedin !== undefined)
            updateData.linkedin = linkedin;
        if (domain !== undefined)
            updateData.domain = domain;
        if (employeeCount !== undefined)
            updateData.employeeCount = employeeCount;
        if (revenue !== undefined)
            updateData.revenue = revenue;
        if (foundedYear !== undefined)
            updateData.foundedYear = foundedYear;
        if (phone !== undefined)
            updateData.phone = phone;
        const fieldSources = existingCompany.fieldSources || {};
        Object.keys(updateData).forEach(key => {
            if (key !== 'updatedAt') {
                fieldSources[key] = 'manual_research';
            }
        });
        updateData.fieldSources = fieldSources;
        if (!existingCompany.dataSource || existingCompany.dataSource === 'manual') {
            updateData.dataSource = 'manual_research';
        }
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/enrich', async (req, res, next) => {
    try {
        const { companies } = req.body;
        if (!companies || !Array.isArray(companies)) {
            return res.status(400).json({ error: 'Companies array is required' });
        }
        const enrichedCompanies = companies.map(company => ({
            ...company,
            enriched: false,
            aiEnhanced: [],
        }));
        res.json({
            message: 'Company enrichment completed',
            companies: enrichedCompanies,
        });
    }
    catch (error) {
        next(error);
    }
});
function mapCSVFieldsToCompany(headers) {
    const mapping = {};
    headers.forEach(header => {
        const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');
        if (normalized.match(/^(company.*name|name|business.*name)$/))
            mapping[header] = 'name';
        else if (normalized.match(/domain|companywebsite/))
            mapping[header] = 'domain';
        else if (normalized.match(/^(website|url|site)$/))
            mapping[header] = 'website';
        else if (normalized.match(/linkedin|linkedinurl|linkedinprofile|companylinkedin/))
            mapping[header] = 'linkedin';
        else if (normalized.match(/twitter|twitterurl|twitterhandle/))
            mapping[header] = 'twitter';
        else if (normalized.match(/facebook|facebookurl|facebookpage/))
            mapping[header] = 'facebook';
        else if (normalized.match(/industry|sector|vertical/))
            mapping[header] = 'industry';
        else if (normalized.match(/location|city|address|headquarters|hq/))
            mapping[header] = 'location';
        else if (normalized.match(/size|companysize|employees/))
            mapping[header] = 'size';
        else if (normalized.match(/description|about|overview/))
            mapping[header] = 'description';
        else if (normalized.match(/phone|telephone|tel/))
            mapping[header] = 'phone';
        else if (normalized.match(/revenue|annualrevenue/))
            mapping[header] = 'revenue';
        else if (normalized.match(/employeecount|headcount|numberofemployees/))
            mapping[header] = 'employeeCount';
        else
            mapping[header] = `custom_${header}`;
    });
    return mapping;
}
function parseCompanyData(record, fieldMapping) {
    const companyData = {};
    try {
        for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
            const value = record[csvHeader]?.trim();
            if (!value)
                continue;
            if (dbField.startsWith('custom_')) {
                continue;
            }
            companyData[dbField] = value;
        }
        if (companyData.website && !companyData.domain) {
            try {
                const url = companyData.website.startsWith('http')
                    ? companyData.website
                    : 'https://' + companyData.website;
                const urlObj = new URL(url);
                companyData.domain = urlObj.hostname;
            }
            catch (error) {
                console.warn('[parseCompanyData] Failed to extract domain from website:', companyData.website, error.message);
            }
        }
        return companyData;
    }
    catch (error) {
        console.error('[parseCompanyData] ERROR:', error.message);
        console.error('[parseCompanyData] Record:', JSON.stringify(record));
        console.error('[parseCompanyData] Field Mapping:', JSON.stringify(fieldMapping));
        throw error;
    }
}
router.get('/assigned-to-me', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page = '1', limit = '10' } = req.query;
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/bulk-assign', async (req, res, next) => {
    try {
        const { companyIds, assignToUserId } = req.body;
        const userId = req.user.id;
        const accountOwnerId = (0, auth_1.getAccountOwnerId)(req);
        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({ error: 'companyIds array is required' });
        }
        if (!assignToUserId) {
            return res.status(400).json({ error: 'assignToUserId is required' });
        }
        const targetUser = await prisma.user.findUnique({
            where: { id: assignToUserId }
        });
        if (!targetUser || (targetUser.accountOwnerId !== accountOwnerId && targetUser.id !== accountOwnerId)) {
            return res.status(400).json({ error: 'Target user is not in your team' });
        }
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/assign', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assignToUserId } = req.body;
        const userId = req.user.id;
        const accountOwnerId = (0, auth_1.getAccountOwnerId)(req);
        if (!assignToUserId) {
            return res.status(400).json({ error: 'assignToUserId is required' });
        }
        const company = await prisma.company.findUnique({
            where: { id }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
            return res.status(403).json({ error: 'You do not have permission to assign this company' });
        }
        const targetUser = await prisma.user.findUnique({
            where: { id: assignToUserId }
        });
        if (!targetUser || targetUser.accountOwnerId !== accountOwnerId) {
            return res.status(400).json({ error: 'Target user is not in your team' });
        }
        const updatedCompany = await prisma.company.update({
            where: { id },
            data: { assignedToId: assignToUserId }
        });
        res.json({
            message: 'Company assigned successfully',
            company: updatedCompany
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/unassign', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const company = await prisma.company.findUnique({
            where: { id }
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
            return res.status(403).json({ error: 'You do not have permission to unassign this company' });
        }
        const updatedCompany = await prisma.company.update({
            where: { id },
            data: { assignedToId: null }
        });
        res.json({
            message: 'Company unassigned successfully',
            company: updatedCompany
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/find-linkedin', async (req, res, next) => {
    try {
        const { id } = req.params;
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
        if (company.linkedin && company.linkedin.includes('linkedin.com/company/')) {
            return res.json({
                success: true,
                linkedinUrl: company.linkedin,
                message: 'LinkedIn URL already exists'
            });
        }
        const { findLinkedInCompanyUrl } = await Promise.resolve().then(() => __importStar(require('../services/linkedin-url-finder.service')));
        const result = await findLinkedInCompanyUrl(company.name, company.website || undefined);
        if (!result || !result.linkedinUrl) {
            return res.status(404).json({
                success: false,
                error: 'LinkedIn URL not found',
                message: 'Could not automatically find LinkedIn company URL. Please add it manually.'
            });
        }
        await prisma.company.update({
            where: { id },
            data: { linkedin: result.linkedinUrl }
        });
        res.json({
            success: true,
            linkedinUrl: result.linkedinUrl,
            confidence: result.confidence,
            method: result.method
        });
    }
    catch (error) {
        console.error('Error finding LinkedIn URL:', error);
        next(error);
    }
});
router.get('/:id/employees', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = '20', enrich = 'false' } = req.query;
        const userId = req.user.id;
        const company = await prisma.company.findFirst({
            where: {
                id,
                userId,
            },
            select: {
                id: true,
                name: true,
                linkedin: true,
                domain: true,
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        let linkedinUrl = company.linkedin;
        if (!linkedinUrl) {
            console.log(`[Get Employees] No LinkedIn URL for ${company.name}, using AI to find it...`);
            const { findLinkedInCompanyUrl } = await Promise.resolve().then(() => __importStar(require('../services/linkedin-url-finder.service')));
            const result = await findLinkedInCompanyUrl(company.name, company.domain || undefined);
            if (result && result.linkedinUrl) {
                linkedinUrl = result.linkedinUrl;
                console.log(`[Get Employees] AI found LinkedIn URL: ${linkedinUrl} (${result.confidence} confidence)`);
                await prisma.company.update({
                    where: { id: company.id },
                    data: { linkedin: linkedinUrl },
                });
                console.log(`[Get Employees] Saved LinkedIn URL to database`);
            }
            else {
                return res.status(400).json({
                    error: 'No LinkedIn URL',
                    message: 'Could not automatically find LinkedIn company URL. Please add it manually.',
                });
            }
        }
        const { fetchCompanyEmployees } = await Promise.resolve().then(() => __importStar(require('../services/rapidapi-linkedin.service')));
        const employees = await fetchCompanyEmployees(linkedinUrl, {
            limit: Number.parseInt(limit),
            enrichProfiles: enrich === 'true',
            useCache: true,
        });
        res.json({
            companyId: company.id,
            companyName: company.name,
            linkedinUrl: linkedinUrl,
            employees,
            count: employees.length,
        });
    }
    catch (error) {
        console.error('[Get Employees] Error:', error);
        next(error);
    }
});
router.post('/:id/employees/import', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { employeeUrls } = req.body;
        const userId = req.user.id;
        if (!employeeUrls || !Array.isArray(employeeUrls) || employeeUrls.length === 0) {
            return res.status(400).json({ error: 'employeeUrls array is required' });
        }
        const company = await prisma.company.findFirst({
            where: {
                id,
                userId,
            },
            select: {
                id: true,
                name: true,
            },
        });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const { fetchEmployeesByUrls } = await Promise.resolve().then(() => __importStar(require('../services/rapidapi-linkedin.service')));
        const employees = await fetchEmployeesByUrls(employeeUrls);
        const createdContacts = [];
        const errors = [];
        for (const emp of employees) {
            try {
                const existing = await prisma.contact.findFirst({
                    where: {
                        userId,
                        linkedin: emp.linkedinUrl,
                    },
                });
                if (existing) {
                    errors.push(`${emp.fullName} already exists as a contact`);
                    continue;
                }
                const contact = await prisma.contact.create({
                    data: {
                        userId,
                        companyId: company.id,
                        firstName: emp.firstName || 'Unknown',
                        lastName: emp.lastName || '',
                        title: emp.title,
                        location: emp.location,
                        linkedin: emp.linkedinUrl,
                        enriched: true,
                    },
                });
                createdContacts.push(contact);
            }
            catch (error) {
                errors.push(`${emp.fullName}: ${error.message}`);
            }
        }
        res.json({
            message: 'Employee import completed',
            imported: createdContacts.length,
            total: employeeUrls.length,
            errors: errors.length > 0 ? errors : undefined,
            contacts: createdContacts,
        });
    }
    catch (error) {
        console.error('[Import Employees] Error:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=companies.js.map