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
        const { search, status, priority, category, assignedTo, customerId, page = '1', limit = '50' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status && status !== '') {
            where.status = status;
        }
        if (priority && priority !== '') {
            where.priority = priority;
        }
        if (category && category !== '') {
            where.category = category;
        }
        if (assignedTo && assignedTo !== '') {
            where.assignedTo = assignedTo;
        }
        if (customerId && customerId !== '') {
            where.customerId = customerId;
        }
        const tickets = await prisma.supportTicket.findMany({
            where,
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                comments: {
                    select: {
                        id: true,
                        isInternal: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' },
            ],
            skip,
            take: limitNum,
        });
        const total = await prisma.supportTicket.count({ where });
        const transformedTickets = tickets.map(ticket => ({
            ...ticket,
            commentCount: ticket.comments.length,
            internalCommentCount: ticket.comments.filter(c => c.isInternal).length,
            comments: undefined,
        }));
        res.json({
            tickets: transformedTickets,
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
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        website: true,
                    },
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });
        if (!ticket) {
            return res.status(404).json({ error: 'Support ticket not found' });
        }
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { title, description, status, priority, category, assignedTo, customerId, } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Ticket title is required' });
        }
        if (!description) {
            return res.status(400).json({ error: 'Ticket description is required' });
        }
        const ticket = await prisma.supportTicket.create({
            data: {
                title,
                description,
                status: status || 'OPEN',
                priority: priority || 'MEDIUM',
                category: category || 'GENERAL',
                assignedTo: assignedTo || null,
                customerId: customerId || null,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, category, assignedTo, customerId, } = req.body;
        const existingTicket = await prisma.supportTicket.findUnique({
            where: { id },
        });
        if (!existingTicket) {
            return res.status(404).json({ error: 'Support ticket not found' });
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
                updateData.resolvedAt = new Date();
            }
            if (status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
                updateData.closedAt = new Date();
            }
            if (status !== 'RESOLVED' && existingTicket.resolvedAt) {
                updateData.resolvedAt = null;
            }
            if (status !== 'CLOSED' && existingTicket.closedAt) {
                updateData.closedAt = null;
            }
        }
        if (priority !== undefined)
            updateData.priority = priority;
        if (category !== undefined)
            updateData.category = category;
        if (assignedTo !== undefined)
            updateData.assignedTo = assignedTo || null;
        if (customerId !== undefined)
            updateData.customerId = customerId || null;
        const ticket = await prisma.supportTicket.update({
            where: { id },
            data: updateData,
            include: {
                assignee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
        });
        if (!ticket) {
            return res.status(404).json({ error: 'Support ticket not found' });
        }
        await prisma.supportTicket.delete({
            where: { id },
        });
        res.json({ message: 'Support ticket deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/comments', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content, isInternal } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Comment content is required' });
        }
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
        });
        if (!ticket) {
            return res.status(404).json({ error: 'Support ticket not found' });
        }
        const comment = await prisma.ticketComment.create({
            data: {
                content,
                isInternal: isInternal || false,
                ticketId: id,
                authorId: req.user.id,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        res.status(201).json(comment);
    }
    catch (error) {
        next(error);
    }
});
router.get('/stats/overview', async (req, res, next) => {
    try {
        const { assignedTo, customerId } = req.query;
        const where = {};
        if (assignedTo)
            where.assignedTo = assignedTo;
        if (customerId)
            where.customerId = customerId;
        const [openCount, inProgressCount, waitingCount, resolvedCount, closedCount, totalCount,] = await Promise.all([
            prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
            prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
            prisma.supportTicket.count({ where: { ...where, status: 'WAITING_ON_CUSTOMER' } }),
            prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
            prisma.supportTicket.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.supportTicket.count({ where }),
        ]);
        const [criticalCount, highCount, mediumCount, lowCount] = await Promise.all([
            prisma.supportTicket.count({ where: { ...where, priority: 'CRITICAL' } }),
            prisma.supportTicket.count({ where: { ...where, priority: 'HIGH' } }),
            prisma.supportTicket.count({ where: { ...where, priority: 'MEDIUM' } }),
            prisma.supportTicket.count({ where: { ...where, priority: 'LOW' } }),
        ]);
        res.json({
            byStatus: {
                open: openCount,
                inProgress: inProgressCount,
                waiting: waitingCount,
                resolved: resolvedCount,
                closed: closedCount,
            },
            byPriority: {
                critical: criticalCount,
                high: highCount,
                medium: mediumCount,
                low: lowCount,
            },
            total: totalCount,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=tickets.routes.js.map