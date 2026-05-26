import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../app';

const router = Router();

// Super admin email - loaded from environment variable for security
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

// Validate that SUPER_ADMIN_EMAIL is configured
if (!SUPER_ADMIN_EMAIL) {
  console.error('❌ SECURITY ERROR: SUPER_ADMIN_EMAIL environment variable is not set');
  console.error('   Please set SUPER_ADMIN_EMAIL in your .env file');
  throw new Error('SUPER_ADMIN_EMAIL environment variable is required for super admin functionality');
}

// Middleware to check super admin access
const requireSuperAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(403).json({ error: 'Access denied - User not found' });
    }

    // SECURITY: Role-based access control (RBAC)
    // Only users with SUPER_ADMIN role can access these endpoints
    if (user.role !== 'SUPER_ADMIN') {
      console.warn(`⚠️ Unauthorized super admin access attempt by ${user.email} (role: ${user.role})`);
      return res.status(403).json({ error: 'Access denied - Super admin role required' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

router.use(authenticate);
router.use(requireSuperAdmin);

// GET /api/super-admin/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    // Fetch all statistics
    const [
      totalUsers,
      activeUsers,
      totalContacts,
      totalCompanies,
      totalDeals,
      totalCampaigns,
      totalActivities,
      totalTags,
      emailsSent24h,
      emailDeliveryStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { not: null } } }),
      prisma.contact.count(),
      prisma.company.count(),
      prisma.deal.count(),
      prisma.campaign.count(),
      prisma.activity.count(),
      prisma.tag.count(),
      prisma.emailLog.count({
        where: {
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.emailLog.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const deliveredEmails = emailDeliveryStats.find(s => s.status === 'DELIVERED')?._count || 0;
    const failedEmails = emailDeliveryStats.find(s => s.status === 'FAILED')?._count || 0;
    const bouncedEmails = emailDeliveryStats.find(s => s.status === 'BOUNCED')?._count || 0;
    const totalEmailsSent = emailDeliveryStats.reduce((sum, s) => sum + s._count, 0);

    const emailDeliveryRate = totalEmailsSent > 0
      ? Math.round((deliveredEmails / totalEmailsSent) * 100)
      : 100;

    // Get theme count (placeholder - implement if needed)
    const totalThemes = 1;
    const activeTheme = { name: 'Default' };

    // Get credentials count (placeholder - implement if needed)
    const totalCredentials = 0;

    // Get recent activities (last 7 days)
    const recentActivityLogs = await prisma.activity.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalActivityActions = await prisma.activity.count();

    // Get recent signups (last 7 days)
    const recentSignups = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const stats = {
      // CRM Metrics
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalContacts,
      totalCompanies,
      totalDeals,
      totalCampaigns,
      totalActivities,
      totalTags,
      recentSignups,
      recentSignupsSubtext: 'Last 7 days',

      // System & Infrastructure
      techComponents: 24,
      healthyComponents: 24,
      totalTables: 10,
      databaseSize: '< 100 MB',

      // System Status
      systemStatus: 'healthy',
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,

      // Configuration & Monitoring
      totalThemes,
      activeTheme: activeTheme?.name || 'Default',
      totalCredentials,
      credentialsSubtext: `${totalCredentials} stored`,
      recentActivityLogs,
      recentActivityLogsSubtext: 'Last 7 days',
      totalActivityActions,
      totalActivityActionsSubtext: 'All time',

      // Email & Jobs Performance
      emailsSent24h,
      emailsSent24hSubtext: 'Last 24 hours',
      emailDeliveryRate,
      failedEmails: failedEmails + bouncedEmails,
      jobsProcessed24h: 0, // Placeholder - implement job queue tracking
      jobsProcessed24hSubtext: 'Last 24 hours',
      jobSuccessRate: 100,
      pendingJobs: 0,
      failedJobs: 0,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/users - Get users with pagination
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/tech-stack - Get tech stack information
router.get('/tech-stack', async (req, res, next) => {
  try {
    const infrastructure = [
      { name: 'AWS EC2', version: 'Amazon Linux 2023', status: 'healthy', category: 'hosting' },
      { name: 'Nginx', version: '1.24.x', status: 'healthy', category: 'webserver' },
      { name: 'PM2', version: '5.x', status: 'healthy', category: 'process-manager' },
      { name: 'Node.js', version: process.version, status: 'healthy', category: 'runtime' },
    ];

    const frontend = [
      { name: 'React', version: '18.x', status: 'healthy', category: 'framework' },
      { name: 'TypeScript', version: '5.x', status: 'healthy', category: 'language' },
      { name: 'Vite', version: '7.x', status: 'healthy', category: 'build-tool' },
      { name: 'Tailwind CSS', version: '3.x', status: 'healthy', category: 'styling' },
      { name: 'React Query', version: '5.x', status: 'healthy', category: 'state' },
    ];

    const backend = [
      { name: 'Express', version: '4.x', status: 'healthy', category: 'framework' },
      { name: 'TypeScript', version: '5.x', status: 'healthy', category: 'language' },
      { name: 'Prisma', version: '5.x', status: 'healthy', category: 'orm' },
    ];

    const database = [
      { name: 'PostgreSQL', version: '15.x', status: 'healthy', category: 'database' },
    ];

    const integrations = [
      { name: 'AWS SES', version: 'Latest', status: 'healthy', category: 'email' },
      { name: 'Anthropic Claude', version: '3.5', status: 'healthy', category: 'ai' },
      { name: 'Stripe', version: 'Latest', status: 'healthy', category: 'payment' },
      { name: 'GoDaddy', version: 'API v1', status: 'healthy', category: 'domains' },
      { name: 'Twilio', version: 'Latest', status: 'healthy', category: 'sms' },
    ];

    const allComponents = [
      ...infrastructure,
      ...frontend,
      ...backend,
      ...database,
      ...integrations,
    ];

    const techStack = {
      summary: {
        totalComponents: allComponents.length,
        healthyComponents: allComponents.filter(c => c.status === 'healthy').length,
        categories: 5,
        lastUpdated: new Date().toISOString(),
      },
      infrastructure,
      frontend,
      backend,
      database,
      integrations,
    };

    res.json(techStack);
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/themes - Get all UI themes
router.get('/themes', async (req, res, next) => {
  try {
    const themes = await prisma.uITheme.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ themes });
  } catch (error) {
    next(error);
  }
});

// POST /api/super-admin/themes - Create new theme
router.post('/themes', async (req, res, next) => {
  try {
    const { name, primaryColor, secondaryColor, accentColor } = req.body;

    // Validate required fields
    if (!name || !primaryColor || !secondaryColor || !accentColor) {
      return res.status(400).json({ error: 'Missing required fields: name, primaryColor, secondaryColor, accentColor' });
    }

    const theme = await prisma.uITheme.create({
      data: {
        name,
        primaryColor,
        secondaryColor,
        accentColor,
        isActive: false,
      },
    });

    res.status(201).json({ theme });
  } catch (error) {
    next(error);
  }
});

// PUT /api/super-admin/themes/:id - Update theme
router.put('/themes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, primaryColor, secondaryColor, accentColor } = req.body;

    // Build update data object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;

    const theme = await prisma.uITheme.update({
      where: { id },
      data: updateData,
    });

    res.json({ theme });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Theme not found' });
    }
    next(error);
  }
});

// DELETE /api/super-admin/themes/:id - Delete theme
router.delete('/themes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if theme is currently active
    const theme = await prisma.uITheme.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (theme?.isActive) {
      return res.status(400).json({ error: 'Cannot delete active theme. Please activate another theme first.' });
    }

    await prisma.uITheme.delete({
      where: { id },
    });

    res.json({ message: 'Theme deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Theme not found' });
    }
    next(error);
  }
});

// PUT /api/super-admin/themes/:id/activate - Activate theme
router.put('/themes/:id/activate', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Deactivate all other themes first
    await prisma.uITheme.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate the selected theme
    const theme = await prisma.uITheme.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ theme, message: 'Theme activated successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Theme not found' });
    }
    next(error);
  }
});

// GET /api/super-admin/branding - Get branding configuration
router.get('/branding', async (req, res, next) => {
  try {
    // Get active branding config from database
    const activeBranding = await prisma.brandingConfig.findFirst({
      where: { isActive: true },
    });

    // If no active branding, return defaults
    if (!activeBranding) {
      const defaultBranding = {
        companyName: process.env.BRAND_NAME || 'BrandMonkz',
        logoUrl: '/logo.png',
        primaryColor: '#ea580c',
        secondaryColor: '#fb923c',
        tagline: 'Your CRM Solution',
        isActive: false,
      };
      return res.json(defaultBranding);
    }

    res.json(activeBranding);
  } catch (error) {
    next(error);
  }
});

// POST /api/super-admin/branding - Create branding configuration
router.post('/branding', async (req, res, next) => {
  try {
    const { companyName, logoUrl, primaryColor, secondaryColor, tagline } = req.body;

    // Validate required fields
    if (!companyName || !primaryColor || !secondaryColor) {
      return res.status(400).json({ error: 'Missing required fields: companyName, primaryColor, secondaryColor' });
    }

    // Deactivate all other branding configs
    await prisma.brandingConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new branding config and make it active
    const branding = await prisma.brandingConfig.create({
      data: {
        companyName,
        logoUrl: logoUrl || null,
        primaryColor,
        secondaryColor,
        tagline: tagline || null,
        isActive: true,
      },
    });

    res.status(201).json(branding);
  } catch (error) {
    next(error);
  }
});

// PUT /api/super-admin/branding/:id - Update branding configuration
router.put('/branding/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, logoUrl, primaryColor, secondaryColor, tagline } = req.body;

    // Build update data object with only provided fields
    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (tagline !== undefined) updateData.tagline = tagline;

    const branding = await prisma.brandingConfig.update({
      where: { id },
      data: updateData,
    });

    res.json(branding);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Branding configuration not found' });
    }
    next(error);
  }
});

// PUT /api/super-admin/branding/:id/activate - Activate branding configuration
router.put('/branding/:id/activate', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Deactivate all other branding configs
    await prisma.brandingConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate the selected branding
    const branding = await prisma.brandingConfig.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ branding, message: 'Branding activated successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Branding configuration not found' });
    }
    next(error);
  }
});

// GET /api/super-admin/database/tables - Get database table information
router.get('/database/tables', async (req, res, next) => {
  try {
    // Get counts for all major tables
    const [
      users,
      contacts,
      companies,
      deals,
      activities,
      campaigns,
      emailLogs,
      tags,
      emailTemplates,
      systemTemplates,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.contact.count().catch(() => 0),
      prisma.company.count().catch(() => 0),
      prisma.deal.count().catch(() => 0),
      prisma.activity.count().catch(() => 0),
      prisma.campaign.count().catch(() => 0),
      prisma.emailLog.count().catch(() => 0),
      prisma.tag.count().catch(() => 0),
      prisma.emailTemplate.count().catch(() => 0),
      prisma.systemEmailTemplate.count().catch(() => 0),
    ]);

    const tables = [
      { name: 'users', rowCount: users, description: 'User accounts' },
      { name: 'contacts', rowCount: contacts, description: 'Contact records' },
      { name: 'companies', rowCount: companies, description: 'Company records' },
      { name: 'deals', rowCount: deals, description: 'Sales deals' },
      { name: 'activities', rowCount: activities, description: 'Activity logs' },
      { name: 'campaigns', rowCount: campaigns, description: 'Email campaigns' },
      { name: 'email_logs', rowCount: emailLogs, description: 'Email tracking' },
      { name: 'tags', rowCount: tags, description: 'Tags and labels' },
      { name: 'email_templates', rowCount: emailTemplates, description: 'User email templates' },
      { name: 'system_email_templates', rowCount: systemTemplates, description: 'System email templates' },
    ];

    res.json({ tables });
  } catch (error) {
    console.error('Error fetching database tables:', error);
    next(error);
  }
});

// GET /api/super-admin/database/tables/:tableName/schema - Get table schema
router.get('/database/tables/:tableName/schema', async (req, res, next) => {
  try {
    const { tableName } = req.params;

    // Map frontend table names to Prisma model names
    const modelMap: Record<string, string> = {
      'users': 'user',
      'contacts': 'contact',
      'companies': 'company',
      'deals': 'deal',
      'activities': 'activity',
      'campaigns': 'campaign',
      'email_logs': 'emailLog',
      'tags': 'tag',
      'email_templates': 'emailTemplate',
      'system_email_templates': 'systemEmailTemplate',
    };

    const modelName = modelMap[tableName];
    if (!modelName) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get a sample record to infer schema
    const model = (prisma as any)[modelName];
    const sampleRecord = await model.findFirst();

    if (!sampleRecord) {
      // If no records, return empty schema
      return res.json([]);
    }

    // Build schema from sample record
    const schema = Object.keys(sampleRecord).map((key) => {
      const value = sampleRecord[key];
      let type: string = typeof value;

      if (value === null) {
        type = 'null';
      } else if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (typeof value === 'object') {
        type = 'json';
      }

      return {
        name: key,
        type,
        nullable: value === null,
      };
    });

    res.json(schema);
  } catch (error) {
    console.error('Error fetching table schema:', error);
    next(error);
  }
});

// GET /api/super-admin/database/tables/:tableName/data - Get table data with pagination
router.get('/database/tables/:tableName/data', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Map frontend table names to Prisma model names
    const modelMap: Record<string, string> = {
      'users': 'user',
      'contacts': 'contact',
      'companies': 'company',
      'deals': 'deal',
      'activities': 'activity',
      'campaigns': 'campaign',
      'email_logs': 'emailLog',
      'tags': 'tag',
      'email_templates': 'emailTemplate',
      'system_email_templates': 'systemEmailTemplate',
    };

    const modelName = modelMap[tableName];
    if (!modelName) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const model = (prisma as any)[modelName];

    const [data, total] = await Promise.all([
      model.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      model.count(),
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    next(error);
  }
});

// PUT /api/super-admin/database/tables/:tableName/rows/:id - Update a row in a table
router.put('/database/tables/:tableName/rows/:id', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;
    const updateData = req.body;

    // Map frontend table names to Prisma model names
    const modelMap: Record<string, string> = {
      'users': 'user',
      'contacts': 'contact',
      'companies': 'company',
      'deals': 'deal',
      'activities': 'activity',
      'campaigns': 'campaign',
      'email_logs': 'emailLog',
      'tags': 'tag',
      'email_templates': 'emailTemplate',
      'system_email_templates': 'systemEmailTemplate',
    };

    // Protected tables that cannot be edited
    const protectedTables = ['system_email_templates'];

    if (protectedTables.includes(tableName)) {
      return res.status(403).json({ error: 'Cannot edit protected system tables' });
    }

    const modelName = modelMap[tableName];
    if (!modelName) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Additional protection: Don't allow editing SUPER_ADMIN users
    if (tableName === 'users') {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (existingUser?.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot edit super admin accounts through database browser' });
      }
    }

    const model = (prisma as any)[modelName];

    // Remove fields that shouldn't be updated
    const { id: _, createdAt, updatedAt, ...safeUpdateData } = updateData;

    const updated = await model.update({
      where: { id },
      data: safeUpdateData,
    });

    res.json({ message: 'Record updated successfully', data: updated });
  } catch (error: any) {
    console.error('Error updating table row:', error);
    res.status(500).json({ error: 'Failed to update record', details: error.message });
  }
});

// DELETE /api/super-admin/database/tables/:tableName/rows/:id - Delete a row from a table
router.delete('/database/tables/:tableName/rows/:id', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;

    // Map frontend table names to Prisma model names
    const modelMap: Record<string, string> = {
      'users': 'user',
      'contacts': 'contact',
      'companies': 'company',
      'deals': 'deal',
      'activities': 'activity',
      'campaigns': 'campaign',
      'email_logs': 'emailLog',
      'tags': 'tag',
      'email_templates': 'emailTemplate',
      'system_email_templates': 'systemEmailTemplate',
    };

    // Protected tables that cannot be deleted from
    const protectedTables = ['system_email_templates'];

    if (protectedTables.includes(tableName)) {
      return res.status(403).json({ error: 'Cannot delete from protected system tables' });
    }

    const modelName = modelMap[tableName];
    if (!modelName) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Additional protection: Don't allow deleting SUPER_ADMIN users
    if (tableName === 'users') {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (existingUser?.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot delete super admin accounts through database browser' });
      }
    }

    const model = (prisma as any)[modelName];

    await model.delete({
      where: { id },
    });

    res.json({ message: 'Record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting table row:', error);
    res.status(500).json({ error: 'Failed to delete record', details: error.message });
  }
});

// GET /api/super-admin/activity-logs - Get activity logs with pagination
router.get('/activity-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days

    const [logs, total] = await Promise.all([
      prisma.activity.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.activity.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/activity-logs/stats - Get activity log statistics
router.get('/activity-logs/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalLogs, logsLast24Hours, logsLast7Days, logsLast30Days, logsByType] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.activity.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.activity.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.activity.groupBy({
        by: ['type'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
        orderBy: {
          _count: {
            type: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    res.json({
      totalLogs,
      logsLast24Hours,
      logsLast7Days,
      logsLast30Days,
      logsByAction: logsByType.map(item => ({
        action: item.type,
        count: item._count,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/email-logs - Get email logs with pagination
router.get('/email-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const recipient = (req.query.recipient as string) || (req.query.recipientEmail as string);

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (recipient) {
      where.toEmail = { contains: recipient, mode: 'insensitive' };
    }

    // Get total count
    const total = await prisma.emailLog.count({ where });

    // Get email logs
    const emailLogs = await prisma.emailLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sentAt: 'desc' },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
      },
    });

    res.json({
      emailLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/email-logs/stats - Get email log statistics
router.get('/email-logs/stats', async (req, res, next) => {
  try {
    const [totalEmails, deliveredEmails, openedEmails, bouncedEmails, failedEmails] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'DELIVERED' } }),
      prisma.emailLog.count({ where: { status: 'OPENED' } }),
      prisma.emailLog.count({ where: { status: 'BOUNCED' } }),
      prisma.emailLog.count({ where: { status: 'FAILED' } }),
    ]);

    const deliveryRate = totalEmails > 0 ? Math.round((deliveredEmails / totalEmails) * 100) : 0;
    const openRate = deliveredEmails > 0 ? Math.round((openedEmails / deliveredEmails) * 100) : 0;
    const bounceRate = totalEmails > 0 ? Math.round((bouncedEmails / totalEmails) * 100) : 0;

    res.json({
      totalEmails,
      deliveredEmails,
      openedEmails,
      bouncedEmails,
      failedEmails,
      deliveryRate,
      openRate,
      bounceRate,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/super-admin/users/:id - Delete user (super admin only)
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Don't allow deleting any super admin
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot delete super admin account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/super-admin/users/:id/role - Update user role
router.patch('/users/:id/role', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Don't allow changing anyone with SUPER_ADMIN role (protect Ethan's account)
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot change super admin role' });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Website Visitor Tracking ====================

// GET /api/super-admin/website-visits/stats - Get website visitor statistics
router.get('/website-visits/stats', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const [
      totalVisits,
      uniqueVisitors,
      authenticatedVisits,
      anonymousVisits,
      totalPageViews,
      avgTimeOnPage,
    ] = await Promise.all([
      // Total visits
      prisma.websiteVisit.count(),

      // Unique visitors (by IP + User Agent combination)
      prisma.websiteVisit.groupBy({
        by: ['ipAddress', 'userAgent'],
      }).then(groups => groups.length),

      // Authenticated visits
      prisma.websiteVisit.count({
        where: { isAuthenticated: true },
      }),

      // Anonymous visits
      prisma.websiteVisit.count({
        where: { isAuthenticated: false },
      }),

      // Total page views
      prisma.websiteVisit.count({
        where: {
          path: { not: '/' },
        },
      }),

      // Average time on page
      prisma.websiteVisit.aggregate({
        _avg: { timeOnPage: true },
        where: { timeOnPage: { not: null } },
      }).then(result => result._avg.timeOnPage || 0),
    ]);

    // Get top pages visited
    const topPages = await prisma.websiteVisit.groupBy({
      by: ['path'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get visits by domain (http vs https, www vs non-www)
    const domainBreakdown = await prisma.websiteVisit.groupBy({
      by: ['domain', 'protocol'],
      _count: { id: true },
    });

    // Get geographic breakdown (top 10 countries)
    const topCountriesRaw = await prisma.websiteVisit.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
      where: { country: { not: null } },
    });

    const topCountries = topCountriesRaw.map(c => ({
      country: c.country,
      countryCode: null, // TODO: Add countryCode to database schema
      visits: c._count.id,
    }));

    // Get device breakdown
    const deviceBreakdown = await prisma.websiteVisit.groupBy({
      by: ['device'],
      _count: { id: true },
      where: { device: { not: null } },
    });

    // Get browser breakdown
    const browserBreakdown = await prisma.websiteVisit.groupBy({
      by: ['browser'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
      where: { browser: { not: null } },
    });

    res.json({
      totalVisits,
      uniqueVisitors,
      authenticatedVisits,
      anonymousVisits,
      totalPageViews,
      avgTimeOnPage: Math.round(avgTimeOnPage),
      topPages: topPages.map(p => ({ path: p.path, visits: p._count.id })),
      domainBreakdown: domainBreakdown.map(d => ({
        domain: d.domain,
        protocol: d.protocol,
        visits: d._count.id,
      })),
      topCountries,
      deviceBreakdown: deviceBreakdown.map(d => ({ device: d.device, visits: d._count.id })),
      browserBreakdown: browserBreakdown.map(b => ({ browser: b.browser, visits: b._count.id })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/website-visits - Get website visitor logs with pagination
router.get('/website-visits', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const domain = req.query.domain as string;
    const protocol = req.query.protocol as string;
    const path = req.query.path as string;
    const isAuthenticated = req.query.isAuthenticated as string;
    const country = req.query.country as string;
    const device = req.query.device as string;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (domain) {
      where.domain = { contains: domain, mode: 'insensitive' };
    }
    if (protocol) {
      where.protocol = protocol;
    }
    if (path) {
      where.path = { contains: path, mode: 'insensitive' };
    }
    if (isAuthenticated !== undefined) {
      where.isAuthenticated = isAuthenticated === 'true';
    }
    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }
    if (device) {
      where.device = { contains: device, mode: 'insensitive' };
    }

    // Get total count
    const total = await prisma.websiteVisit.count({ where });

    // Get website visits
    const visits = await prisma.websiteVisit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { visitedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json({
      visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/website-visits/:id - Get detailed visit information
router.get('/website-visits/:id', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const visit = await prisma.websiteVisit.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(visit);
  } catch (error) {
    next(error);
  }
});

// ==================== User Session & Activity Tracking ====================

// GET /api/super-admin/sessions/stats - Get session statistics
router.get('/sessions/stats', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const [
      totalSessions,
      activeSessions,
      avgSessionDuration,
      totalActivities,
    ] = await Promise.all([
      prisma.userSession.count(),
      prisma.userSession.count({ where: { isActive: true } }),
      prisma.userSession.aggregate({
        _avg: { totalDuration: true },
        where: { totalDuration: { gt: 0 } },
      }).then(r => r._avg.totalDuration || 0),
      prisma.userActivity.count(),
    ]);

    const topUsers = await prisma.userSession.groupBy({
      by: ['userId'],
      _count: { id: true },
      _sum: { totalDuration: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const usersWithDetails = await prisma.user.findMany({
      where: { id: { in: topUsers.map(u => u.userId) } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const topUsersWithNames = topUsers.map(u => {
      const user = usersWithDetails.find(ud => ud.id === u.userId);
      return {
        userId: u.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        userEmail: user?.email,
        sessionCount: u._count.id,
        totalDuration: u._sum.totalDuration || 0,
      };
    });

    res.json({
      totalSessions,
      activeSessions,
      avgSessionDuration: Math.round(avgSessionDuration),
      totalActivities,
      topUsers: topUsersWithNames,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/users/:userId/sessions - Get user sessions
router.get('/users/:userId/sessions', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: 50,
    });
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/users/:userId/activities - Get user activities
router.get('/users/:userId/activities', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { performedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userActivity.count({ where: { userId } }),
    ]);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════
// 🛡️ SECURITY MONITORING ENDPOINTS
// Real-time cybersecurity metrics and threat management
// ═══════════════════════════════════════════════════════════

import {
  getSecurityStats,
  blockIP,
  unblockIP,
} from '../middleware/advancedSecurity';

/**
 * GET /api/super-admin/security/stats
 * Get real-time security statistics
 */
router.get('/security/stats', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const stats = getSecurityStats();

    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      serverUptime: Math.floor(process.uptime()),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/super-admin/security/block-ip
 * Manually block an IP address
 */
router.post('/security/block-ip', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    blockIP(ip);

    res.json({
      message: `IP ${ip} has been blocked`,
      ip,
      blockedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/super-admin/security/unblock-ip
 * Manually unblock an IP address
 */
router.post('/security/unblock-ip', authenticate, requireSuperAdmin, async (req, res, next) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    unblockIP(ip);

    res.json({
      message: `IP ${ip} has been unblocked`,
      ip,
      unblockedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/security-threats - Detect and return potential security threats
router.get('/security-threats', async (req, res, next) => {
  try {
    const hoursAgo = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Suspicious path patterns that indicate scanner/attack attempts
    const suspiciousPaths = [
      '.git/',
      'config.json',
      '.config',
      'debug/',
      '_ignition',
      '.circleci',
      'configuration.php',
      'app_dev.php',
      '_profiler',
      'phpinfo',
      '.env',
      'wp-admin',
      'wp-login',
      'admin/',
      'phpmyadmin',
      'mysql',
      'shell',
      '.ssh',
      'backup',
      'dump.sql',
      'database',
      '/api/v1/auth',
      'swagger',
      'graphql',
      '/../',
      '/etc/passwd'
    ];

    // Find visits with suspicious paths
    const threats = await prisma.websiteVisit.findMany({
      where: {
        visitedAt: { gte: since },
        isAuthenticated: false,
        OR: suspiciousPaths.map(path => ({
          fullUrl: { contains: path }
        }))
      },
      orderBy: { visitedAt: 'desc' },
      take: 100
    });

    // Group threats by IP address
    const threatsByIp = threats.reduce((acc: any, visit) => {
      const ip = visit.ipAddress || 'unknown';
      if (!acc[ip]) {
        acc[ip] = {
          ipAddress: ip,
          attempts: [],
          firstSeen: visit.visitedAt,
          lastSeen: visit.visitedAt,
          totalAttempts: 0,
          userAgent: visit.userAgent,
          browser: visit.browser,
          os: visit.os,
          device: visit.device,
          country: visit.country,
          threatLevel: 'unknown'
        };
      }

      acc[ip].attempts.push({
        url: visit.fullUrl,
        path: visit.path,
        time: visit.visitedAt
      });
      acc[ip].totalAttempts++;
      acc[ip].lastSeen = visit.visitedAt > acc[ip].lastSeen ? visit.visitedAt : acc[ip].lastSeen;
      acc[ip].firstSeen = visit.visitedAt < acc[ip].firstSeen ? visit.visitedAt : acc[ip].firstSeen;

      return acc;
    }, {});

    // Calculate threat levels
    Object.values(threatsByIp).forEach((threat: any) => {
      const timeSpan = new Date(threat.lastSeen).getTime() - new Date(threat.firstSeen).getTime();
      const attemptsPerMinute = threat.totalAttempts / (timeSpan / 60000 || 1);

      if (attemptsPerMinute > 5 || threat.totalAttempts > 20) {
        threat.threatLevel = 'critical';
      } else if (attemptsPerMinute > 2 || threat.totalAttempts > 10) {
        threat.threatLevel = 'high';
      } else if (threat.totalAttempts > 5) {
        threat.threatLevel = 'medium';
      } else {
        threat.threatLevel = 'low';
      }

      // Identify threat types
      threat.threatTypes = [];
      threat.attempts.forEach((attempt: any) => {
        const url = attempt.url.toLowerCase();
        if (url.includes('.git') || url.includes('.env')) threat.threatTypes.push('Source Code Exposure');
        if (url.includes('config') || url.includes('phpmyadmin')) threat.threatTypes.push('Configuration Access');
        if (url.includes('debug') || url.includes('profiler')) threat.threatTypes.push('Debug Info Leak');
        if (url.includes('admin') || url.includes('wp-login')) threat.threatTypes.push('Admin Panel Brute Force');
        if (url.includes('..') || url.includes('passwd')) threat.threatTypes.push('Path Traversal');
        if (url.includes('sql') || url.includes('dump')) threat.threatTypes.push('Database Access');
      });
      threat.threatTypes = [...new Set(threat.threatTypes)];
    });

    const threatList = Object.values(threatsByIp).sort((a: any, b: any) => {
      const threatLevelOrder: any = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
      return threatLevelOrder[b.threatLevel] - threatLevelOrder[a.threatLevel];
    });

    res.json({
      threats: threatList,
      summary: {
        totalThreats: threatList.length,
        critical: threatList.filter((t: any) => t.threatLevel === 'critical').length,
        high: threatList.filter((t: any) => t.threatLevel === 'high').length,
        medium: threatList.filter((t: any) => t.threatLevel === 'medium').length,
        low: threatList.filter((t: any) => t.threatLevel === 'low').length,
        timeRange: hoursAgo
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/jobs - Get background jobs list
router.get('/jobs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // For now, return empty data as there's no background jobs system implemented yet
    // This prevents the 404 error on the frontend
    res.json({
      jobs: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/jobs/stats - Get background jobs statistics
router.get('/jobs/stats', async (req, res, next) => {
  try {
    // For now, return empty stats as there's no background jobs system implemented yet
    // This prevents the 404 error on the frontend
    res.json({
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      recentJobs: []
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/super-admin/security-threats/block-ip - Manually block an IP address
router.post('/security-threats/block-ip', async (req, res, next) => {
  try {
    const { ipAddress, reason, threatLevel, attackType, attempts, country } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Import the blockIP function
    const { blockIP } = await import('../middleware/advancedSecurity');

    // Block the IP with full metadata
    const user = (req as any).user;
    await blockIP(ipAddress, {
      reason: reason || 'Manually blocked by super admin',
      blockedBy: user.email,
      threatLevel,
      attackType,
      attempts,
      country
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} has been permanently blocked`,
      ipAddress,
      blockedAt: new Date().toISOString(),
      blockedBy: user.email
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/super-admin/security-threats/unblock-ip - Manually unblock an IP address
router.post('/security-threats/unblock-ip', async (req, res, next) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Import the unblockIP function
    const { unblockIP } = await import('../middleware/advancedSecurity');

    // Unblock the IP
    unblockIP(ipAddress);

    // Log the action to console
    const user = (req as any).user;
    console.log(`✅ IP MANUALLY UNBLOCKED: ${ipAddress}`, {
      unblockedBy: user.email,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} has been unblocked successfully`,
      ipAddress,
      unblockedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/security-threats/blocked-ips - Get list of currently blocked IPs
router.get('/security-threats/blocked-ips', async (req, res, next) => {
  try {
    // Get blocked IPs from database
    const blockedIPs = await prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { blockedAt: 'desc' }
    });

    // Also get in-memory stats
    const { getSecurityStats } = await import('../middleware/advancedSecurity');
    const stats = getSecurityStats();

    res.json({
      blockedIPs: blockedIPs.map(ip => ({
        id: ip.id,
        ipAddress: ip.ipAddress,
        reason: ip.reason,
        blockedBy: ip.blockedBy,
        blockedAt: ip.blockedAt,
        threatLevel: ip.threatLevel,
        attackType: ip.attackType,
        attempts: ip.attempts,
        country: ip.country
      })),
      inMemoryBlocked: stats.blacklistedIPs,
      suspiciousIPs: stats.suspiciousIPs,
      totalBlocked: blockedIPs.length,
      totalSuspicious: stats.suspiciousIPs.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/api-routes - Get comprehensive list of all API routes
router.get('/api-routes', async (req, res, next) => {
  try {
    // Comprehensive catalog of all API routes in the system
    const apiRoutes = [
      // Authentication & Users
      { method: 'POST', path: '/api/auth/register', category: 'Authentication', description: 'Register new user account', public: true },
      { method: 'POST', path: '/api/auth/login', category: 'Authentication', description: 'User login with email/password', public: true },
      { method: 'POST', path: '/api/auth/logout', category: 'Authentication', description: 'User logout', public: false },
      { method: 'POST', path: '/api/auth/forgot-password', category: 'Authentication', description: 'Request password reset', public: true },
      { method: 'POST', path: '/api/auth/reset-password', category: 'Authentication', description: 'Reset password with token', public: true },
      { method: 'GET', path: '/api/auth/google', category: 'Authentication', description: 'Google OAuth login', public: true },
      { method: 'GET', path: '/api/auth/google/callback', category: 'Authentication', description: 'Google OAuth callback', public: true },
      { method: 'GET', path: '/api/users/me', category: 'Users', description: 'Get current user profile', public: false },
      { method: 'PUT', path: '/api/users/me', category: 'Users', description: 'Update current user profile', public: false },
      { method: 'GET', path: '/api/users', category: 'Users', description: 'List all users (admin)', public: false },
      { method: 'GET', path: '/api/users/:id', category: 'Users', description: 'Get user by ID', public: false },
      { method: 'PUT', path: '/api/users/:id', category: 'Users', description: 'Update user by ID (admin)', public: false },
      { method: 'DELETE', path: '/api/users/:id', category: 'Users', description: 'Delete user by ID (admin)', public: false },

      // Contacts
      { method: 'GET', path: '/api/contacts', category: 'Contacts', description: 'List all contacts with pagination', public: false },
      { method: 'POST', path: '/api/contacts', category: 'Contacts', description: 'Create new contact', public: false },
      { method: 'GET', path: '/api/contacts/:id', category: 'Contacts', description: 'Get contact by ID', public: false },
      { method: 'PUT', path: '/api/contacts/:id', category: 'Contacts', description: 'Update contact', public: false },
      { method: 'DELETE', path: '/api/contacts/:id', category: 'Contacts', description: 'Delete contact', public: false },
      { method: 'POST', path: '/api/contacts/bulk-import', category: 'Contacts', description: 'Bulk import contacts', public: false },

      // Companies
      { method: 'GET', path: '/api/companies', category: 'Companies', description: 'List all companies', public: false },
      { method: 'POST', path: '/api/companies', category: 'Companies', description: 'Create new company', public: false },
      { method: 'GET', path: '/api/companies/:id', category: 'Companies', description: 'Get company by ID', public: false },
      { method: 'PUT', path: '/api/companies/:id', category: 'Companies', description: 'Update company', public: false },
      { method: 'DELETE', path: '/api/companies/:id', category: 'Companies', description: 'Delete company', public: false },
      { method: 'GET', path: '/api/companies/:id/contacts', category: 'Companies', description: 'Get company contacts', public: false },

      // Deals
      { method: 'GET', path: '/api/deals', category: 'Deals', description: 'List all deals', public: false },
      { method: 'POST', path: '/api/deals', category: 'Deals', description: 'Create new deal', public: false },
      { method: 'GET', path: '/api/deals/:id', category: 'Deals', description: 'Get deal by ID', public: false },
      { method: 'PUT', path: '/api/deals/:id', category: 'Deals', description: 'Update deal', public: false },
      { method: 'DELETE', path: '/api/deals/:id', category: 'Deals', description: 'Delete deal', public: false },

      // Activities
      { method: 'GET', path: '/api/activities', category: 'Activities', description: 'List all activities', public: false },
      { method: 'POST', path: '/api/activities', category: 'Activities', description: 'Create new activity', public: false },
      { method: 'GET', path: '/api/activities/:id', category: 'Activities', description: 'Get activity by ID', public: false },
      { method: 'PUT', path: '/api/activities/:id', category: 'Activities', description: 'Update activity', public: false },
      { method: 'DELETE', path: '/api/activities/:id', category: 'Activities', description: 'Delete activity', public: false },

      // Email Campaigns
      { method: 'GET', path: '/api/campaigns', category: 'Email Campaigns', description: 'List all email campaigns', public: false },
      { method: 'POST', path: '/api/campaigns', category: 'Email Campaigns', description: 'Create new campaign', public: false },
      { method: 'GET', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Get campaign by ID', public: false },
      { method: 'PUT', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Update campaign', public: false },
      { method: 'DELETE', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Delete campaign', public: false },
      { method: 'POST', path: '/api/campaigns/:id/send', category: 'Email Campaigns', description: 'Send campaign', public: false },

      // Email Templates
      { method: 'GET', path: '/api/email-templates', category: 'Email Templates', description: 'List all email templates', public: false },
      { method: 'POST', path: '/api/email-templates', category: 'Email Templates', description: 'Create new template', public: false },
      { method: 'GET', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Get template by ID', public: false },
      { method: 'PUT', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Update template', public: false },
      { method: 'DELETE', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Delete template', public: false },

      // System Templates
      { method: 'GET', path: '/api/system-templates', category: 'System Templates', description: 'List system templates', public: false },
      { method: 'GET', path: '/api/system-templates/:id', category: 'System Templates', description: 'Get system template by ID', public: false },

      // Email Composer
      { method: 'POST', path: '/api/email-composer/send', category: 'Email', description: 'Send individual email', public: false },
      { method: 'POST', path: '/api/email-composer/preview', category: 'Email', description: 'Preview email', public: false },

      // Email Servers
      { method: 'GET', path: '/api/email-servers', category: 'Email Configuration', description: 'List email servers', public: false },
      { method: 'POST', path: '/api/email-servers', category: 'Email Configuration', description: 'Add email server', public: false },
      { method: 'PUT', path: '/api/email-servers/:id', category: 'Email Configuration', description: 'Update email server', public: false },
      { method: 'DELETE', path: '/api/email-servers/:id', category: 'Email Configuration', description: 'Delete email server', public: false },
      { method: 'POST', path: '/api/email-servers/:id/test', category: 'Email Configuration', description: 'Test email server', public: false },

      // Email Tracking
      { method: 'GET', path: '/api/tracking/open/:trackingId', category: 'Email Tracking', description: 'Track email open', public: true },
      { method: 'GET', path: '/api/tracking/click/:trackingId', category: 'Email Tracking', description: 'Track email click', public: true },
      { method: 'GET', path: '/api/tracking/stats/:campaignId', category: 'Email Tracking', description: 'Get campaign tracking stats', public: false },

      // Video Campaigns
      { method: 'GET', path: '/api/video-campaigns', category: 'Video Campaigns', description: 'List video campaigns', public: false },
      { method: 'POST', path: '/api/video-campaigns', category: 'Video Campaigns', description: 'Create video campaign', public: false },
      { method: 'GET', path: '/api/video-campaigns/:id', category: 'Video Campaigns', description: 'Get video campaign', public: false },
      { method: 'POST', path: '/api/video-campaigns/:id/generate', category: 'Video Campaigns', description: 'Generate campaign videos', public: false },

      // AI Services
      { method: 'POST', path: '/api/ai/generate-text', category: 'AI Services', description: 'Generate AI text', public: false },
      { method: 'POST', path: '/api/ai/analyze-sentiment', category: 'AI Services', description: 'Analyze sentiment', public: false },
      { method: 'POST', path: '/api/ai-chat/message', category: 'AI Services', description: 'Send chat message to AI', public: false },
      { method: 'GET', path: '/api/ai-chat/history', category: 'AI Services', description: 'Get chat history', public: false },

      // Enrichment
      { method: 'POST', path: '/api/enrichment/contact/:id', category: 'Data Enrichment', description: 'Enrich contact data', public: false },
      { method: 'POST', path: '/api/enrichment/company/:id', category: 'Data Enrichment', description: 'Enrich company data', public: false },

      // Dashboard & Analytics
      { method: 'GET', path: '/api/dashboard/stats', category: 'Dashboard', description: 'Get dashboard statistics', public: false },
      { method: 'GET', path: '/api/analytics/sales', category: 'Analytics', description: 'Get sales analytics', public: false },
      { method: 'GET', path: '/api/analytics/pipeline', category: 'Analytics', description: 'Get pipeline analytics', public: false },

      // Tags
      { method: 'GET', path: '/api/tags', category: 'Tags', description: 'List all tags', public: false },
      { method: 'POST', path: '/api/tags', category: 'Tags', description: 'Create new tag', public: false },
      { method: 'DELETE', path: '/api/tags/:id', category: 'Tags', description: 'Delete tag', public: false },

      // Team
      { method: 'GET', path: '/api/team/members', category: 'Team', description: 'List team members', public: false },
      { method: 'POST', path: '/api/team/invite', category: 'Team', description: 'Invite team member', public: false },
      { method: 'DELETE', path: '/api/team/:id', category: 'Team', description: 'Remove team member', public: false },

      // Subscriptions & Pricing
      { method: 'GET', path: '/api/pricing/plans', category: 'Pricing', description: 'Get pricing plans', public: true },
      { method: 'GET', path: '/api/subscriptions/current', category: 'Subscriptions', description: 'Get current subscription', public: false },
      { method: 'POST', path: '/api/subscriptions/upgrade', category: 'Subscriptions', description: 'Upgrade subscription', public: false },

      // GoDaddy Integration
      { method: 'GET', path: '/api/godaddy/domains', category: 'GoDaddy', description: 'List GoDaddy domains', public: false },
      { method: 'POST', path: '/api/godaddy/dns', category: 'GoDaddy', description: 'Update DNS records', public: false },

      // Super Admin
      { method: 'GET', path: '/api/super-admin/users', category: 'Super Admin', description: 'Manage all users', public: false },
      { method: 'GET', path: '/api/super-admin/dashboard/stats', category: 'Super Admin', description: 'Get admin dashboard stats', public: false },
      { method: 'GET', path: '/api/super-admin/tech-stack', category: 'Super Admin', description: 'Get tech stack info', public: false },
      { method: 'GET', path: '/api/super-admin/database/tables', category: 'Super Admin', description: 'List database tables', public: false },
      { method: 'GET', path: '/api/super-admin/api-routes', category: 'Super Admin', description: 'List all API routes', public: false },
      { method: 'GET', path: '/api/super-admin/security-threats', category: 'Super Admin', description: 'Get security threats', public: false },
      { method: 'POST', path: '/api/super-admin/security-threats/block-ip', category: 'Super Admin', description: 'Block IP address', public: false },
      { method: 'GET', path: '/api/super-admin/activity-logs', category: 'Super Admin', description: 'Get activity logs', public: false },
      { method: 'GET', path: '/api/super-admin/jobs', category: 'Super Admin', description: 'Get background jobs', public: false },

      // UI Configuration
      { method: 'GET', path: '/api/ui-config/active', category: 'UI Configuration', description: 'Get active UI config', public: true },
      { method: 'GET', path: '/api/ui-config-manager/themes', category: 'UI Configuration', description: 'List themes', public: false },
      { method: 'POST', path: '/api/ui-config-manager/themes', category: 'UI Configuration', description: 'Create theme', public: false },
      { method: 'PUT', path: '/api/ui-config-manager/themes/:id/activate', category: 'UI Configuration', description: 'Activate theme', public: false },

      // Health & Tracking
      { method: 'GET', path: '/api/health', category: 'System', description: 'Health check endpoint', public: true },
      { method: 'POST', path: '/api/track/visit', category: 'Tracking', description: 'Track website visit', public: true },

      // Unsubscribe
      { method: 'GET', path: '/api/unsubscribe/:token', category: 'Unsubscribe', description: 'Unsubscribe from emails', public: true },
      { method: 'POST', path: '/api/unsubscribe/:token', category: 'Unsubscribe', description: 'Process unsubscribe', public: true },

      // Verification
      { method: 'GET', path: '/api/verification/email/:token', category: 'Verification', description: 'Verify email address', public: true },
    ];

    // Group routes by category
    const grouped: Record<string, any[]> = {};
    const categories = new Set<string>();

    apiRoutes.forEach(route => {
      if (!grouped[route.category]) {
        grouped[route.category] = [];
      }
      grouped[route.category].push(route);
      categories.add(route.category);
    });

    res.json({
      routes: apiRoutes,
      grouped: grouped,
      total: apiRoutes.length,
      categories: Array.from(categories).length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
