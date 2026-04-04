"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticate);
function serializeQuote(q) {
    return {
        ...q,
        subtotal: Number(q.subtotal),
        tax: q.tax !== null && q.tax !== undefined ? Number(q.tax) : null,
        total: Number(q.total),
    };
}
router.get('/', async (req, res, next) => {
    try {
        const { dealId } = req.query;
        const where = { userId: req.user.id };
        if (dealId)
            where.dealId = dealId;
        const quotes = await prisma.quote.findMany({
            where,
            include: {
                deal: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(quotes.map(serializeQuote));
    }
    catch (error) {
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { dealId, title, lineItems, subtotal, tax, total, notes, validUntil, } = req.body;
        if (!dealId || !title || !lineItems || subtotal === undefined || total === undefined) {
            return res.status(400).json({ error: 'dealId, title, lineItems, subtotal, and total are required' });
        }
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId: req.user.id },
        });
        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        const quote = await prisma.quote.create({
            data: {
                dealId,
                userId: req.user.id,
                title,
                lineItems,
                subtotal: parseFloat(subtotal),
                tax: tax !== undefined && tax !== null ? parseFloat(tax) : null,
                total: parseFloat(total),
                notes: notes || null,
                validUntil: validUntil ? new Date(validUntil) : null,
            },
        });
        return res.status(201).json(serializeQuote(quote));
    }
    catch (error) {
        return next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.quote.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        const { title, lineItems, subtotal, tax, total, notes, validUntil, } = req.body;
        const updateData = { updatedAt: new Date() };
        if (title !== undefined)
            updateData.title = title;
        if (lineItems !== undefined)
            updateData.lineItems = lineItems;
        if (subtotal !== undefined)
            updateData.subtotal = parseFloat(subtotal);
        if (tax !== undefined)
            updateData.tax = tax !== null ? parseFloat(tax) : null;
        if (total !== undefined)
            updateData.total = parseFloat(total);
        if (notes !== undefined)
            updateData.notes = notes;
        if (validUntil !== undefined)
            updateData.validUntil = validUntil ? new Date(validUntil) : null;
        const quote = await prisma.quote.update({
            where: { id },
            data: updateData,
        });
        return res.json(serializeQuote(quote));
    }
    catch (error) {
        return next(error);
    }
});
router.patch('/:id/status', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const existing = await prisma.quote.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        const updateData = { status, updatedAt: new Date() };
        if (status === client_1.QuoteStatus.SENT) {
            updateData.sentAt = new Date();
        }
        else if (status === client_1.QuoteStatus.ACCEPTED) {
            updateData.acceptedAt = new Date();
        }
        const quote = await prisma.quote.update({
            where: { id },
            data: updateData,
        });
        return res.json(serializeQuote(quote));
    }
    catch (error) {
        return next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.quote.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        await prisma.quote.delete({ where: { id } });
        res.json({ message: 'Quote deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=quotes.js.map