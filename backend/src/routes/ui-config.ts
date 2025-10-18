import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/ui-config/active
 * Public endpoint - Get active UI configuration (navigation, theme, branding)
 * No authentication required - this is used by the main app on load
 */
router.get('/active', async (req, res) => {
  try {
    const [navigation, theme, branding] = await Promise.all([
      // Get all active navigation items
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

      // Get active theme
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

      // Get active branding
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

    // Build navigation tree (parent-child hierarchy)
    const navigationTree = navigation.filter((item) => !item.parentId);
    navigationTree.forEach((parent) => {
      const children = navigation.filter((item) => item.parentId === parent.id);
      if (children.length > 0) {
        (parent as any).children = children;
      }
    });

    res.json({
      navigation: navigationTree,
      theme: theme || null,
      branding: branding || null,
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching active UI config:', error);
    res.status(500).json({ error: 'Failed to fetch UI configuration' });
  }
});

/**
 * GET /api/ui-config/navigation
 * Public endpoint - Get navigation items filtered by user role
 */
router.get('/navigation/:role?', async (req, res) => {
  try {
    const { role } = req.params;

    const whereClause: any = {
      isActive: true,
      isVisible: true,
    };

    // Filter by role if provided
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

    // Build tree structure
    const navigationTree = navigation.filter((item) => !item.parentId);
    navigationTree.forEach((parent) => {
      const children = navigation.filter((item) => item.parentId === parent.id);
      if (children.length > 0) {
        (parent as any).children = children;
      }
    });

    res.json(navigationTree);
  } catch (error: any) {
    console.error('Error fetching navigation:', error);
    res.status(500).json({ error: 'Failed to fetch navigation' });
  }
});

/**
 * POST /api/ui-config/theme
 * Super Admin only - Create or update theme configuration
 */
router.post('/theme', async (req, res) => {
  try {
    const { name, gradients, primaryColor, secondaryColor, ...otherFields } = req.body;

    // Store gradients in buttonStyles for now (avoids DB migration)
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

    // Deactivate current active theme
    await prisma.themeConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create or update theme
    const theme = await prisma.themeConfig.upsert({
      where: { name: themeData.name },
      create: { ...themeData, isActive: true },
      update: { ...themeData, isActive: true },
    });

    res.json({ success: true, theme });
  } catch (error: any) {
    console.error('Error saving theme:', error);
    res.status(500).json({ error: 'Failed to save theme configuration' });
  }
});

/**
 * GET /api/ui-config/themes
 * Get all theme configurations
 */
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
  } catch (error: any) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

/**
 * PUT /api/ui-config/theme/:id/activate
 * Super Admin only - Activate a theme
 */
router.put('/theme/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all themes
    await prisma.themeConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate selected theme
    const theme = await prisma.themeConfig.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ success: true, theme });
  } catch (error: any) {
    console.error('Error activating theme:', error);
    res.status(500).json({ error: 'Failed to activate theme' });
  }
});

export default router;
