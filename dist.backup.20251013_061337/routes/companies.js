"use strict";
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
        const { search, page = '1', limit = '10' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            isActive: true,
            userId: req.user?.id,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { domain: { contains: search, mode: 'insensitive' } },
                { industry: { contains: search, mode: 'insensitive' } },
            ];
        }
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
            orderBy: {
                createdAt: 'desc',
            },
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
        const userId = req.user.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
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
        const headers = Object.keys(records[0]);
        const fieldMapping = mapCSVFieldsToCompany(headers);
        const importedCompanies = [];
        const errors = [];
        let duplicates = 0;
        for (const record of records) {
            try {
                const companyData = parseCompanyData(record, fieldMapping);
                if (!companyData.name || !companyData.name.trim()) {
                    continue;
                }
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
            }
            catch (error) {
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
    }
    catch (error) {
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
        }
    }
    return companyData;
}
exports.default = router;
//# sourceMappingURL=companies.js.map