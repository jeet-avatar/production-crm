"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const app_1 = require("../app");
const router = (0, express_1.Router)();
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
if (!SUPER_ADMIN_EMAIL) {
    console.error('❌ SECURITY ERROR: SUPER_ADMIN_EMAIL environment variable is not set');
    console.error('   Please set SUPER_ADMIN_EMAIL in your .env file');
    throw new Error('SUPER_ADMIN_EMAIL environment variable is required for super admin functionality');
}
const requireSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                role: true,
            },
        });
        if (!user) {
            return res.status(403).json({ error: 'Access denied - User not found' });
        }
        if (user.role !== 'SUPER_ADMIN') {
            console.warn(`⚠️ Unauthorized super admin access attempt by ${user.email} (role: ${user.role})`);
            return res.status(403).json({ error: 'Access denied - Super admin role required' });
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
router.use(auth_1.authenticate);
router.use(requireSuperAdmin);
router.get('/dashboard/stats', async (req, res, next) => {
    try {
        const [totalUsers, activeUsers, totalContacts, totalCompanies, totalDeals, totalCampaigns, totalActivities, totalTags, emailsSent24h, emailDeliveryStats,] = await Promise.all([
            app_1.prisma.user.count(),
            app_1.prisma.user.count({ where: { lastLoginAt: { not: null } } }),
            app_1.prisma.contact.count(),
            app_1.prisma.company.count(),
            app_1.prisma.deal.count(),
            app_1.prisma.campaign.count(),
            app_1.prisma.activity.count(),
            app_1.prisma.tag.count(),
            app_1.prisma.emailLog.count({
                where: {
                    sentAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
            app_1.prisma.emailLog.groupBy({
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
        const totalThemes = 1;
        const activeTheme = { name: 'Default' };
        const totalCredentials = 0;
        const recentActivityLogs = await app_1.prisma.activity.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });
        const totalActivityActions = await app_1.prisma.activity.count();
        const recentSignups = await app_1.prisma.user.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });
        const stats = {
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
            techComponents: 24,
            healthyComponents: 24,
            totalTables: 10,
            databaseSize: '< 100 MB',
            systemStatus: 'healthy',
            uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
            totalThemes,
            activeTheme: activeTheme?.name || 'Default',
            totalCredentials,
            credentialsSubtext: `${totalCredentials} stored`,
            recentActivityLogs,
            recentActivityLogsSubtext: 'Last 7 days',
            totalActivityActions,
            totalActivityActionsSubtext: 'All time',
            emailsSent24h,
            emailsSent24hSubtext: 'Last 24 hours',
            emailDeliveryRate,
            failedEmails: failedEmails + bouncedEmails,
            jobsProcessed24h: 0,
            jobsProcessed24hSubtext: 'Last 24 hours',
            jobSuccessRate: 100,
            pendingJobs: 0,
            failedJobs: 0,
        };
        res.json(stats);
    }
    catch (error) {
        next(error);
    }
});
router.get('/users', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            app_1.prisma.user.findMany({
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
            app_1.prisma.user.count(),
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
    }
    catch (error) {
        next(error);
    }
});
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/themes', async (req, res, next) => {
    try {
        const themes = await app_1.prisma.uITheme.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json({ themes });
    }
    catch (error) {
        next(error);
    }
});
router.post('/themes', async (req, res, next) => {
    try {
        const { name, primaryColor, secondaryColor, accentColor } = req.body;
        if (!name || !primaryColor || !secondaryColor || !accentColor) {
            return res.status(400).json({ error: 'Missing required fields: name, primaryColor, secondaryColor, accentColor' });
        }
        const theme = await app_1.prisma.uITheme.create({
            data: {
                name,
                primaryColor,
                secondaryColor,
                accentColor,
                isActive: false,
            },
        });
        res.status(201).json({ theme });
    }
    catch (error) {
        next(error);
    }
});
router.put('/themes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, primaryColor, secondaryColor, accentColor } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (primaryColor !== undefined)
            updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined)
            updateData.secondaryColor = secondaryColor;
        if (accentColor !== undefined)
            updateData.accentColor = accentColor;
        const theme = await app_1.prisma.uITheme.update({
            where: { id },
            data: updateData,
        });
        res.json({ theme });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Theme not found' });
        }
        next(error);
    }
});
router.delete('/themes/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const theme = await app_1.prisma.uITheme.findUnique({
            where: { id },
            select: { isActive: true },
        });
        if (theme?.isActive) {
            return res.status(400).json({ error: 'Cannot delete active theme. Please activate another theme first.' });
        }
        await app_1.prisma.uITheme.delete({
            where: { id },
        });
        res.json({ message: 'Theme deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Theme not found' });
        }
        next(error);
    }
});
router.put('/themes/:id/activate', async (req, res, next) => {
    try {
        const { id } = req.params;
        await app_1.prisma.uITheme.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const theme = await app_1.prisma.uITheme.update({
            where: { id },
            data: { isActive: true },
        });
        res.json({ theme, message: 'Theme activated successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Theme not found' });
        }
        next(error);
    }
});
router.get('/branding', async (req, res, next) => {
    try {
        const activeBranding = await app_1.prisma.brandingConfig.findFirst({
            where: { isActive: true },
        });
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/branding', async (req, res, next) => {
    try {
        const { companyName, logoUrl, primaryColor, secondaryColor, tagline } = req.body;
        if (!companyName || !primaryColor || !secondaryColor) {
            return res.status(400).json({ error: 'Missing required fields: companyName, primaryColor, secondaryColor' });
        }
        await app_1.prisma.brandingConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const branding = await app_1.prisma.brandingConfig.create({
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
    }
    catch (error) {
        next(error);
    }
});
router.put('/branding/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { companyName, logoUrl, primaryColor, secondaryColor, tagline } = req.body;
        const updateData = {};
        if (companyName !== undefined)
            updateData.companyName = companyName;
        if (logoUrl !== undefined)
            updateData.logoUrl = logoUrl;
        if (primaryColor !== undefined)
            updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined)
            updateData.secondaryColor = secondaryColor;
        if (tagline !== undefined)
            updateData.tagline = tagline;
        const branding = await app_1.prisma.brandingConfig.update({
            where: { id },
            data: updateData,
        });
        res.json(branding);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Branding configuration not found' });
        }
        next(error);
    }
});
router.put('/branding/:id/activate', async (req, res, next) => {
    try {
        const { id } = req.params;
        await app_1.prisma.brandingConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const branding = await app_1.prisma.brandingConfig.update({
            where: { id },
            data: { isActive: true },
        });
        res.json({ branding, message: 'Branding activated successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Branding configuration not found' });
        }
        next(error);
    }
});
router.get('/database/tables', async (req, res, next) => {
    try {
        const [users, contacts, companies, deals, activities, campaigns, emailLogs, tags, emailTemplates, systemTemplates,] = await Promise.all([
            app_1.prisma.user.count().catch(() => 0),
            app_1.prisma.contact.count().catch(() => 0),
            app_1.prisma.company.count().catch(() => 0),
            app_1.prisma.deal.count().catch(() => 0),
            app_1.prisma.activity.count().catch(() => 0),
            app_1.prisma.campaign.count().catch(() => 0),
            app_1.prisma.emailLog.count().catch(() => 0),
            app_1.prisma.tag.count().catch(() => 0),
            app_1.prisma.emailTemplate.count().catch(() => 0),
            app_1.prisma.systemEmailTemplate.count().catch(() => 0),
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
    }
    catch (error) {
        console.error('Error fetching database tables:', error);
        next(error);
    }
});
router.get('/database/tables/:tableName/schema', async (req, res, next) => {
    try {
        const { tableName } = req.params;
        const modelMap = {
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
        const model = app_1.prisma[modelName];
        const sampleRecord = await model.findFirst();
        if (!sampleRecord) {
            return res.json([]);
        }
        const schema = Object.keys(sampleRecord).map((key) => {
            const value = sampleRecord[key];
            let type = typeof value;
            if (value === null) {
                type = 'null';
            }
            else if (value instanceof Date) {
                type = 'date';
            }
            else if (Array.isArray(value)) {
                type = 'array';
            }
            else if (typeof value === 'object') {
                type = 'json';
            }
            return {
                name: key,
                type,
                nullable: value === null,
            };
        });
        res.json(schema);
    }
    catch (error) {
        console.error('Error fetching table schema:', error);
        next(error);
    }
});
router.get('/database/tables/:tableName/data', async (req, res, next) => {
    try {
        const { tableName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const modelMap = {
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
        const model = app_1.prisma[modelName];
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
    }
    catch (error) {
        console.error('Error fetching table data:', error);
        next(error);
    }
});
router.put('/database/tables/:tableName/rows/:id', async (req, res, next) => {
    try {
        const { tableName, id } = req.params;
        const updateData = req.body;
        const modelMap = {
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
        const protectedTables = ['system_email_templates'];
        if (protectedTables.includes(tableName)) {
            return res.status(403).json({ error: 'Cannot edit protected system tables' });
        }
        const modelName = modelMap[tableName];
        if (!modelName) {
            return res.status(404).json({ error: 'Table not found' });
        }
        if (tableName === 'users') {
            const existingUser = await app_1.prisma.user.findUnique({
                where: { id },
                select: { role: true },
            });
            if (existingUser?.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Cannot edit super admin accounts through database browser' });
            }
        }
        const model = app_1.prisma[modelName];
        const { id: _, createdAt, updatedAt, ...safeUpdateData } = updateData;
        const updated = await model.update({
            where: { id },
            data: safeUpdateData,
        });
        res.json({ message: 'Record updated successfully', data: updated });
    }
    catch (error) {
        console.error('Error updating table row:', error);
        res.status(500).json({ error: 'Failed to update record', details: error.message });
    }
});
router.delete('/database/tables/:tableName/rows/:id', async (req, res, next) => {
    try {
        const { tableName, id } = req.params;
        const modelMap = {
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
        const protectedTables = ['system_email_templates'];
        if (protectedTables.includes(tableName)) {
            return res.status(403).json({ error: 'Cannot delete from protected system tables' });
        }
        const modelName = modelMap[tableName];
        if (!modelName) {
            return res.status(404).json({ error: 'Table not found' });
        }
        if (tableName === 'users') {
            const existingUser = await app_1.prisma.user.findUnique({
                where: { id },
                select: { role: true },
            });
            if (existingUser?.role === 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Cannot delete super admin accounts through database browser' });
            }
        }
        const model = app_1.prisma[modelName];
        await model.delete({
            where: { id },
        });
        res.json({ message: 'Record deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting table row:', error);
        res.status(500).json({ error: 'Failed to delete record', details: error.message });
    }
});
router.get('/activity-logs', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [logs, total] = await Promise.all([
            app_1.prisma.activity.findMany({
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
            app_1.prisma.activity.count({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/activity-logs/stats', async (req, res, next) => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalLogs, logsLast24Hours, logsLast7Days, logsLast30Days, logsByType] = await Promise.all([
            app_1.prisma.activity.count(),
            app_1.prisma.activity.count({
                where: { createdAt: { gte: oneDayAgo } },
            }),
            app_1.prisma.activity.count({
                where: { createdAt: { gte: sevenDaysAgo } },
            }),
            app_1.prisma.activity.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
            app_1.prisma.activity.groupBy({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/email-logs', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const recipient = req.query.recipient || req.query.recipientEmail;
        const skip = (page - 1) * limit;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (recipient) {
            where.toEmail = { contains: recipient, mode: 'insensitive' };
        }
        const total = await app_1.prisma.emailLog.count({ where });
        const emailLogs = await app_1.prisma.emailLog.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/email-logs/stats', async (req, res, next) => {
    try {
        const [totalEmails, deliveredEmails, openedEmails, bouncedEmails, failedEmails] = await Promise.all([
            app_1.prisma.emailLog.count(),
            app_1.prisma.emailLog.count({ where: { status: 'DELIVERED' } }),
            app_1.prisma.emailLog.count({ where: { status: 'OPENED' } }),
            app_1.prisma.emailLog.count({ where: { status: 'BOUNCED' } }),
            app_1.prisma.emailLog.count({ where: { status: 'FAILED' } }),
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
    }
    catch (error) {
        next(error);
    }
});
router.delete('/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await app_1.prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (user?.role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Cannot delete super admin account' });
        }
        await app_1.prisma.user.delete({
            where: { id },
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/users/:id/role', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const validRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await app_1.prisma.user.findUnique({
            where: { id },
            select: { role: true },
        });
        if (user?.role === 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Cannot change super admin role' });
        }
        const updatedUser = await app_1.prisma.user.update({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/website-visits/stats', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const [totalVisits, uniqueVisitors, authenticatedVisits, anonymousVisits, totalPageViews, avgTimeOnPage,] = await Promise.all([
            app_1.prisma.websiteVisit.count(),
            app_1.prisma.websiteVisit.groupBy({
                by: ['ipAddress', 'userAgent'],
            }).then(groups => groups.length),
            app_1.prisma.websiteVisit.count({
                where: { isAuthenticated: true },
            }),
            app_1.prisma.websiteVisit.count({
                where: { isAuthenticated: false },
            }),
            app_1.prisma.websiteVisit.count({
                where: {
                    path: { not: '/' },
                },
            }),
            app_1.prisma.websiteVisit.aggregate({
                _avg: { timeOnPage: true },
                where: { timeOnPage: { not: null } },
            }).then(result => result._avg.timeOnPage || 0),
        ]);
        const topPages = await app_1.prisma.websiteVisit.groupBy({
            by: ['path'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });
        const domainBreakdown = await app_1.prisma.websiteVisit.groupBy({
            by: ['domain', 'protocol'],
            _count: { id: true },
        });
        const topCountriesRaw = await app_1.prisma.websiteVisit.groupBy({
            by: ['country'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
            where: { country: { not: null } },
        });
        const topCountries = topCountriesRaw.map(c => ({
            country: c.country,
            countryCode: null,
            visits: c._count.id,
        }));
        const deviceBreakdown = await app_1.prisma.websiteVisit.groupBy({
            by: ['device'],
            _count: { id: true },
            where: { device: { not: null } },
        });
        const browserBreakdown = await app_1.prisma.websiteVisit.groupBy({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/website-visits', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const domain = req.query.domain;
        const protocol = req.query.protocol;
        const path = req.query.path;
        const isAuthenticated = req.query.isAuthenticated;
        const country = req.query.country;
        const device = req.query.device;
        const skip = (page - 1) * limit;
        const where = {};
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
        const total = await app_1.prisma.websiteVisit.count({ where });
        const visits = await app_1.prisma.websiteVisit.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/website-visits/:id', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { id } = req.params;
        const visit = await app_1.prisma.websiteVisit.findUnique({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/sessions/stats', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const [totalSessions, activeSessions, avgSessionDuration, totalActivities,] = await Promise.all([
            app_1.prisma.userSession.count(),
            app_1.prisma.userSession.count({ where: { isActive: true } }),
            app_1.prisma.userSession.aggregate({
                _avg: { totalDuration: true },
                where: { totalDuration: { gt: 0 } },
            }).then(r => r._avg.totalDuration || 0),
            app_1.prisma.userActivity.count(),
        ]);
        const topUsers = await app_1.prisma.userSession.groupBy({
            by: ['userId'],
            _count: { id: true },
            _sum: { totalDuration: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });
        const usersWithDetails = await app_1.prisma.user.findMany({
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/users/:userId/sessions', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const sessions = await app_1.prisma.userSession.findMany({
            where: { userId },
            orderBy: { loginAt: 'desc' },
            take: 50,
        });
        res.json({ sessions });
    }
    catch (error) {
        next(error);
    }
});
router.get('/users/:userId/activities', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [activities, total] = await Promise.all([
            app_1.prisma.userActivity.findMany({
                where: { userId },
                orderBy: { performedAt: 'desc' },
                skip,
                take: limit,
            }),
            app_1.prisma.userActivity.count({ where: { userId } }),
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
    }
    catch (error) {
        next(error);
    }
});
const advancedSecurity_1 = require("../middleware/advancedSecurity");
router.get('/security/stats', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const stats = (0, advancedSecurity_1.getSecurityStats)();
        res.json({
            ...stats,
            timestamp: new Date().toISOString(),
            serverUptime: Math.floor(process.uptime()),
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/security/block-ip', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { ip } = req.body;
        if (!ip) {
            return res.status(400).json({ error: 'IP address is required' });
        }
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) {
            return res.status(400).json({ error: 'Invalid IP address format' });
        }
        (0, advancedSecurity_1.blockIP)(ip);
        res.json({
            message: `IP ${ip} has been blocked`,
            ip,
            blockedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/security/unblock-ip', auth_1.authenticate, requireSuperAdmin, async (req, res, next) => {
    try {
        const { ip } = req.body;
        if (!ip) {
            return res.status(400).json({ error: 'IP address is required' });
        }
        (0, advancedSecurity_1.unblockIP)(ip);
        res.json({
            message: `IP ${ip} has been unblocked`,
            ip,
            unblockedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/security-threats', async (req, res, next) => {
    try {
        const hoursAgo = parseInt(req.query.hours) || 24;
        const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
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
        const threats = await app_1.prisma.websiteVisit.findMany({
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
        const threatsByIp = threats.reduce((acc, visit) => {
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
        Object.values(threatsByIp).forEach((threat) => {
            const timeSpan = new Date(threat.lastSeen).getTime() - new Date(threat.firstSeen).getTime();
            const attemptsPerMinute = threat.totalAttempts / (timeSpan / 60000 || 1);
            if (attemptsPerMinute > 5 || threat.totalAttempts > 20) {
                threat.threatLevel = 'critical';
            }
            else if (attemptsPerMinute > 2 || threat.totalAttempts > 10) {
                threat.threatLevel = 'high';
            }
            else if (threat.totalAttempts > 5) {
                threat.threatLevel = 'medium';
            }
            else {
                threat.threatLevel = 'low';
            }
            threat.threatTypes = [];
            threat.attempts.forEach((attempt) => {
                const url = attempt.url.toLowerCase();
                if (url.includes('.git') || url.includes('.env'))
                    threat.threatTypes.push('Source Code Exposure');
                if (url.includes('config') || url.includes('phpmyadmin'))
                    threat.threatTypes.push('Configuration Access');
                if (url.includes('debug') || url.includes('profiler'))
                    threat.threatTypes.push('Debug Info Leak');
                if (url.includes('admin') || url.includes('wp-login'))
                    threat.threatTypes.push('Admin Panel Brute Force');
                if (url.includes('..') || url.includes('passwd'))
                    threat.threatTypes.push('Path Traversal');
                if (url.includes('sql') || url.includes('dump'))
                    threat.threatTypes.push('Database Access');
            });
            threat.threatTypes = [...new Set(threat.threatTypes)];
        });
        const threatList = Object.values(threatsByIp).sort((a, b) => {
            const threatLevelOrder = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
            return threatLevelOrder[b.threatLevel] - threatLevelOrder[a.threatLevel];
        });
        res.json({
            threats: threatList,
            summary: {
                totalThreats: threatList.length,
                critical: threatList.filter((t) => t.threatLevel === 'critical').length,
                high: threatList.filter((t) => t.threatLevel === 'high').length,
                medium: threatList.filter((t) => t.threatLevel === 'medium').length,
                low: threatList.filter((t) => t.threatLevel === 'low').length,
                timeRange: hoursAgo
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/jobs', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        res.json({
            jobs: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/jobs/stats', async (req, res, next) => {
    try {
        res.json({
            total: 0,
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            recentJobs: []
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/security-threats/block-ip', async (req, res, next) => {
    try {
        const { ipAddress, reason, threatLevel, attackType, attempts, country } = req.body;
        if (!ipAddress) {
            return res.status(400).json({ error: 'IP address is required' });
        }
        const { blockIP } = await Promise.resolve().then(() => __importStar(require('../middleware/advancedSecurity')));
        const user = req.user;
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/security-threats/unblock-ip', async (req, res, next) => {
    try {
        const { ipAddress } = req.body;
        if (!ipAddress) {
            return res.status(400).json({ error: 'IP address is required' });
        }
        const { unblockIP } = await Promise.resolve().then(() => __importStar(require('../middleware/advancedSecurity')));
        unblockIP(ipAddress);
        const user = req.user;
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/security-threats/blocked-ips', async (req, res, next) => {
    try {
        const blockedIPs = await app_1.prisma.blockedIP.findMany({
            where: { isActive: true },
            orderBy: { blockedAt: 'desc' }
        });
        const { getSecurityStats } = await Promise.resolve().then(() => __importStar(require('../middleware/advancedSecurity')));
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/api-routes', async (req, res, next) => {
    try {
        const apiRoutes = [
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
            { method: 'GET', path: '/api/contacts', category: 'Contacts', description: 'List all contacts with pagination', public: false },
            { method: 'POST', path: '/api/contacts', category: 'Contacts', description: 'Create new contact', public: false },
            { method: 'GET', path: '/api/contacts/:id', category: 'Contacts', description: 'Get contact by ID', public: false },
            { method: 'PUT', path: '/api/contacts/:id', category: 'Contacts', description: 'Update contact', public: false },
            { method: 'DELETE', path: '/api/contacts/:id', category: 'Contacts', description: 'Delete contact', public: false },
            { method: 'POST', path: '/api/contacts/bulk-import', category: 'Contacts', description: 'Bulk import contacts', public: false },
            { method: 'GET', path: '/api/companies', category: 'Companies', description: 'List all companies', public: false },
            { method: 'POST', path: '/api/companies', category: 'Companies', description: 'Create new company', public: false },
            { method: 'GET', path: '/api/companies/:id', category: 'Companies', description: 'Get company by ID', public: false },
            { method: 'PUT', path: '/api/companies/:id', category: 'Companies', description: 'Update company', public: false },
            { method: 'DELETE', path: '/api/companies/:id', category: 'Companies', description: 'Delete company', public: false },
            { method: 'GET', path: '/api/companies/:id/contacts', category: 'Companies', description: 'Get company contacts', public: false },
            { method: 'GET', path: '/api/deals', category: 'Deals', description: 'List all deals', public: false },
            { method: 'POST', path: '/api/deals', category: 'Deals', description: 'Create new deal', public: false },
            { method: 'GET', path: '/api/deals/:id', category: 'Deals', description: 'Get deal by ID', public: false },
            { method: 'PUT', path: '/api/deals/:id', category: 'Deals', description: 'Update deal', public: false },
            { method: 'DELETE', path: '/api/deals/:id', category: 'Deals', description: 'Delete deal', public: false },
            { method: 'GET', path: '/api/activities', category: 'Activities', description: 'List all activities', public: false },
            { method: 'POST', path: '/api/activities', category: 'Activities', description: 'Create new activity', public: false },
            { method: 'GET', path: '/api/activities/:id', category: 'Activities', description: 'Get activity by ID', public: false },
            { method: 'PUT', path: '/api/activities/:id', category: 'Activities', description: 'Update activity', public: false },
            { method: 'DELETE', path: '/api/activities/:id', category: 'Activities', description: 'Delete activity', public: false },
            { method: 'GET', path: '/api/campaigns', category: 'Email Campaigns', description: 'List all email campaigns', public: false },
            { method: 'POST', path: '/api/campaigns', category: 'Email Campaigns', description: 'Create new campaign', public: false },
            { method: 'GET', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Get campaign by ID', public: false },
            { method: 'PUT', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Update campaign', public: false },
            { method: 'DELETE', path: '/api/campaigns/:id', category: 'Email Campaigns', description: 'Delete campaign', public: false },
            { method: 'POST', path: '/api/campaigns/:id/send', category: 'Email Campaigns', description: 'Send campaign', public: false },
            { method: 'GET', path: '/api/email-templates', category: 'Email Templates', description: 'List all email templates', public: false },
            { method: 'POST', path: '/api/email-templates', category: 'Email Templates', description: 'Create new template', public: false },
            { method: 'GET', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Get template by ID', public: false },
            { method: 'PUT', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Update template', public: false },
            { method: 'DELETE', path: '/api/email-templates/:id', category: 'Email Templates', description: 'Delete template', public: false },
            { method: 'GET', path: '/api/system-templates', category: 'System Templates', description: 'List system templates', public: false },
            { method: 'GET', path: '/api/system-templates/:id', category: 'System Templates', description: 'Get system template by ID', public: false },
            { method: 'POST', path: '/api/email-composer/send', category: 'Email', description: 'Send individual email', public: false },
            { method: 'POST', path: '/api/email-composer/preview', category: 'Email', description: 'Preview email', public: false },
            { method: 'GET', path: '/api/email-servers', category: 'Email Configuration', description: 'List email servers', public: false },
            { method: 'POST', path: '/api/email-servers', category: 'Email Configuration', description: 'Add email server', public: false },
            { method: 'PUT', path: '/api/email-servers/:id', category: 'Email Configuration', description: 'Update email server', public: false },
            { method: 'DELETE', path: '/api/email-servers/:id', category: 'Email Configuration', description: 'Delete email server', public: false },
            { method: 'POST', path: '/api/email-servers/:id/test', category: 'Email Configuration', description: 'Test email server', public: false },
            { method: 'GET', path: '/api/tracking/open/:trackingId', category: 'Email Tracking', description: 'Track email open', public: true },
            { method: 'GET', path: '/api/tracking/click/:trackingId', category: 'Email Tracking', description: 'Track email click', public: true },
            { method: 'GET', path: '/api/tracking/stats/:campaignId', category: 'Email Tracking', description: 'Get campaign tracking stats', public: false },
            { method: 'GET', path: '/api/video-campaigns', category: 'Video Campaigns', description: 'List video campaigns', public: false },
            { method: 'POST', path: '/api/video-campaigns', category: 'Video Campaigns', description: 'Create video campaign', public: false },
            { method: 'GET', path: '/api/video-campaigns/:id', category: 'Video Campaigns', description: 'Get video campaign', public: false },
            { method: 'POST', path: '/api/video-campaigns/:id/generate', category: 'Video Campaigns', description: 'Generate campaign videos', public: false },
            { method: 'POST', path: '/api/ai/generate-text', category: 'AI Services', description: 'Generate AI text', public: false },
            { method: 'POST', path: '/api/ai/analyze-sentiment', category: 'AI Services', description: 'Analyze sentiment', public: false },
            { method: 'POST', path: '/api/ai-chat/message', category: 'AI Services', description: 'Send chat message to AI', public: false },
            { method: 'GET', path: '/api/ai-chat/history', category: 'AI Services', description: 'Get chat history', public: false },
            { method: 'POST', path: '/api/enrichment/contact/:id', category: 'Data Enrichment', description: 'Enrich contact data', public: false },
            { method: 'POST', path: '/api/enrichment/company/:id', category: 'Data Enrichment', description: 'Enrich company data', public: false },
            { method: 'GET', path: '/api/dashboard/stats', category: 'Dashboard', description: 'Get dashboard statistics', public: false },
            { method: 'GET', path: '/api/analytics/sales', category: 'Analytics', description: 'Get sales analytics', public: false },
            { method: 'GET', path: '/api/analytics/pipeline', category: 'Analytics', description: 'Get pipeline analytics', public: false },
            { method: 'GET', path: '/api/tags', category: 'Tags', description: 'List all tags', public: false },
            { method: 'POST', path: '/api/tags', category: 'Tags', description: 'Create new tag', public: false },
            { method: 'DELETE', path: '/api/tags/:id', category: 'Tags', description: 'Delete tag', public: false },
            { method: 'GET', path: '/api/team/members', category: 'Team', description: 'List team members', public: false },
            { method: 'POST', path: '/api/team/invite', category: 'Team', description: 'Invite team member', public: false },
            { method: 'DELETE', path: '/api/team/:id', category: 'Team', description: 'Remove team member', public: false },
            { method: 'GET', path: '/api/pricing/plans', category: 'Pricing', description: 'Get pricing plans', public: true },
            { method: 'GET', path: '/api/subscriptions/current', category: 'Subscriptions', description: 'Get current subscription', public: false },
            { method: 'POST', path: '/api/subscriptions/upgrade', category: 'Subscriptions', description: 'Upgrade subscription', public: false },
            { method: 'GET', path: '/api/godaddy/domains', category: 'GoDaddy', description: 'List GoDaddy domains', public: false },
            { method: 'POST', path: '/api/godaddy/dns', category: 'GoDaddy', description: 'Update DNS records', public: false },
            { method: 'GET', path: '/api/super-admin/users', category: 'Super Admin', description: 'Manage all users', public: false },
            { method: 'GET', path: '/api/super-admin/dashboard/stats', category: 'Super Admin', description: 'Get admin dashboard stats', public: false },
            { method: 'GET', path: '/api/super-admin/tech-stack', category: 'Super Admin', description: 'Get tech stack info', public: false },
            { method: 'GET', path: '/api/super-admin/database/tables', category: 'Super Admin', description: 'List database tables', public: false },
            { method: 'GET', path: '/api/super-admin/api-routes', category: 'Super Admin', description: 'List all API routes', public: false },
            { method: 'GET', path: '/api/super-admin/security-threats', category: 'Super Admin', description: 'Get security threats', public: false },
            { method: 'POST', path: '/api/super-admin/security-threats/block-ip', category: 'Super Admin', description: 'Block IP address', public: false },
            { method: 'GET', path: '/api/super-admin/activity-logs', category: 'Super Admin', description: 'Get activity logs', public: false },
            { method: 'GET', path: '/api/super-admin/jobs', category: 'Super Admin', description: 'Get background jobs', public: false },
            { method: 'GET', path: '/api/ui-config/active', category: 'UI Configuration', description: 'Get active UI config', public: true },
            { method: 'GET', path: '/api/ui-config-manager/themes', category: 'UI Configuration', description: 'List themes', public: false },
            { method: 'POST', path: '/api/ui-config-manager/themes', category: 'UI Configuration', description: 'Create theme', public: false },
            { method: 'PUT', path: '/api/ui-config-manager/themes/:id/activate', category: 'UI Configuration', description: 'Activate theme', public: false },
            { method: 'GET', path: '/api/health', category: 'System', description: 'Health check endpoint', public: true },
            { method: 'POST', path: '/api/track/visit', category: 'Tracking', description: 'Track website visit', public: true },
            { method: 'GET', path: '/api/unsubscribe/:token', category: 'Unsubscribe', description: 'Unsubscribe from emails', public: true },
            { method: 'POST', path: '/api/unsubscribe/:token', category: 'Unsubscribe', description: 'Process unsubscribe', public: true },
            { method: 'GET', path: '/api/verification/email/:token', category: 'Verification', description: 'Verify email address', public: true },
        ];
        const grouped = {};
        const categories = new Set();
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=superAdmin.js.map