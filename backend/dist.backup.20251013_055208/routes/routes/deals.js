"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Enable authentication for all deal routes
router.use(auth_1.authenticate);
// GET /api/deals - Get all deals
router.get('/', async (req, res, next) => {
    try {
        const { search, stage, page = '1', limit = '50' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where clause
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
        // Get deals with relations
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
        // Get total count
        const total = await prisma.deal.count({ where });
        // Convert Decimal to number for JSON serialization
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
// GET /api/deals/:id - Get single deal
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const deal = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id, // Only allow access to user's own deals
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
        // Convert Decimal to Number
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
// POST /api/deals - Create new deal
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
        // Convert Decimal to Number
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
// PUT /api/deals/:id - Update deal
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, value, stage, probability, expectedCloseDate, contactId, companyId, description, } = req.body;
        // Verify ownership before update
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
        // Convert Decimal to Number
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
// PATCH /api/deals/:id/stage - Update deal stage
router.patch('/:id/stage', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;
        // ✅ Verify ownership before updating
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
        // Convert Decimal to Number
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
// DELETE /api/deals/:id - Delete deal
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        // Verify ownership before delete
        const existingDeal = await prisma.deal.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!existingDeal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        // Soft delete - mark as inactive
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
exports.default = router;
