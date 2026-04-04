"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
router.get('/', async (req, res, next) => {
    try {
        const { search, stage, page = '1', limit = '50' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            userId: req.user?.id,
            isActive: true,
        };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (stage && stage !== '') {
            where.stage = stage;
        }
        const deals = await prisma.deal.findMany({
            where,
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { stage: 'asc' },
                { createdAt: 'desc' },
            ],
            skip,
            take: limitNum,
        });
        const total = await prisma.deal.count({ where });
        const transformedDeals = deals.map(deal => ({
            ...deal,
            value: Number(deal.value),
        }));
        res.json({
            deals: transformedDeals,
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
        const deal = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
            include: {
                contact: true,
                company: true,
                activities: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const transformedDeal = {
            ...deal,
            value: Number(deal.value),
        };
        return res.json({ deal: transformedDeal });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { title, value, stage = 'PROSPECTING', probability = 10, expectedCloseDate, contactId, companyId, description, } = req.body;
        const deal = await prisma.deal.create({
            data: {
                title,
                value: parseFloat(value),
                stage,
                probability,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
                contactId: contactId || null,
                companyId: companyId || null,
                description,
                userId: req.user.id,
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        const transformedDeal = {
            ...deal,
            value: Number(deal.value),
        };
        res.status(201).json({ deal: transformedDeal });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, value, stage, probability, expectedCloseDate, contactId, companyId, description, } = req.body;
        const existingDeal = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const updateData = {
            updatedAt: new Date(),
        };
        if (title !== undefined)
            updateData.title = title;
        if (value !== undefined)
            updateData.value = parseFloat(value);
        if (stage !== undefined)
            updateData.stage = stage;
        if (probability !== undefined)
            updateData.probability = probability;
        if (expectedCloseDate !== undefined)
            updateData.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
        if (contactId !== undefined)
            updateData.contactId = contactId || null;
        if (companyId !== undefined)
            updateData.companyId = companyId || null;
        if (description !== undefined)
            updateData.description = description;
        const deal = await prisma.deal.update({
            where: { id },
            data: updateData,
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        const transformedDeal = {
            ...deal,
            value: Number(deal.value),
        };
        res.json({ deal: transformedDeal });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;
        const existing = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const deal = await prisma.deal.update({
            where: { id },
            data: {
                stage,
                actualCloseDate: (stage === 'CLOSED_WON' || stage === 'CLOSED_LOST') ? new Date() : null,
                updatedAt: new Date(),
            },
            include: {
                contact: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        const transformedDeal = {
            ...deal,
            value: Number(deal.value),
        };
        res.json({ deal: transformedDeal });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existingDeal = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        await prisma.deal.update({
            where: { id },
            data: {
                isActive: false,
                updatedAt: new Date(),
            },
        });
        res.json({ message: 'Deal deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
const STAGE_MAP = {
    'prospecting': 'PROSPECTING',
    'qualification': 'QUALIFICATION',
    'qualified': 'QUALIFICATION',
    'proposal': 'PROPOSAL',
    'proposal/price quote': 'PROPOSAL',
    'value proposition': 'PROPOSAL',
    'negotiation': 'NEGOTIATION',
    'negotiation/review': 'NEGOTIATION',
    'decision maker bought-in': 'NEGOTIATION',
    'contract sent': 'NEGOTIATION',
    'closed won': 'CLOSED_WON',
    'closedwon': 'CLOSED_WON',
    'closed_won': 'CLOSED_WON',
    'won': 'CLOSED_WON',
    'closed lost': 'CLOSED_LOST',
    'closedlost': 'CLOSED_LOST',
    'closed_lost': 'CLOSED_LOST',
    'lost': 'CLOSED_LOST',
};
router.post('/bulk-import', async (req, res, next) => {
    try {
        const { deals } = req.body;
        if (!Array.isArray(deals)) {
            return res.status(400).json({ error: 'deals must be an array' });
        }
        let imported = 0;
        let failed = 0;
        const errors = [];
        for (let i = 0; i < deals.length; i++) {
            const row = deals[i];
            const rowNum = i + 1;
            if (!row.title || String(row.title).trim() === '') {
                failed++;
                errors.push({ row: rowNum, title: '', reason: 'Missing required field: title' });
                continue;
            }
            const parsedValue = parseFloat(String(row.value));
            if (isNaN(parsedValue)) {
                failed++;
                errors.push({ row: rowNum, title: String(row.title), reason: 'Invalid or missing value (must be a number)' });
                continue;
            }
            let contactId = null;
            if (row.contactEmail) {
                const contact = await prisma.contact.findFirst({
                    where: { email: row.contactEmail },
                });
                if (contact)
                    contactId = contact.id;
            }
            let companyId = null;
            if (row.companyName) {
                const company = await prisma.company.findFirst({
                    where: { name: { contains: row.companyName, mode: 'insensitive' } },
                });
                if (company)
                    companyId = company.id;
            }
            const stageKey = row.stage ? String(row.stage).toLowerCase().trim() : '';
            const normalizedStage = (STAGE_MAP[stageKey] ?? 'PROSPECTING');
            try {
                await prisma.deal.create({
                    data: {
                        title: String(row.title).trim(),
                        value: parsedValue,
                        stage: normalizedStage,
                        probability: row.probability ?? 10,
                        expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : null,
                        contactId,
                        companyId,
                        description: row.description ?? null,
                        userId: req.user.id,
                    },
                });
                imported++;
            }
            catch (err) {
                failed++;
                errors.push({
                    row: rowNum,
                    title: String(row.title),
                    reason: err?.message ?? 'Database error while creating deal',
                });
            }
        }
        return res.json({ imported, failed, errors });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=deals.js.map