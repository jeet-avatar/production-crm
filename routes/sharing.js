"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/share', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { resourceType, resourceId, userIds } = req.body;
        if (!resourceType || !resourceId || !userIds || !Array.isArray(userIds)) {
            throw new errorHandler_1.AppError('Resource type, resource ID, and user IDs are required', 400);
        }
        if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
            throw new errorHandler_1.AppError('Invalid resource type', 400);
        }
        let resource;
        switch (resourceType) {
            case 'contact':
                resource = await app_1.prisma.contact.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'company':
                resource = await app_1.prisma.company.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'deal':
                resource = await app_1.prisma.deal.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'activity':
                resource = await app_1.prisma.activity.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
        }
        if (!resource) {
            throw new errorHandler_1.AppError('Resource not found', 404);
        }
        const hasAccess = await (0, auth_1.canAccessResource)(req, resourceType, resourceId, resource.userId);
        if (!hasAccess && resource.userId !== userId) {
            throw new errorHandler_1.AppError('You do not have permission to share this resource', 403);
        }
        const accountOwnerId = (0, auth_1.getAccountOwnerId)(req);
        const targetUsers = await app_1.prisma.user.findMany({
            where: {
                id: { in: userIds },
                OR: [
                    { id: accountOwnerId },
                    { accountOwnerId: accountOwnerId },
                ],
                isActive: true,
            },
            select: { id: true },
        });
        if (targetUsers.length !== userIds.length) {
            throw new errorHandler_1.AppError('Some users are not in your team', 400);
        }
        const shares = [];
        for (const targetUserId of userIds) {
            let share;
            switch (resourceType) {
                case 'contact':
                    share = await app_1.prisma.contactShare.upsert({
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
                    share = await app_1.prisma.companyShare.upsert({
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
                    share = await app_1.prisma.dealShare.upsert({
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
                    share = await app_1.prisma.activityShare.upsert({
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/unshare', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { resourceType, resourceId, userIds } = req.body;
        if (!resourceType || !resourceId || !userIds || !Array.isArray(userIds)) {
            throw new errorHandler_1.AppError('Resource type, resource ID, and user IDs are required', 400);
        }
        if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
            throw new errorHandler_1.AppError('Invalid resource type', 400);
        }
        let resource;
        switch (resourceType) {
            case 'contact':
                resource = await app_1.prisma.contact.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'company':
                resource = await app_1.prisma.company.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'deal':
                resource = await app_1.prisma.deal.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
            case 'activity':
                resource = await app_1.prisma.activity.findUnique({
                    where: { id: resourceId },
                    select: { userId: true },
                });
                break;
        }
        if (!resource) {
            throw new errorHandler_1.AppError('Resource not found', 404);
        }
        const hasAccess = await (0, auth_1.canAccessResource)(req, resourceType, resourceId, resource.userId);
        if (!hasAccess && resource.userId !== userId) {
            throw new errorHandler_1.AppError('You do not have permission to unshare this resource', 403);
        }
        for (const targetUserId of userIds) {
            switch (resourceType) {
                case 'contact':
                    await app_1.prisma.contactShare.deleteMany({
                        where: {
                            contactId: resourceId,
                            userId: targetUserId,
                        },
                    });
                    break;
                case 'company':
                    await app_1.prisma.companyShare.deleteMany({
                        where: {
                            companyId: resourceId,
                            userId: targetUserId,
                        },
                    });
                    break;
                case 'deal':
                    await app_1.prisma.dealShare.deleteMany({
                        where: {
                            dealId: resourceId,
                            userId: targetUserId,
                        },
                    });
                    break;
                case 'activity':
                    await app_1.prisma.activityShare.deleteMany({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/:resourceType/:resourceId', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { resourceType, resourceId } = req.params;
        if (!['contact', 'company', 'deal', 'activity'].includes(resourceType)) {
            throw new errorHandler_1.AppError('Invalid resource type', 400);
        }
        let shares = [];
        switch (resourceType) {
            case 'contact':
                shares = await app_1.prisma.contactShare.findMany({
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
                shares = await app_1.prisma.companyShare.findMany({
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
                shares = await app_1.prisma.dealShare.findMany({
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
                shares = await app_1.prisma.activityShare.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=sharing.js.map