"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/active', async (req, res) => {
    try {
        const [navigation, theme, branding] = await Promise.all([
            prisma.navigationItem.findMany({
                where: {
                    isActive: true,
                    isVisible: true,
                },
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    label: true,
                    path: true,
                    icon: true,
                    order: true,
                    roles: true,
                    badge: true,
                    badgeColor: true,
                    parentId: true,
                    metadata: true,
                },
            }),
            prisma.themeConfig.findFirst({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    primaryColor: true,
                    secondaryColor: true,
                    accentColor: true,
                    backgroundColor: true,
                    textColor: true,
                    sidebarColor: true,
                    headerColor: true,
                    buttonStyles: true,
                    fontFamily: true,
                    fontSize: true,
                    borderRadius: true,
                    customCSS: true,
                },
            }),
            prisma.brandingConfig.findFirst({
                where: { isActive: true },
                select: {
                    id: true,
                    companyName: true,
                    logoUrl: true,
                    faviconUrl: true,
                    loginBgImage: true,
                    dashboardBanner: true,
                    footerText: true,
                    supportEmail: true,
                    supportPhone: true,
                    socialLinks: true,
                },
            }),
        ]);
        const navigationTree = navigation.filter((item) => !item.parentId);
        navigationTree.forEach((parent) => {
            const children = navigation.filter((item) => item.parentId === parent.id);
            if (children.length > 0) {
                parent.children = children;
            }
        });
        res.json({
            navigation: navigationTree,
            theme: theme || null,
            branding: branding || null,
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error fetching active UI config:', error);
        res.status(500).json({ error: 'Failed to fetch UI configuration' });
    }
});
router.get('/navigation/:role?', async (req, res) => {
    try {
        const { role } = req.params;
        const whereClause = {
            isActive: true,
            isVisible: true,
        };
        if (role) {
            whereClause.roles = {
                has: role,
            };
        }
        const navigation = await prisma.navigationItem.findMany({
            where: whereClause,
            orderBy: { order: 'asc' },
            select: {
                id: true,
                label: true,
                path: true,
                icon: true,
                order: true,
                badge: true,
                badgeColor: true,
                parentId: true,
            },
        });
        const navigationTree = navigation.filter((item) => !item.parentId);
        navigationTree.forEach((parent) => {
            const children = navigation.filter((item) => item.parentId === parent.id);
            if (children.length > 0) {
                parent.children = children;
            }
        });
        res.json(navigationTree);
    }
    catch (error) {
        console.error('Error fetching navigation:', error);
        res.status(500).json({ error: 'Failed to fetch navigation' });
    }
});
router.post('/theme', async (req, res) => {
    try {
        const { name, gradients, primaryColor, secondaryColor, ...otherFields } = req.body;
        const themeData = {
            name: name || 'BrandMonkz Theme',
            primaryColor: primaryColor || '#3B82F6',
            secondaryColor: secondaryColor || '#8B5CF6',
            accentColor: otherFields.accentColor || '#10B981',
            backgroundColor: otherFields.backgroundColor || '#FFFFFF',
            textColor: otherFields.textColor || '#111827',
            buttonStyles: gradients ? { gradients } : otherFields.buttonStyles,
            fontFamily: otherFields.fontFamily,
            fontSize: otherFields.fontSize,
            borderRadius: otherFields.borderRadius,
            customCSS: otherFields.customCSS,
        };
        await prisma.themeConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const theme = await prisma.themeConfig.upsert({
            where: { name: themeData.name },
            create: { ...themeData, isActive: true },
            update: { ...themeData, isActive: true },
        });
        res.json({ success: true, theme });
    }
    catch (error) {
        console.error('Error saving theme:', error);
        res.status(500).json({ error: 'Failed to save theme configuration' });
    }
});
router.get('/themes', async (req, res) => {
    try {
        const themes = await prisma.themeConfig.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                primaryColor: true,
                secondaryColor: true,
                buttonStyles: true,
                isActive: true,
                isDefault: true,
                createdAt: true,
            },
        });
        res.json(themes);
    }
    catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});
router.put('/theme/:id/activate', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.themeConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const theme = await prisma.themeConfig.update({
            where: { id },
            data: { isActive: true },
        });
        res.json({ success: true, theme });
    }
    catch (error) {
        console.error('Error activating theme:', error);
        res.status(500).json({ error: 'Failed to activate theme' });
    }
});
exports.default = router;
//# sourceMappingURL=ui-config.js.map