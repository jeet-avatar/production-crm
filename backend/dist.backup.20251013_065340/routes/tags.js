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
        const userId = req.user?.id;
        const tags = await prisma.tag.findMany({
            where: {
                userId,
            },
            include: {
                _count: {
                    select: {
                        contacts: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.json({ tags });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { name, color = '#3B82F6' } = req.body;
        const tag = await prisma.tag.create({
            data: {
                name,
                color,
                userId: userId,
            },
        });
        res.status(201).json({ tag });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { name, color } = req.body;
        const existing = await prisma.tag.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }
        const tag = await prisma.tag.update({
            where: { id },
            data: {
                name,
                color,
            },
        });
        res.json({ tag });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const existing = await prisma.tag.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Tag not found or access denied' });
        }
        await prisma.contactTag.deleteMany({
            where: { tagId: id },
        });
        await prisma.tag.delete({
            where: { id },
        });
        res.json({ message: 'Tag deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=tags.js.map