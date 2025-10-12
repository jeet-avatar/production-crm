import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all activity routes
router.use(authenticate);

// GET /api/activities - Get all activities
router.get('/', async (req, res, next) => {
  try {
    const { 
      contactId,
      type,
      page = '1', 
      limit = '20' 
    } = req.query as {
      contactId?: string;
      type?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with user isolation
    const where: any = {
      userId: req.user?.id, // Only show activities owned by this user
    };

    if (contactId) {
      where.contactId = contactId;
    }

    if (type && type !== '') {
      where.type = type;
    }

    // Get activities with relations
    const activities = await prisma.activity.findMany({
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
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
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.activity.count({ where });

    res.json({
      activities,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/contacts/:contactId - Get activities for specific contact
router.get('/contacts/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;

    // CRITICAL: Verify contact belongs to this user (data isolation)
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId, // ✅ Data isolation maintained
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get activities for this contact with userId filter
    const activities = await prisma.activity.findMany({
      where: {
        contactId,
        userId, // ✅ Data isolation maintained
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return empty array if no activities (NOT 404)
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

// POST /api/activities - Create new activity
router.post('/', async (req, res, next) => {
  try {
    const {
      type = 'NOTE',
      subject,
      description,
      contactId,
      dealId,
      dueDate,
      priority = 'MEDIUM',
    } = req.body;

    const activity = await prisma.activity.create({
      data: {
        type,
        subject,
        description,
        contactId: contactId || null,
        dealId: dealId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        userId: req.user!.id,
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
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ activity });
  } catch (error) {
    next(error);
  }
});

export default router;