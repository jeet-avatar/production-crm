"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessResource = exports.isResourceOwner = exports.getAccountOwnerId = exports.authorize = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const errorHandler_1 = require("./errorHandler");
const app_1 = require("../app");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = auth_1.AuthUtils.extractTokenFromHeader(authHeader);
        if (!token) {
            throw new errorHandler_1.AppError('Access token is required', 401);
        }
        const payload = auth_1.AuthUtils.verifyToken(token);
        const user = await app_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                isActive: true,
                teamRole: true,
                accountOwnerId: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 401);
        }
        if (!user.isActive) {
            throw new errorHandler_1.AppError('Account is deactivated', 401);
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new errorHandler_1.AppError('Authentication required', 401);
        }
        if (!roles.includes(req.user.role)) {
            throw new errorHandler_1.AppError('Insufficient permissions', 403);
        }
        next();
    };
};
exports.authorize = authorize;
const getAccountOwnerId = (req) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    if (req.user.teamRole === 'OWNER') {
        return req.user.id;
    }
    if (req.user.teamRole === 'MEMBER' && req.user.accountOwnerId) {
        return req.user.accountOwnerId;
    }
    return req.user.id;
};
exports.getAccountOwnerId = getAccountOwnerId;
const isResourceOwner = (req, resourceUserId) => {
    return req.user?.id === resourceUserId;
};
exports.isResourceOwner = isResourceOwner;
const canAccessResource = async (req, resourceType, resourceId, resourceUserId) => {
    if (!req.user) {
        return false;
    }
    if (resourceUserId === req.user.id) {
        return true;
    }
    if (req.user.teamRole === 'OWNER') {
        const accountOwnerId = (0, exports.getAccountOwnerId)(req);
        const resourceOwnerAccountOwnerId = await getResourceOwnerAccountOwnerId(resourceUserId);
        if (accountOwnerId === resourceOwnerAccountOwnerId) {
            return true;
        }
    }
    const isShared = await checkResourceSharing(resourceType, resourceId, req.user.id);
    return isShared;
};
exports.canAccessResource = canAccessResource;
const getResourceOwnerAccountOwnerId = async (userId) => {
    const user = await app_1.prisma.user.findUnique({
        where: { id: userId },
        select: { teamRole: true, accountOwnerId: true, id: true },
    });
    if (!user) {
        throw new errorHandler_1.AppError('User not found', 404);
    }
    return user.teamRole === 'OWNER' ? user.id : user.accountOwnerId || user.id;
};
const checkResourceSharing = async (resourceType, resourceId, userId) => {
    switch (resourceType) {
        case 'contact':
            const contactShare = await app_1.prisma.contactShare.findUnique({
                where: { contactId_userId: { contactId: resourceId, userId } },
            });
            return !!contactShare;
        case 'company':
            const companyShare = await app_1.prisma.companyShare.findUnique({
                where: { companyId_userId: { companyId: resourceId, userId } },
            });
            return !!companyShare;
        case 'deal':
            const dealShare = await app_1.prisma.dealShare.findUnique({
                where: { dealId_userId: { dealId: resourceId, userId } },
            });
            return !!dealShare;
        case 'activity':
            const activityShare = await app_1.prisma.activityShare.findUnique({
                where: { activityId_userId: { activityId: resourceId, userId } },
            });
            return !!activityShare;
        default:
            return false;
    }
};
//# sourceMappingURL=auth.js.map