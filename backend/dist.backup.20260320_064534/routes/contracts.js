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
        const { dealId } = req.query;
        const contracts = await prisma.contract.findMany({
            where: {
                dealId: dealId,
                userId: req.user.id,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(contracts);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { dealId, title, content, quoteId, variables, } = req.body;
        if (!dealId || !title || !content) {
            return res.status(400).json({ error: 'dealId, title, and content are required' });
        }
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId: req.user.id },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const contract = await prisma.contract.create({
            data: {
                dealId,
                userId: req.user.id,
                title,
                content,
                quoteId: quoteId || null,
                variables: variables || null,
            },
        });
        return res.status(201).json(contract);
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.contract.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        const { title, content, variables } = req.body;
        const updateData = { updatedAt: new Date() };
        if (title !== undefined)
            updateData.title = title;
        if (content !== undefined)
            updateData.content = content;
        if (variables !== undefined)
            updateData.variables = variables;
        const contract = await prisma.contract.update({
            where: { id },
            data: updateData,
        });
        return res.json(contract);
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, signedBy } = req.body;
        const existing = await prisma.contract.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        const updateData = { status, updatedAt: new Date() };
        if (status === client_1.ContractStatus.SIGNED) {
            updateData.signedAt = new Date();
            if (signedBy)
                updateData.signedBy = signedBy;
        }
        const contract = await prisma.contract.update({
            where: { id },
            data: updateData,
        });
        return res.json(contract);
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.contract.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Contract not found' });
        }
        await prisma.contract.delete({ where: { id } });
        res.json({ message: 'Contract deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=contracts.js.map