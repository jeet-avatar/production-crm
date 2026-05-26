"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
    try {
        res.json({ message: 'Users endpoint - to be implemented' });
    }
    catch (error) {
        next(error);
    }
});
router.get('/me', async (req, res, next) => {
    try {
        res.json({
            user: req.user,
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/me', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { firstName, lastName, phone, timezone, avatar } = req.body;
        const updatedUser = await app_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(timezone && { timezone }),
                ...(avatar !== undefined && { avatar }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                timezone: true,
                avatar: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                emailNotifications: true,
                dealUpdates: true,
                newContacts: true,
                weeklyReport: true,
                marketingEmails: true,
                language: true,
                dateFormat: true,
                timeFormat: true,
                theme: true,
                compactView: true,
            },
        });
        res.json({
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/me/preferences', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { emailNotifications, dealUpdates, newContacts, weeklyReport, marketingEmails } = req.body;
        const updatedUser = await app_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(emailNotifications !== undefined && { emailNotifications }),
                ...(dealUpdates !== undefined && { dealUpdates }),
                ...(newContacts !== undefined && { newContacts }),
                ...(weeklyReport !== undefined && { weeklyReport }),
                ...(marketingEmails !== undefined && { marketingEmails }),
            },
            select: {
                id: true,
                emailNotifications: true,
                dealUpdates: true,
                newContacts: true,
                weeklyReport: true,
                marketingEmails: true,
            },
        });
        res.json({
            message: 'Notification preferences updated successfully',
            preferences: {
                emailNotifications: updatedUser.emailNotifications,
                dealUpdates: updatedUser.dealUpdates,
                newContacts: updatedUser.newContacts,
                weeklyReport: updatedUser.weeklyReport,
                marketingEmails: updatedUser.marketingEmails,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/me/display-preferences', async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            throw new errorHandler_1.AppError('User not authenticated', 401);
        }
        const { language, dateFormat, timeFormat, theme, compactView, timezone } = req.body;
        const updatedUser = await app_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(language !== undefined && { language }),
                ...(dateFormat !== undefined && { dateFormat }),
                ...(timeFormat !== undefined && { timeFormat }),
                ...(theme !== undefined && { theme }),
                ...(compactView !== undefined && { compactView }),
                ...(timezone !== undefined && { timezone }),
            },
            select: {
                id: true,
                language: true,
                dateFormat: true,
                timeFormat: true,
                theme: true,
                compactView: true,
                timezone: true,
            },
        });
        res.json({
            message: 'Display preferences updated successfully',
            preferences: {
                language: updatedUser.language,
                dateFormat: updatedUser.dateFormat,
                timeFormat: updatedUser.timeFormat,
                theme: updatedUser.theme,
                compactView: updatedUser.compactView,
                timezone: updatedUser.timezone,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map