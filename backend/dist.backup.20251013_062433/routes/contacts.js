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
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});
router.get('/', async (req, res, next) => {
    try {
        const { search, status, page = '1', limit = '10' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            isActive: true,
            userId: req.user?.id,
        };
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status && status !== '') {
            where.status = status;
        }
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
        const total = await prisma.contact.count({ where });
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const contact = await prisma.contact.findFirst({
            where: {
                id,
                userId: req.user?.id,
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
        const transformedContact = {
            ...contact,
            tags: contact.tags.map(ct => ct.tag),
        };
        return res.json({ contact: transformedContact });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, role, companyId, status = 'LEAD', tagIds = [], } = req.body;
        if (!firstName || !firstName.trim()) {
            return res.status(400).json({ error: 'First name is required' });
        }
        if (!lastName || !lastName.trim()) {
            return res.status(400).json({ error: 'Last name is required' });
        }
        const contact = await prisma.contact.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email && email.trim() ? email.trim() : null,
                phone: phone && phone.trim() ? phone.trim() : null,
                role: role && role.trim() ? role.trim() : null,
                status,
                companyId: companyId || null,
                userId: req.user.id,
            },
            include: {
                company: true,
            },
        });
        if (tagIds.length > 0) {
            await prisma.contactTag.createMany({
                data: tagIds.map((tagId) => ({
                    contactId: contact.id,
                    tagId,
                })),
            });
        }
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
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(409).json({
                error: 'This email address is already in use. Please use a different email or leave it blank.'
            });
        }
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, companyId, status, tagIds = [], } = req.body;
        const existingContact = await prisma.contact.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingContact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        const contact = await prisma.contact.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email,
                phone,
                status,
                companyId: companyId || null,
                updatedAt: new Date(),
            },
            include: {
                company: true,
            },
        });
        await prisma.contactTag.deleteMany({
            where: { contactId: id },
        });
        if (tagIds.length > 0) {
            await prisma.contactTag.createMany({
                data: tagIds.map((tagId) => ({
                    contactId: id,
                    tagId,
                })),
            });
        }
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
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingContact = await prisma.contact.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingContact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        await prisma.contact.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
        res.json({ message: 'Contact deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
function mapCSVFieldsToContact(headers) {
    const mapping = {};
    headers.forEach(header => {
        const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');
        if (normalized.match(/email|e-?mail|mail/))
            mapping[header] = 'email';
        else if (normalized.match(/^(first.*name|fname|givenname)$/))
            mapping[header] = 'firstName';
        else if (normalized.match(/^(last.*name|lname|surname|familyname)$/))
            mapping[header] = 'lastName';
        else if (normalized === 'fullname' || normalized === 'name' || normalized === 'contactname')
            mapping[header] = 'fullName';
        else if (normalized.match(/phone|mobile|cell|telephone|tel|contact/))
            mapping[header] = 'phone';
        else if (normalized.match(/title|position|jobtitle|designation/))
            mapping[header] = 'title';
        else if (normalized.match(/role/))
            mapping[header] = 'role';
        else if (normalized.match(/^(company|organization|employer|business)$/))
            mapping[header] = 'company';
        else if (normalized.match(/companyname|orgname/))
            mapping[header] = 'company';
        else if (normalized.match(/industry|sector|vertical/))
            mapping[header] = 'companyIndustry';
        else if (normalized.match(/companysize|employeecount|employees|headcount/))
            mapping[header] = 'companySize';
        else if (normalized.match(/companylocation|companycity|companyaddress|headquarters|hq/))
            mapping[header] = 'companyLocation';
        else if (normalized.match(/website|companywebsite|url|domain/))
            mapping[header] = 'companyWebsite';
        else if (normalized.match(/companydescription|aboutcompany|companyinfo/))
            mapping[header] = 'companyDescription';
        else if (normalized.match(/revenue|annualrevenue|sales/))
            mapping[header] = 'companyRevenue';
        else if (normalized.match(/linkedin|linkedinurl|companylinkedin/))
            mapping[header] = 'companyLinkedIn';
        else if (normalized.match(/founded|foundedyear|yearfounded/))
            mapping[header] = 'companyFoundedYear';
        else if (normalized.match(/companyphone|mainphone|officenumber/))
            mapping[header] = 'companyPhone';
        else if (normalized.match(/status|stage|leadstatus/))
            mapping[header] = 'status';
        else if (normalized.match(/note|comment|description|remark/))
            mapping[header] = 'notes';
        else
            mapping[header] = `custom_${header}`;
    });
    return mapping;
}
function parseContactData(record, fieldMapping) {
    const contactData = { customFields: {}, fieldSources: {} };
    const companyData = { fieldSources: {} };
    for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
        const value = record[csvHeader]?.trim();
        if (!value)
            continue;
        if (dbField === 'fullName') {
            const nameParts = value.split(' ').filter(part => part.trim());
            if (nameParts.length > 0) {
                contactData.firstName = nameParts[0];
                contactData.lastName = nameParts.slice(1).join(' ') || '';
            }
        }
        else if (dbField.startsWith('company')) {
            parseCompanyField(dbField, value, companyData);
        }
        else if (dbField.startsWith('custom_')) {
            contactData.customFields[csvHeader] = value;
        }
        else if (dbField === 'status') {
            const normalizedStatus = value.toUpperCase();
            if (['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER'].includes(normalizedStatus)) {
                contactData.status = normalizedStatus;
            }
        }
        else {
            contactData[dbField] = value;
            contactData.fieldSources[dbField] = 'csv_import';
        }
    }
    return { contactData, companyData };
}
function parseCompanyField(dbField, value, companyData) {
    if (dbField === 'company')
        companyData.name = value;
    else if (dbField === 'companyIndustry')
        companyData.industry = value;
    else if (dbField === 'companySize')
        companyData.size = value;
    else if (dbField === 'companyLocation')
        companyData.location = value;
    else if (dbField === 'companyWebsite')
        companyData.website = value;
    else if (dbField === 'companyDescription')
        companyData.description = value;
    else if (dbField === 'companyRevenue')
        companyData.revenue = value;
    else if (dbField === 'companyLinkedIn')
        companyData.linkedin = value;
    else if (dbField === 'companyFoundedYear') {
        const year = Number.parseInt(value);
        if (!isNaN(year))
            companyData.foundedYear = year;
    }
    else if (dbField === 'companyPhone')
        companyData.phone = value;
}
async function checkDuplicateContact(contactData, companyData, userId) {
    const duplicateChecks = [];
    if (contactData.email) {
        duplicateChecks.push({ email: contactData.email, userId });
    }
    if (contactData.firstName && contactData.lastName && companyData.name) {
        duplicateChecks.push({
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            company: { name: companyData.name },
            userId
        });
    }
    if (!contactData.email && contactData.phone) {
        duplicateChecks.push({ phone: contactData.phone, userId });
    }
    if (duplicateChecks.length > 0) {
        return await prisma.contact.findFirst({
            where: { OR: duplicateChecks }
        });
    }
    return null;
}
async function findOrCreateCompany(companyData, userId) {
    if (!companyData.name)
        return null;
    let domain = null;
    if (companyData.website && companyData.website.trim()) {
        try {
            const url = companyData.website.startsWith('http') ? companyData.website : 'https://' + companyData.website;
            domain = new URL(url).hostname;
            if (domain.includes('linkedin.com') || domain.includes('facebook.com') || domain.includes('twitter.com')) {
                domain = null;
            }
        }
        catch (error) {
            domain = null;
        }
    }
    let company = await prisma.company.findFirst({
        where: {
            name: companyData.name,
            userId
        }
    });
    if (!company) {
        const companyCreateData = {
            name: companyData.name,
            userId,
            dataSource: 'csv_import',
            fieldSources: companyData.fieldSources,
            domain
        };
        if (companyData.industry)
            companyCreateData.industry = companyData.industry;
        if (companyData.size)
            companyCreateData.size = companyData.size;
        if (companyData.location)
            companyCreateData.location = companyData.location;
        if (companyData.website)
            companyCreateData.website = companyData.website;
        if (companyData.description)
            companyCreateData.description = companyData.description;
        if (companyData.revenue)
            companyCreateData.revenue = companyData.revenue;
        if (companyData.linkedin)
            companyCreateData.linkedin = companyData.linkedin;
        if (companyData.foundedYear)
            companyCreateData.foundedYear = companyData.foundedYear;
        if (companyData.phone)
            companyCreateData.phone = companyData.phone;
        try {
            company = await prisma.company.create({ data: companyCreateData });
        }
        catch (error) {
            if (error.code === 'P2002') {
                delete companyCreateData.domain;
                company = await prisma.company.create({ data: companyCreateData });
            }
            else {
                throw error;
            }
        }
    }
    return company.id;
}
async function processCSVRecord(record, fieldMapping, userId, fileName) {
    const { contactData, companyData } = parseContactData(record, fieldMapping);
    if (!contactData.firstName || !contactData.firstName.trim()) {
        return { skipped: true };
    }
    if (!contactData.lastName)
        contactData.lastName = '';
    const existing = await checkDuplicateContact(contactData, companyData, userId);
    if (existing) {
        return {
            duplicate: true,
            identifier: `${contactData.email || contactData.firstName + ' ' + contactData.lastName} (from ${fileName})`
        };
    }
    const companyId = await findOrCreateCompany(companyData, userId);
    const contact = await prisma.contact.create({
        data: {
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
            customFields: contactData.customFields,
            fieldSources: contactData.fieldSources
        }
    });
    return { contact };
}
router.post('/csv-import', upload.array('files', 10), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No CSV files uploaded' });
        }
        const allImportedContacts = [];
        const allErrors = [];
        const allDuplicates = [];
        let totalProcessed = 0;
        for (const file of files) {
            try {
                const csvContent = file.buffer.toString('utf-8');
                const records = (0, sync_1.parse)(csvContent, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                });
                if (records.length === 0) {
                    allErrors.push(`File ${file.originalname}: No valid records found`);
                    continue;
                }
                const headers = Object.keys(records[0]);
                const fieldMapping = mapCSVFieldsToContact(headers);
                for (const record of records) {
                    totalProcessed++;
                    const result = await processCSVRecord(record, fieldMapping, userId, file.originalname);
                    if (result.skipped) {
                        continue;
                    }
                    if (result.duplicate) {
                        allDuplicates.push(result.identifier);
                        continue;
                    }
                    if (result.contact) {
                        allImportedContacts.push(result.contact);
                    }
                }
            }
            catch (error) {
                allErrors.push(`File ${file.originalname}: ${error.message}`);
            }
        }
        res.json({
            message: 'CSV import completed',
            totalProcessed,
            imported: allImportedContacts.length,
            duplicates: allDuplicates.length,
            duplicatesList: allDuplicates,
            errors: allErrors.length > 0 ? allErrors : undefined,
            contacts: allImportedContacts
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/detect-duplicates', async (req, res, next) => {
    try {
        const userId = req.user.id;
        const allContacts = await prisma.contact.findMany({
            where: { userId, isActive: true },
            include: { company: { select: { name: true } } },
            orderBy: { createdAt: 'asc' }
        });
        const duplicateGroups = [];
        const processedIds = new Set();
        const emailMap = new Map();
        allContacts.forEach(contact => {
            if (contact.email) {
                const key = contact.email.toLowerCase();
                if (!emailMap.has(key))
                    emailMap.set(key, []);
                emailMap.get(key).push(contact);
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
        const phoneMap = new Map();
        allContacts.forEach(contact => {
            if (contact.phone && !processedIds.has(contact.id)) {
                const key = contact.phone.replace(/\D/g, '');
                if (key.length >= 10) {
                    if (!phoneMap.has(key))
                        phoneMap.set(key, []);
                    phoneMap.get(key).push(contact);
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
        const nameCompanyMap = new Map();
        allContacts.forEach(contact => {
            if (!processedIds.has(contact.id) && contact.firstName && contact.lastName && contact.company) {
                const key = `${contact.firstName.toLowerCase()}_${contact.lastName.toLowerCase()}_${contact.company.name.toLowerCase()}`;
                if (!nameCompanyMap.has(key))
                    nameCompanyMap.set(key, []);
                nameCompanyMap.get(key).push(contact);
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/remove-duplicates', async (req, res, next) => {
    try {
        const userId = req.user.id;
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=contacts.js.map