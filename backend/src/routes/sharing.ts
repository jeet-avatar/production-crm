import { Router } from 'express';
import { authenticate, getAccountOwnerId, canAccessResource } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/sharing/share
 * Share a resource with team member(s)
 * Body: {
 *   resourceType: 'contact' | 'company' | 'deal' | 'activity',
 *   resourceId: string,
 *   userIds: string[] // Team members to share with
 * }
 */
router.post('/share', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { resourceType, resourceId, userIds } = req.body;

    // Validate input
    if (!resourceType || !resourceId || !userIds || !Array.isArray(userIds)) {
      throw new AppError('Resource type, resource ID, and user IDs are required', 400);
    }

    if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
      throw new AppError('Invalid resource type', 400);
    }

    // Check if user owns the resource or has access to it
    let resource: any;
    switch (resourceType) {
      case 'contact':
        resource = await prisma.contact.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'company':
        resource = await prisma.company.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'deal':
        resource = await prisma.deal.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'activity':
        resource = await prisma.activity.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
    }

    if (!resource) {
      throw new AppError('Resource not found', 404);
    }

    // Check if user has permission to share (owner or account owner)
    const hasAccess = await canAccessResource(req, resourceType, resourceId, resource.userId);
    if (!hasAccess && resource.userId !== userId) {
      throw new AppError('You do not have permission to share this resource', 403);
    }

    // Verify all target users are in the same account
    const accountOwnerId = getAccountOwnerId(req);
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        OR: [
          { id: accountOwnerId }, // Account owner
          { accountOwnerId: accountOwnerId }, // Team members
        ],
        isActive: true,
      },
      select: { id: true },
    });

    if (targetUsers.length !== userIds.length) {
      throw new AppError('Some users are not in your team', 400);
    }

    // Create sharing records
    const shares = [];
    for (const targetUserId of userIds) {
      let share;
      switch (resourceType) {
        case 'contact':
          share = await prisma.contactShare.upsert({
            where: {
              contactId_userId: {
                contactId: resourceId,
                userId: targetUserId,
              },
            },
            update: {},
            create: {
              contactId: resourceId,
              userId: targetUserId,
              sharedBy: userId,
            },
          });
          break;
        case 'company':
          share = await prisma.companyShare.upsert({
            where: {
              companyId_userId: {
                companyId: resourceId,
                userId: targetUserId,
              },
            },
            update: {},
            create: {
              companyId: resourceId,
              userId: targetUserId,
              sharedBy: userId,
            },
          });
          break;
        case 'deal':
          share = await prisma.dealShare.upsert({
            where: {
              dealId_userId: {
                dealId: resourceId,
                userId: targetUserId,
              },
            },
            update: {},
            create: {
              dealId: resourceId,
              userId: targetUserId,
              sharedBy: userId,
            },
          });
          break;
        case 'activity':
          share = await prisma.activityShare.upsert({
            where: {
              activityId_userId: {
                activityId: resourceId,
                userId: targetUserId,
              },
            },
            update: {},
            create: {
              activityId: resourceId,
              userId: targetUserId,
              sharedBy: userId,
            },
          });
          break;
      }
      shares.push(share);
    }

    res.json({
      message: `${resourceType} shared successfully`,
      shares,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sharing/unshare
 * Unshare a resource with team member(s)
 * Body: {
 *   resourceType: 'contact' | 'company' | 'deal' | 'activity',
 *   resourceId: string,
 *   userIds: string[] // Team members to unshare with
 * }
 */
router.post('/unshare', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { resourceType, resourceId, userIds } = req.body;

    // Validate input
    if (!resourceType || !resourceId || !userIds || !Array.isArray(userIds)) {
      throw new AppError('Resource type, resource ID, and user IDs are required', 400);
    }

    if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
      throw new AppError('Invalid resource type', 400);
    }

    // Check if user owns the resource or has access to it
    let resource: any;
    switch (resourceType) {
      case 'contact':
        resource = await prisma.contact.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'company':
        resource = await prisma.company.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'deal':
        resource = await prisma.deal.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
      case 'activity':
        resource = await prisma.activity.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        break;
    }

    if (!resource) {
      throw new AppError('Resource not found', 404);
    }

    // Check if user has permission to unshare (owner or account owner)
    const hasAccess = await canAccessResource(req, resourceType, resourceId, resource.userId);
    if (!hasAccess && resource.userId !== userId) {
      throw new AppError('You do not have permission to unshare this resource', 403);
    }

    // Delete sharing records
    for (const targetUserId of userIds) {
      switch (resourceType) {
        case 'contact':
          await prisma.contactShare.deleteMany({
            where: {
              contactId: resourceId,
              userId: targetUserId,
            },
          });
          break;
        case 'company':
          await prisma.companyShare.deleteMany({
            where: {
              companyId: resourceId,
              userId: targetUserId,
            },
          });
          break;
        case 'deal':
          await prisma.dealShare.deleteMany({
            where: {
              dealId: resourceId,
              userId: targetUserId,
            },
          });
          break;
        case 'activity':
          await prisma.activityShare.deleteMany({
            where: {
              activityId: resourceId,
              userId: targetUserId,
            },
          });
          break;
      }
    }

    res.json({
      message: `${resourceType} unshared successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sharing/:resourceType/:resourceId
 * Get all users a resource is shared with
 */
router.get('/:resourceType/:resourceId', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { resourceType, resourceId } = req.params;

    // Validate resource type
    if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
      throw new AppError('Invalid resource type', 400);
    }

    // Get sharing records
    let shares: any[] = [];
    switch (resourceType) {
      case 'contact':
        shares = await prisma.contactShare.findMany({
          where: { contactId: resourceId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        break;
      case 'company':
        shares = await prisma.companyShare.findMany({
          where: { companyId: resourceId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        break;
      case 'deal':
        shares = await prisma.dealShare.findMany({
          where: { dealId: resourceId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        break;
      case 'activity':
        shares = await prisma.activityShare.findMany({
          where: { activityId: resourceId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
        break;
    }

    res.json({
      shares,
      count: shares.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
