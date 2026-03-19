import { Router } from 'express';
import { PrismaClient, ContractStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all contract routes
router.use(authenticate);

// GET /api/contracts - List contracts filtered by ?dealId=
router.get('/', async (req, res, next) => {
  try {
    const { dealId } = req.query as { dealId?: string };

    const contracts = await prisma.contract.findMany({
      where: {
        dealId: dealId as string,
        userId: req.user!.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contracts);
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts - Create a new contract
router.post('/', async (req, res, next) => {
  try {
    const {
      dealId,
      title,
      content,
      quoteId,
      variables,
    } = req.body;

    if (!dealId || !title || !content) {
      return res.status(400).json({ error: 'dealId, title, and content are required' });
    }

    // Validate deal exists and belongs to authenticated user
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, userId: req.user!.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const contract = await prisma.contract.create({
      data: {
        dealId,
        userId: req.user!.id,
        title,
        content,
        quoteId: quoteId || null,
        variables: variables || null,
      },
    });

    return res.status(201).json(contract);
  } catch (error) {
    return next(error);
  }
});

// PUT /api/contracts/:id - Update a contract
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const { title, content, variables } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (variables !== undefined) updateData.variables = variables;

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return res.json(contract);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/contracts/:id/status - Update only the status field
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, signedBy } = req.body as { status: ContractStatus; signedBy?: string };

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const updateData: any = { status, updatedAt: new Date() };

    if (status === ContractStatus.SIGNED) {
      updateData.signedAt = new Date();
      if (signedBy) updateData.signedBy = signedBy;
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return res.json(contract);
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/contracts/:id - Hard delete a contract
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    await prisma.contract.delete({ where: { id } });

    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
