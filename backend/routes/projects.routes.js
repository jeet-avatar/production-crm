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
        const { search, status, ownerId, page = '1', limit = '50' } = req.query;
        const pageNum = Number.parseInt(page);
        const limitNum = Number.parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status && status !== '') {
            where.status = status;
        }
        if (ownerId && ownerId !== '') {
            where.ownerId = ownerId;
        }
        const projects = await prisma.project.findMany({
            where,
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                tasks: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
            orderBy: [
                { status: 'asc' },
                { createdAt: 'desc' },
            ],
            skip,
            take: limitNum,
        });
        const total = await prisma.project.count({ where });
        const transformedProjects = projects.map(project => {
            const totalTasks = project.tasks.length;
            const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
            const actualProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            return {
                ...project,
                taskCount: totalTasks,
                completedTaskCount: completedTasks,
                actualProgress,
                tasks: undefined,
            };
        });
        res.json({
            projects: transformedProjects,
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
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                tasks: {
                    include: {
                        assignee: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
        const actualProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        res.json({
            ...project,
            taskCount: totalTasks,
            completedTaskCount: completedTasks,
            actualProgress,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, description, status, ownerId, progress, startDate, dueDate, } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }
        const project = await prisma.project.create({
            data: {
                name,
                description,
                status: status || 'PLANNING',
                ownerId: ownerId || req.user.id,
                progress: progress || 0,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        res.status(201).json(project);
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, status, ownerId, progress, startDate, dueDate, } = req.body;
        const existingProject = await prisma.project.findUnique({
            where: { id },
        });
        if (!existingProject) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (description !== undefined)
            updateData.description = description;
        if (status !== undefined) {
            updateData.status = status;
            if (status === 'COMPLETED' && existingProject.status !== 'COMPLETED') {
                updateData.completedAt = new Date();
            }
            else if (status !== 'COMPLETED' && existingProject.completedAt) {
                updateData.completedAt = null;
            }
        }
        if (ownerId !== undefined)
            updateData.ownerId = ownerId;
        if (progress !== undefined)
            updateData.progress = progress;
        if (startDate !== undefined)
            updateData.startDate = startDate ? new Date(startDate) : null;
        if (dueDate !== undefined)
            updateData.dueDate = dueDate ? new Date(dueDate) : null;
        const project = await prisma.project.update({
            where: { id },
            data: updateData,
            include: {
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        res.json(project);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        await prisma.project.delete({
            where: { id },
        });
        res.json({
            message: 'Project deleted successfully',
            tasksAffected: project.tasks.length,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/tasks', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const project = await prisma.project.findUnique({
            where: { id },
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const where = { projectId: id };
        if (status && status !== '') {
            where.status = status;
        }
        const tasks = await prisma.task.findMany({
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
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ tasks });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=projects.routes.js.map