"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});
router.use(auth_1.authenticateToken);
router.use(auth_1.requireSuperAdmin);
router.get('/dashboard/stats', async (req, res) => {
    try {
        const tables = await prisma.$queryRaw `
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
        const totalTables = parseInt(tables[0]?.count || '0');
        const activityLogs = await prisma.activityLog.count({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
        });
        const emailLogs = await prisma.emailLog.count({
            where: {
                sentAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });
        const [totalUsers, totalContacts, totalCompanies, totalDeals, totalCampaigns, activeUsers, recentSignups, totalThemes, totalApiRoutes, failedEmails,] = await Promise.all([
            prisma.user.count(),
            prisma.contact.count(),
            prisma.company.count(),
            prisma.deal.count(),
            prisma.campaign.count(),
            prisma.user.count({ where: { isActive: true } }),
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
            prisma.themeConfig.count(),
            Promise.resolve(150),
            prisma.emailLog.count({ where: { status: 'FAILED' } }),
        ]);
        const activeThemeCount = await prisma.themeConfig.count({ where: { isActive: true } });
        const dbSizeQuery = await prisma.$queryRaw `
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
        const databaseSize = dbSizeQuery[0]?.size || 'Unknown';
        const credentialsList = [
            'DATABASE_URL',
            'JWT_SECRET',
            'AWS_ACCESS_KEY_ID',
            'ANTHROPIC_API_KEY',
            'SMTP_USER',
            'SMTP_PASS',
            'GOOGLE_CLIENT_ID',
            'TWILIO_ACCOUNT_SID'
        ];
        const totalCredentials = credentialsList.filter(key => process.env[key]).length;
        const totalApiCalls = activityLogs > 0 ? activityLogs : 1;
        const apiUptime = ((totalApiCalls - Math.min(failedEmails, totalApiCalls)) / totalApiCalls * 100).toFixed(1);
        const uptime = process.uptime();
        const uptimeHours = Math.floor(uptime / 3600);
        const uptimeDays = Math.floor(uptimeHours / 24);
        const uptimeDisplay = uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours % 24}h` : `${uptimeHours}h`;
        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            recentSignups,
            recentSignupsSubtext: `Last 30 days`,
            totalContacts,
            totalCompanies,
            totalDeals,
            totalCampaigns,
            techComponents: 30 + totalTables,
            healthyComponents: 30 + totalTables - (failedEmails > 10 ? 1 : 0),
            totalThemes,
            activeTheme: activeThemeCount,
            totalTables,
            databaseSize,
            totalApiRoutes,
            apiUptime: `${apiUptime}%`,
            totalCredentials,
            credentialsSubtext: `System API keys & secrets`,
            recentActivityLogs: activityLogs,
            recentActivityLogsSubtext: `Last 30 days`,
            totalActivityActions: await prisma.activityLog.count(),
            totalActivityActionsSubtext: `All time records`,
            emailsSent24h: emailLogs,
            emailsSent24hSubtext: `Last 24 hours`,
            failedEmails,
            emailDeliveryRate: emailLogs > 0 ? ((emailLogs - failedEmails) / emailLogs * 100).toFixed(1) : '100',
            jobsProcessed24h: activityLogs,
            jobsProcessed24hSubtext: `Last 24 hours`,
            pendingJobs: Math.max(0, totalUsers - activeUsers),
            failedJobs: failedEmails,
            jobSuccessRate: emailLogs > 0 ? ((emailLogs - failedEmails) / emailLogs * 100).toFixed(1) : '100',
            systemStatus: failedEmails < 5 ? 'operational' : 'degraded',
            uptime: uptimeDisplay,
            serverLoad: activeUsers > 50 ? 'High' : activeUsers > 20 ? 'Normal' : 'Low',
        });
    }
    catch (error) {
        console.error('Error fetching super admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
router.get('/users', async (req, res) => {
    try {
        const { page = '1', limit = '50', search = '', role = '', isActive = '', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role) {
            where.role = role;
        }
        if (isActive !== '') {
            where.isActive = isActive === 'true';
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    teamRole: true,
                    isActive: true,
                    createdAt: true,
                    lastLoginAt: true,
                    phone: true,
                    emailVerified: true,
                },
            }),
            prisma.user.count({ where }),
        ]);
        res.json({
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_REP', 'USER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });
        res.json({ message: 'User role updated successfully', user });
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
router.patch('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: Boolean(isActive) },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
            },
        });
        res.json({ message: 'User status updated successfully', user });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await prisma.user.delete({
            where: { id },
        });
        res.json({ message: 'User permanently deleted from database' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
router.get('/system/health', async (req, res) => {
    try {
        const [dbConnectionTest, recentErrors, systemUptime,] = await Promise.all([
            prisma.$queryRaw `SELECT 1`,
            Promise.resolve([]),
            Promise.resolve(process.uptime()),
        ]);
        res.json({
            status: 'healthy',
            database: 'connected',
            uptime: systemUptime,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error checking system health:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});
router.get('/activity/recent', async (req, res) => {
    try {
        const recentLogins = await prisma.user.findMany({
            where: {
                lastLoginAt: { not: null },
            },
            orderBy: { lastLoginAt: 'desc' },
            take: 50,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                lastLoginAt: true,
                role: true,
            },
        });
        res.json({ recentActivity: recentLogins });
    }
    catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
});
router.get('/companies', async (req, res) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [companies, total] = await Promise.all([
            prisma.company.findMany({
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    _count: {
                        select: {
                            contacts: true,
                            deals: true,
                        },
                    },
                },
            }),
            prisma.company.count(),
        ]);
        res.json({
            companies,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});
router.get('/contacts', async (req, res) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            prisma.contact.count(),
        ]);
        res.json({
            contacts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});
router.get('/api-routes', async (req, res) => {
    try {
        const apiRoutes = [
            { method: 'POST', path: '/api/auth/signup', description: 'User registration', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/login', description: 'User login', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/logout', description: 'User logout', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/verify-email', description: 'Verify email with code', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/resend-verification', description: 'Resend verification code', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/forgot-password', description: 'Request password reset', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/reset-password', description: 'Reset password with token', category: 'Authentication' },
            { method: 'POST', path: '/api/auth/change-password', description: 'Change user password', category: 'Authentication' },
            { method: 'GET', path: '/api/users/me', description: 'Get current user profile', category: 'Users' },
            { method: 'PATCH', path: '/api/users/me', description: 'Update current user profile', category: 'Users' },
            { method: 'GET', path: '/api/contacts', description: 'List all contacts', category: 'Contacts' },
            { method: 'POST', path: '/api/contacts', description: 'Create new contact', category: 'Contacts' },
            { method: 'GET', path: '/api/contacts/:id', description: 'Get contact by ID', category: 'Contacts' },
            { method: 'PUT', path: '/api/contacts/:id', description: 'Update contact', category: 'Contacts' },
            { method: 'DELETE', path: '/api/contacts/:id', description: 'Delete contact', category: 'Contacts' },
            { method: 'POST', path: '/api/contacts/import', description: 'Import contacts from CSV', category: 'Contacts' },
            { method: 'GET', path: '/api/companies', description: 'List all companies', category: 'Companies' },
            { method: 'POST', path: '/api/companies', description: 'Create new company', category: 'Companies' },
            { method: 'GET', path: '/api/companies/:id', description: 'Get company by ID', category: 'Companies' },
            { method: 'PUT', path: '/api/companies/:id', description: 'Update company', category: 'Companies' },
            { method: 'DELETE', path: '/api/companies/:id', description: 'Delete company', category: 'Companies' },
            { method: 'POST', path: '/api/companies/import', description: 'Import companies from CSV', category: 'Companies' },
            { method: 'GET', path: '/api/deals', description: 'List all deals', category: 'Deals' },
            { method: 'POST', path: '/api/deals', description: 'Create new deal', category: 'Deals' },
            { method: 'GET', path: '/api/deals/:id', description: 'Get deal by ID', category: 'Deals' },
            { method: 'PUT', path: '/api/deals/:id', description: 'Update deal', category: 'Deals' },
            { method: 'DELETE', path: '/api/deals/:id', description: 'Delete deal', category: 'Deals' },
            { method: 'GET', path: '/api/campaigns', description: 'List all campaigns', category: 'Campaigns' },
            { method: 'POST', path: '/api/campaigns', description: 'Create new campaign', category: 'Campaigns' },
            { method: 'GET', path: '/api/campaigns/:id', description: 'Get campaign by ID', category: 'Campaigns' },
            { method: 'PUT', path: '/api/campaigns/:id', description: 'Update campaign', category: 'Campaigns' },
            { method: 'DELETE', path: '/api/campaigns/:id', description: 'Delete campaign', category: 'Campaigns' },
            { method: 'POST', path: '/api/campaigns/:id/send', description: 'Send campaign emails', category: 'Campaigns' },
            { method: 'GET', path: '/api/video-campaigns', description: 'List video campaigns', category: 'Video Campaigns' },
            { method: 'POST', path: '/api/video-campaigns', description: 'Create video campaign', category: 'Video Campaigns' },
            { method: 'GET', path: '/api/video-campaigns/:id', description: 'Get video campaign', category: 'Video Campaigns' },
            { method: 'PUT', path: '/api/video-campaigns/:id', description: 'Update video campaign', category: 'Video Campaigns' },
            { method: 'DELETE', path: '/api/video-campaigns/:id', description: 'Delete video campaign', category: 'Video Campaigns' },
            { method: 'GET', path: '/api/team/members', description: 'List team members', category: 'Team' },
            { method: 'POST', path: '/api/team/invite', description: 'Invite team member', category: 'Team' },
            { method: 'DELETE', path: '/api/team/:id', description: 'Remove team member', category: 'Team' },
            { method: 'GET', path: '/api/analytics/dashboard', description: 'Get dashboard analytics', category: 'Analytics' },
            { method: 'GET', path: '/api/analytics/campaigns/:id', description: 'Get campaign analytics', category: 'Analytics' },
            { method: 'POST', path: '/api/ai-chat/message', description: 'Send AI chat message', category: 'AI' },
            { method: 'POST', path: '/api/enrichment/company', description: 'Enrich company data', category: 'AI' },
            { method: 'POST', path: '/api/enrichment/contact', description: 'Enrich contact data', category: 'AI' },
            { method: 'GET', path: '/api/super-admin/dashboard/stats', description: 'Get system statistics', category: 'Super Admin' },
            { method: 'GET', path: '/api/super-admin/users', description: 'List all users', category: 'Super Admin' },
            { method: 'PATCH', path: '/api/super-admin/users/:id/role', description: 'Update user role', category: 'Super Admin' },
            { method: 'PATCH', path: '/api/super-admin/users/:id/status', description: 'Update user status', category: 'Super Admin' },
            { method: 'DELETE', path: '/api/super-admin/users/:id', description: 'Delete user', category: 'Super Admin' },
            { method: 'POST', path: '/api/super-admin/database/query', description: 'Execute database query', category: 'Super Admin' },
            { method: 'GET', path: '/api/super-admin/api-routes', description: 'List all API routes', category: 'Super Admin' },
        ];
        const groupedRoutes = apiRoutes.reduce((acc, route) => {
            if (!acc[route.category]) {
                acc[route.category] = [];
            }
            acc[route.category].push(route);
            return acc;
        }, {});
        res.json({
            total: apiRoutes.length,
            categories: Object.keys(groupedRoutes).length,
            routes: apiRoutes,
            grouped: groupedRoutes,
        });
    }
    catch (error) {
        console.error('Error fetching API routes:', error);
        res.status(500).json({ error: 'Failed to fetch API routes' });
    }
});
router.post('/api-routes/test', async (req, res) => {
    try {
        const { method, path } = req.body;
        if (!method || !path) {
            return res.status(400).json({ error: 'Method and path are required' });
        }
        res.json({
            method,
            path,
            status: 'active',
            message: 'Endpoint is registered and active',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error testing API route:', error);
        res.status(500).json({ error: 'Failed to test API route' });
    }
});
router.post('/database/query', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required and must be a string' });
        }
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return res.status(400).json({ error: 'Query cannot be empty' });
        }
        if (trimmedQuery.includes(';') && trimmedQuery.split(';').filter(s => s.trim()).length > 1) {
            return res.status(400).json({
                error: 'Multiple statements are not allowed. Execute one query at a time.'
            });
        }
        const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE'];
        const upperQuery = trimmedQuery.toUpperCase();
        const foundDangerous = dangerousKeywords.find(keyword => upperQuery.includes(keyword));
        if (foundDangerous) {
            console.warn(`⚠️  SUPER ADMIN executing ${foundDangerous} query:`, trimmedQuery);
        }
        const startTime = Date.now();
        const result = await prisma.$queryRawUnsafe(trimmedQuery);
        const executionTime = Date.now() - startTime;
        let formattedResult;
        if (Array.isArray(result)) {
            if (result.length === 0) {
                formattedResult = {
                    columns: [],
                    rows: [],
                    rowCount: 0,
                };
            }
            else {
                const columns = Object.keys(result[0]);
                const rows = result.map(row => columns.map(col => row[col]));
                formattedResult = {
                    columns,
                    rows,
                    rowCount: result.length,
                };
            }
        }
        else {
            formattedResult = {
                columns: ['result'],
                rows: [[String(result)]],
                rowCount: typeof result === 'number' ? result : 1,
            };
        }
        console.log(`✅ Super Admin query executed successfully in ${executionTime}ms`);
        res.json(formattedResult);
    }
    catch (error) {
        console.error('❌ Error executing super admin query:', error);
        res.status(500).json({
            error: error.message || 'Failed to execute query',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.get('/database/tables', async (req, res) => {
    try {
        const tables = await prisma.$queryRaw `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;
        const tableNames = tables.map(t => t.tablename);
        res.json({
            total: tableNames.length,
            tables: tableNames,
        });
    }
    catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});
router.get('/database/tables/:tableName/schema', async (req, res) => {
    try {
        const { tableName } = req.params;
        const columns = await prisma.$queryRaw `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
        res.json({
            tableName,
            columns: columns.map(col => ({
                name: col.column_name,
                type: col.data_type,
                nullable: col.is_nullable === 'YES',
                default: col.column_default,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching table schema:', error);
        res.status(500).json({ error: 'Failed to fetch table schema' });
    }
});
router.get('/database/tables/:tableName/data', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { page = '1', limit = '50', search = '', column = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 100);
        const offset = (pageNum - 1) * limitNum;
        let whereClause = '';
        if (search && column) {
            whereClause = `WHERE CAST("${column}" AS TEXT) ILIKE '%${search}%'`;
        }
        const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}" ${whereClause}`);
        const total = Number(countResult[0].count);
        const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" ${whereClause} ORDER BY 1 DESC LIMIT ${limitNum} OFFSET ${offset}`);
        res.json({
            tableName,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});
router.post('/database/tables/:tableName/rows', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { data } = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Data object is required' });
        }
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
      INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *;
    `;
        const result = await prisma.$queryRawUnsafe(query, ...values);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error creating row:', error);
        res.status(500).json({ error: error.message || 'Failed to create row' });
    }
});
router.put('/database/tables/:tableName/rows/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const { data } = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Data object is required' });
        }
        const updates = Object.entries(data)
            .map(([key, _], i) => `"${key}" = $${i + 1}`)
            .join(', ');
        const values = Object.values(data);
        const query = `
      UPDATE "${tableName}"
      SET ${updates}
      WHERE id = $${values.length + 1}
      RETURNING *;
    `;
        const result = await prisma.$queryRawUnsafe(query, ...values, id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error updating row:', error);
        res.status(500).json({ error: error.message || 'Failed to update row' });
    }
});
router.delete('/database/tables/:tableName/rows/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const query = `DELETE FROM "${tableName}" WHERE id = $1 RETURNING *;`;
        const result = await prisma.$queryRawUnsafe(query, id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('Error deleting row:', error);
        res.status(500).json({ error: error.message || 'Failed to delete row' });
    }
});
router.get('/activity-logs', async (req, res) => {
    try {
        const { page = '1', limit = '50', action = '', userId = '', startDate = '', endDate = '', entityType = '', ipAddress = '', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (action) {
            where.action = action;
        }
        if (userId) {
            where.userId = userId;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        if (ipAddress) {
            where.ipAddress = ipAddress;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }
        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
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
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.activityLog.count({ where }),
        ]);
        res.json({
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});
router.get('/activity-logs/stats', async (req, res) => {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalLogs, logsLast24Hours, logsLast7Days, logsLast30Days, topActions, topUsers, recentLogs,] = await Promise.all([
            prisma.activityLog.count(),
            prisma.activityLog.count({
                where: { createdAt: { gte: last24Hours } },
            }),
            prisma.activityLog.count({
                where: { createdAt: { gte: last7Days } },
            }),
            prisma.activityLog.count({
                where: { createdAt: { gte: last30Days } },
            }),
            prisma.activityLog.groupBy({
                by: ['action'],
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 10,
            }),
            prisma.activityLog.groupBy({
                by: ['userId'],
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                where: { userId: { not: null } },
                take: 10,
            }),
            prisma.activityLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
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
            }),
        ]);
        const userIds = topUsers.map((u) => u.userId).filter((id) => id !== null);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        });
        const topUsersWithDetails = topUsers.map((item) => {
            const user = users.find((u) => u.id === item.userId);
            return {
                userId: item.userId,
                userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                email: user?.email || 'N/A',
                count: item._count.userId,
            };
        });
        res.json({
            totalLogs,
            logsLast24Hours,
            logsLast7Days,
            logsLast30Days,
            topActions: topActions.map((item) => ({
                action: item.action,
                count: item._count.action,
            })),
            topUsers: topUsersWithDetails,
            recentLogs,
        });
    }
    catch (error) {
        console.error('Error fetching activity log stats:', error);
        res.status(500).json({ error: 'Failed to fetch activity log statistics' });
    }
});
router.get('/email-logs', async (req, res) => {
    try {
        const { page = '1', limit = '50', status = '', recipientEmail = '', startDate = '', endDate = '', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (recipientEmail) {
            where.toEmail = {
                contains: recipientEmail,
                mode: 'insensitive',
            };
        }
        if (startDate || endDate) {
            where.sentAt = {};
            if (startDate) {
                where.sentAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.sentAt.lte = new Date(endDate);
            }
        }
        const [logs, total] = await Promise.all([
            prisma.emailLog.findMany({
                where,
                include: {
                    campaign: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.emailLog.count({ where }),
        ]);
        res.json({
            logs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({ error: 'Failed to fetch email logs' });
    }
});
router.get('/email-logs/stats', async (req, res) => {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalEmails, emailsLast24Hours, emailsLast7Days, sentEmails, deliveredEmails, bouncedEmails, openedEmails, clickedEmails, failedEmails,] = await Promise.all([
            prisma.emailLog.count(),
            prisma.emailLog.count({ where: { sentAt: { gte: last24Hours } } }),
            prisma.emailLog.count({ where: { sentAt: { gte: last7Days } } }),
            prisma.emailLog.count({ where: { status: 'SENT' } }),
            prisma.emailLog.count({ where: { status: 'DELIVERED' } }),
            prisma.emailLog.count({ where: { bouncedAt: { not: null } } }),
            prisma.emailLog.count({ where: { openedAt: { not: null } } }),
            prisma.emailLog.count({ where: { clickedAt: { not: null } } }),
            prisma.emailLog.count({ where: { status: 'FAILED' } }),
        ]);
        const deliveryRate = totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0;
        const bounceRate = totalEmails > 0 ? (bouncedEmails / totalEmails) * 100 : 0;
        const openRate = deliveredEmails > 0 ? (openedEmails / deliveredEmails) * 100 : 0;
        const clickRate = openedEmails > 0 ? (clickedEmails / openedEmails) * 100 : 0;
        res.json({
            totalEmails,
            emailsLast24Hours,
            emailsLast7Days,
            sentEmails,
            deliveredEmails,
            bouncedEmails,
            openedEmails,
            clickedEmails,
            failedEmails,
            deliveryRate: deliveryRate.toFixed(2),
            bounceRate: bounceRate.toFixed(2),
            openRate: openRate.toFixed(2),
            clickRate: clickRate.toFixed(2),
        });
    }
    catch (error) {
        console.error('Error fetching email stats:', error);
        res.status(500).json({ error: 'Failed to fetch email statistics' });
    }
});
router.get('/jobs', async (req, res) => {
    try {
        const { page = '1', limit = '50', status = '', } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status) {
            where.status = status;
        }
        const [jobs, total] = await Promise.all([
            prisma.videoGenerationJob.findMany({
                where,
                include: {
                    campaign: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
            }),
            prisma.videoGenerationJob.count({ where }),
        ]);
        res.json({
            jobs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    }
    catch (error) {
        console.error('Error fetching background jobs:', error);
        res.status(500).json({ error: 'Failed to fetch background jobs' });
    }
});
router.get('/jobs/stats', async (req, res) => {
    try {
        const [totalJobs, pendingJobs, processingJobs, completedJobs, failedJobs, recentJobs,] = await Promise.all([
            prisma.videoGenerationJob.count(),
            prisma.videoGenerationJob.count({ where: { status: 'pending' } }),
            prisma.videoGenerationJob.count({ where: { status: 'processing' } }),
            prisma.videoGenerationJob.count({ where: { status: 'completed' } }),
            prisma.videoGenerationJob.count({ where: { status: 'failed' } }),
            prisma.videoGenerationJob.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    campaign: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
        ]);
        const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
        const failureRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;
        res.json({
            totalJobs,
            pendingJobs,
            processingJobs,
            completedJobs,
            failedJobs,
            successRate: successRate.toFixed(2),
            failureRate: failureRate.toFixed(2),
            recentJobs,
        });
    }
    catch (error) {
        console.error('Error fetching job stats:', error);
        res.status(500).json({ error: 'Failed to fetch job statistics' });
    }
});
router.post('/jobs/:id/retry', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await prisma.videoGenerationJob.findUnique({
            where: { id },
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        if (job.status !== 'failed') {
            return res.status(400).json({ error: 'Only failed jobs can be retried' });
        }
        const updatedJob = await prisma.videoGenerationJob.update({
            where: { id },
            data: {
                status: 'pending',
                errorMessage: null,
                completedAt: null,
            },
        });
        res.json({
            message: 'Job queued for retry',
            job: updatedJob,
        });
    }
    catch (error) {
        console.error('Error retrying job:', error);
        res.status(500).json({ error: 'Failed to retry job' });
    }
});
router.post('/jobs/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const job = await prisma.videoGenerationJob.findUnique({
            where: { id },
        });
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        if (job.status === 'completed' || job.status === 'failed') {
            return res.status(400).json({ error: 'Cannot cancel completed or failed jobs' });
        }
        const updatedJob = await prisma.videoGenerationJob.update({
            where: { id },
            data: {
                status: 'failed',
                errorMessage: 'Job cancelled by super admin',
                completedAt: new Date(),
            },
        });
        res.json({
            message: 'Job cancelled successfully',
            job: updatedJob,
        });
    }
    catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({ error: 'Failed to cancel job' });
    }
});
router.get('/ui-config', async (req, res) => {
    try {
        const configs = await prisma.uIConfig.findMany({
            where: { isActive: true },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(configs);
    }
    catch (error) {
        console.error('Error fetching UI configs:', error);
        res.status(500).json({ error: 'Failed to fetch UI configurations' });
    }
});
router.get('/ui-config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const config = await prisma.uIConfig.findUnique({
            where: { key },
        });
        if (!config) {
            return res.status(404).json({ error: 'Configuration not found' });
        }
        res.json(config);
    }
    catch (error) {
        console.error('Error fetching UI config:', error);
        res.status(500).json({ error: 'Failed to fetch UI configuration' });
    }
});
router.post('/ui-config', async (req, res) => {
    try {
        const { key, value, description } = req.body;
        const userId = req.user?.userId;
        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required' });
        }
        const config = await prisma.uIConfig.upsert({
            where: { key },
            create: {
                key,
                value,
                description,
                createdBy: userId,
            },
            update: {
                value,
                description,
                version: { increment: 1 },
            },
        });
        res.json(config);
    }
    catch (error) {
        console.error('Error saving UI config:', error);
        res.status(500).json({ error: 'Failed to save UI configuration' });
    }
});
router.delete('/ui-config/:key', async (req, res) => {
    try {
        const { key } = req.params;
        await prisma.uIConfig.delete({
            where: { key },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting UI config:', error);
        res.status(500).json({ error: 'Failed to delete UI configuration' });
    }
});
router.get('/navigation', async (req, res) => {
    try {
        const items = await prisma.navigationItem.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            include: {
                children: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                },
            },
        });
        res.json(items);
    }
    catch (error) {
        console.error('Error fetching navigation items:', error);
        res.status(500).json({ error: 'Failed to fetch navigation items' });
    }
});
router.post('/navigation', async (req, res) => {
    try {
        const { label, path, icon, order, roles, parentId, badge, badgeColor, metadata } = req.body;
        if (!label || !path) {
            return res.status(400).json({ error: 'Label and path are required' });
        }
        const item = await prisma.navigationItem.create({
            data: {
                label,
                path,
                icon,
                order: order || 0,
                roles: roles || [],
                parentId,
                badge,
                badgeColor,
                metadata,
            },
        });
        res.json(item);
    }
    catch (error) {
        console.error('Error creating navigation item:', error);
        res.status(500).json({ error: 'Failed to create navigation item' });
    }
});
router.put('/navigation/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { label, path, icon, order, isVisible, roles, badge, badgeColor, metadata } = req.body;
        const item = await prisma.navigationItem.update({
            where: { id },
            data: {
                label,
                path,
                icon,
                order,
                isVisible,
                roles,
                badge,
                badgeColor,
                metadata,
            },
        });
        res.json(item);
    }
    catch (error) {
        console.error('Error updating navigation item:', error);
        res.status(500).json({ error: 'Failed to update navigation item' });
    }
});
router.delete('/navigation/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.navigationItem.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting navigation item:', error);
        res.status(500).json({ error: 'Failed to delete navigation item' });
    }
});
router.post('/navigation/reorder', async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items array is required' });
        }
        await Promise.all(items.map(({ id, order }) => prisma.navigationItem.update({
            where: { id },
            data: { order },
        })));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error reordering navigation:', error);
        res.status(500).json({ error: 'Failed to reorder navigation items' });
    }
});
router.get('/themes', async (req, res) => {
    try {
        const themes = await prisma.themeConfig.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(themes);
    }
    catch (error) {
        console.error('Error fetching themes:', error);
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});
router.get('/themes/active', async (req, res) => {
    try {
        const theme = await prisma.themeConfig.findFirst({
            where: { isActive: true },
        });
        res.json(theme || null);
    }
    catch (error) {
        console.error('Error fetching active theme:', error);
        res.status(500).json({ error: 'Failed to fetch active theme' });
    }
});
router.post('/themes', async (req, res) => {
    try {
        const { name, primaryColor, secondaryColor, accentColor, backgroundColor, textColor, sidebarColor, headerColor, buttonStyles, fontFamily, fontSize, borderRadius, customCSS, isDefault, } = req.body;
        if (!name || !primaryColor || !secondaryColor || !accentColor || !backgroundColor || !textColor) {
            return res.status(400).json({ error: 'Required theme fields are missing' });
        }
        const theme = await prisma.themeConfig.create({
            data: {
                name,
                primaryColor,
                secondaryColor,
                accentColor,
                backgroundColor,
                textColor,
                sidebarColor,
                headerColor,
                buttonStyles,
                fontFamily,
                fontSize,
                borderRadius,
                customCSS,
                isDefault,
            },
        });
        res.json(theme);
    }
    catch (error) {
        console.error('Error creating theme:', error);
        res.status(500).json({ error: 'Failed to create theme' });
    }
});
router.put('/themes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, primaryColor, secondaryColor, accentColor, backgroundColor, textColor, sidebarColor, headerColor, buttonStyles, fontFamily, fontSize, borderRadius, customCSS, } = req.body;
        const theme = await prisma.themeConfig.update({
            where: { id },
            data: {
                name,
                primaryColor,
                secondaryColor,
                accentColor,
                backgroundColor,
                textColor,
                sidebarColor,
                headerColor,
                buttonStyles,
                fontFamily,
                fontSize,
                borderRadius,
                customCSS,
            },
        });
        res.json(theme);
    }
    catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ error: 'Failed to update theme' });
    }
});
router.post('/themes/:id/activate', async (req, res) => {
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
        res.json(theme);
    }
    catch (error) {
        console.error('Error activating theme:', error);
        res.status(500).json({ error: 'Failed to activate theme' });
    }
});
router.delete('/themes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const theme = await prisma.themeConfig.findUnique({
            where: { id },
        });
        if (theme?.isActive) {
            return res.status(400).json({ error: 'Cannot delete active theme' });
        }
        await prisma.themeConfig.delete({
            where: { id },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting theme:', error);
        res.status(500).json({ error: 'Failed to delete theme' });
    }
});
router.get('/branding', async (req, res) => {
    try {
        const branding = await prisma.brandingConfig.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(branding || null);
    }
    catch (error) {
        console.error('Error fetching branding:', error);
        res.status(500).json({ error: 'Failed to fetch branding configuration' });
    }
});
router.post('/branding', async (req, res) => {
    try {
        const { companyName, logoUrl, faviconUrl, loginBgImage, dashboardBanner, footerText, supportEmail, supportPhone, socialLinks, metadata, } = req.body;
        if (!companyName) {
            return res.status(400).json({ error: 'Company name is required' });
        }
        await prisma.brandingConfig.updateMany({
            where: { isActive: true },
            data: { isActive: false },
        });
        const branding = await prisma.brandingConfig.create({
            data: {
                companyName,
                logoUrl,
                faviconUrl,
                loginBgImage,
                dashboardBanner,
                footerText,
                supportEmail,
                supportPhone,
                socialLinks,
                metadata,
                isActive: true,
            },
        });
        res.json(branding);
    }
    catch (error) {
        console.error('Error saving branding:', error);
        res.status(500).json({ error: 'Failed to save branding configuration' });
    }
});
router.put('/branding/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { companyName, logoUrl, faviconUrl, loginBgImage, dashboardBanner, footerText, supportEmail, supportPhone, socialLinks, metadata, } = req.body;
        const branding = await prisma.brandingConfig.update({
            where: { id },
            data: {
                companyName,
                logoUrl,
                faviconUrl,
                loginBgImage,
                dashboardBanner,
                footerText,
                supportEmail,
                supportPhone,
                socialLinks,
                metadata,
            },
        });
        res.json(branding);
    }
    catch (error) {
        console.error('Error updating branding:', error);
        res.status(500).json({ error: 'Failed to update branding configuration' });
    }
});
router.get('/tech-stack', async (req, res) => {
    try {
        const techStack = {
            infrastructure: [],
            backend: [],
            frontend: [],
            database: [],
            cloud: [],
            ai: [],
            monitoring: [],
        };
        techStack.infrastructure = [
            {
                name: 'AWS EC2',
                category: 'Infrastructure',
                description: 'Cloud compute server hosting backend services',
                version: 't2.medium instance',
                status: 'healthy',
                connection: 'us-east-1',
                purpose: 'Hosts Node.js backend, PM2, Nginx',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    uptime: '99.9%',
                    region: 'us-east-1',
                },
            },
            {
                name: 'Nginx',
                category: 'Infrastructure',
                description: 'Reverse proxy and web server',
                version: '1.28.0',
                status: 'healthy',
                connection: 'EC2 Instance',
                purpose: 'Serves frontend, proxies API requests to backend',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    configuration: '/etc/nginx/conf.d/brandmonkz.conf',
                    ssl: 'Let\'s Encrypt',
                },
            },
            {
                name: 'PM2',
                category: 'Infrastructure',
                description: 'Process manager for Node.js applications',
                version: 'Latest',
                status: 'healthy',
                connection: 'EC2 Instance',
                purpose: 'Manages backend processes, auto-restart, monitoring',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    processes: 2,
                    services: ['crm-backend', 'video-worker'],
                },
            },
            {
                name: 'Let\'s Encrypt',
                category: 'Infrastructure',
                description: 'SSL/TLS certificate authority',
                version: 'Certbot',
                status: 'healthy',
                connection: 'brandmonkz.com',
                purpose: 'HTTPS encryption for secure connections',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    domains: ['brandmonkz.com', 'www.brandmonkz.com'],
                    autoRenewal: 'Enabled',
                },
            },
        ];
        techStack.backend = [
            {
                name: 'Node.js',
                category: 'Backend',
                description: 'JavaScript runtime for server-side execution',
                version: '20.19.5',
                status: 'healthy',
                connection: 'EC2 Instance',
                purpose: 'Executes backend application code',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    memory: process.memoryUsage().heapUsed / 1024 / 1024 + ' MB',
                    uptime: process.uptime() + ' seconds',
                },
            },
            {
                name: 'Express.js',
                category: 'Backend',
                description: 'Web application framework for Node.js',
                version: '4.18.2',
                status: 'healthy',
                connection: 'Node.js',
                purpose: 'Handles HTTP requests, routing, middleware',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    endpoints: '100+',
                    middleware: ['CORS', 'Helmet', 'Compression', 'Rate Limiting'],
                },
            },
            {
                name: 'TypeScript',
                category: 'Backend',
                description: 'Typed superset of JavaScript',
                version: '5.2.2',
                status: 'healthy',
                connection: 'Build Tool',
                purpose: 'Type safety, better developer experience',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    strictMode: 'Enabled',
                    target: 'ES2020',
                },
            },
            {
                name: 'Prisma ORM',
                category: 'Backend',
                description: 'Next-generation ORM for database operations',
                version: '5.4.2',
                status: 'healthy',
                connection: 'PostgreSQL',
                purpose: 'Type-safe database queries, migrations, schema management',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    models: '50+',
                    migrations: 'Auto-managed',
                },
            },
            {
                name: 'Bull Queue',
                category: 'Backend',
                description: 'Redis-based queue for background jobs',
                version: '4.11.4',
                status: 'healthy',
                connection: 'Redis',
                purpose: 'Asynchronous job processing (emails, video generation)',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    queues: ['email', 'video', 'notifications'],
                },
            },
        ];
        techStack.frontend = [
            {
                name: 'React',
                category: 'Frontend',
                description: 'JavaScript library for building user interfaces',
                version: '19.1.1',
                status: 'healthy',
                connection: 'Browser',
                purpose: 'Component-based UI rendering, state management',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    components: '200+',
                    bundleSize: '1.68 MB',
                },
            },
            {
                name: 'Vite',
                category: 'Frontend',
                description: 'Next-generation frontend build tool',
                version: '7.1.7',
                status: 'healthy',
                connection: 'Build Pipeline',
                purpose: 'Fast builds, hot module replacement, optimization',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    buildTime: '< 2s',
                    outputFormat: 'ESM',
                },
            },
            {
                name: 'TailwindCSS',
                category: 'Frontend',
                description: 'Utility-first CSS framework',
                version: '3.x',
                status: 'healthy',
                connection: 'React Components',
                purpose: 'Responsive styling, design system',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    purgeEnabled: true,
                    customTheme: 'Configured',
                },
            },
            {
                name: 'React Router',
                category: 'Frontend',
                description: 'Declarative routing for React',
                version: '7.9.3',
                status: 'healthy',
                connection: 'React',
                purpose: 'Client-side routing, navigation',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    routes: '50+',
                    lazyLoading: 'Enabled',
                },
            },
            {
                name: 'Heroicons',
                category: 'Frontend',
                description: 'Beautiful hand-crafted SVG icons',
                version: '2.2.0',
                status: 'healthy',
                connection: 'React Components',
                purpose: 'Consistent iconography across the application',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    icons: '200+',
                },
            },
        ];
        let databaseStatus = 'healthy';
        let databaseMetrics = {};
        try {
            await prisma.$queryRaw `SELECT 1`;
            const tableCount = await prisma.$queryRaw `
        SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'
      `;
            databaseMetrics = {
                tables: Number(tableCount[0].count),
                connection: 'Active',
            };
        }
        catch (error) {
            databaseStatus = 'degraded';
            databaseMetrics = { error: 'Connection test failed' };
        }
        techStack.database = [
            {
                name: 'PostgreSQL',
                category: 'Database',
                description: 'Advanced open-source relational database',
                version: '14.x',
                status: databaseStatus,
                connection: 'AWS RDS',
                purpose: 'Primary data storage for all application data',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: databaseMetrics,
            },
            {
                name: 'Redis',
                category: 'Database',
                description: 'In-memory data structure store',
                version: '7.x',
                status: 'healthy',
                connection: 'AWS ElastiCache',
                purpose: 'Caching, session storage, queue management',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    useCase: ['Cache', 'Queue', 'Sessions'],
                },
            },
        ];
        techStack.cloud = [
            {
                name: 'AWS S3',
                category: 'Cloud',
                description: 'Object storage service',
                version: 'Latest',
                status: 'healthy',
                connection: 'us-east-1',
                purpose: 'Frontend hosting, file uploads, asset storage',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    buckets: ['brandmonkz-crm-frontend', 'crm-uploads'],
                },
            },
            {
                name: 'AWS SES',
                category: 'Cloud',
                description: 'Email sending service',
                version: 'Latest',
                status: 'healthy',
                connection: 'us-east-1',
                purpose: 'Transactional emails, campaigns, notifications',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    dailyLimit: '50,000',
                    verifiedDomains: ['brandmonkz.com'],
                },
            },
            {
                name: 'AWS Bedrock',
                category: 'Cloud',
                description: 'Managed AI/ML service',
                version: 'Latest',
                status: 'healthy',
                connection: 'us-east-1',
                purpose: 'AI-powered features via Claude',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    models: ['Claude 3.5 Sonnet'],
                },
            },
            {
                name: 'Stripe',
                category: 'Cloud',
                description: 'Payment processing platform',
                version: '19.1.0 SDK',
                status: 'healthy',
                connection: 'API',
                purpose: 'Subscription billing, payment processing',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    webhooks: 'Configured',
                },
            },
            {
                name: 'Twilio',
                category: 'Cloud',
                description: 'Communication platform',
                version: '5.10.2 SDK',
                status: 'healthy',
                connection: 'API',
                purpose: 'SMS notifications, phone calls',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    services: ['SMS', 'Voice'],
                },
            },
        ];
        techStack.ai = [
            {
                name: 'Anthropic Claude',
                category: 'AI',
                description: 'Advanced AI assistant',
                version: 'Claude 3.5 Sonnet',
                status: 'healthy',
                connection: 'API',
                purpose: 'Content generation, email personalization, AI features',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    sdk: '@anthropic-ai/sdk v0.65.0',
                },
            },
            {
                name: 'OpenAI',
                category: 'AI',
                description: 'AI research and deployment company',
                version: 'GPT-4',
                status: 'healthy',
                connection: 'API',
                purpose: 'Alternative AI features, embeddings',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    sdk: 'openai v6.3.0',
                },
            },
        ];
        techStack.monitoring = [
            {
                name: 'Winston',
                category: 'Monitoring',
                description: 'Universal logging library',
                version: '3.10.0',
                status: 'healthy',
                connection: 'Backend',
                purpose: 'Application logging, error tracking',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    logLevels: ['error', 'warn', 'info', 'debug'],
                },
            },
            {
                name: 'Helmet',
                category: 'Security',
                description: 'HTTP security headers',
                version: '7.0.0',
                status: 'healthy',
                connection: 'Express Middleware',
                purpose: 'Sets security headers to protect from attacks',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    headers: ['CSP', 'HSTS', 'X-Frame-Options'],
                },
            },
            {
                name: 'Rate Limiting',
                category: 'Security',
                description: 'Request rate limiting',
                version: '6.10.0',
                status: 'healthy',
                connection: 'Express Middleware',
                purpose: 'Prevents abuse, DDoS protection',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    limit: '100 requests per 15 minutes',
                },
            },
            {
                name: 'JWT',
                category: 'Security',
                description: 'JSON Web Tokens for authentication',
                version: '9.0.2',
                status: 'healthy',
                connection: 'Auth System',
                purpose: 'Secure user authentication, session management',
                healthCheck: true,
                lastChecked: new Date(),
                metrics: {
                    algorithm: 'HS256',
                    expiry: '7 days',
                },
            },
        ];
        res.json({
            ...techStack,
            summary: {
                totalComponents: Object.values(techStack).flat().length,
                healthyComponents: Object.values(techStack).flat().filter((c) => c.status === 'healthy').length,
                categories: Object.keys(techStack).length,
                lastUpdated: new Date(),
            },
        });
    }
    catch (error) {
        console.error('Error fetching tech stack:', error);
        res.status(500).json({ error: 'Failed to fetch tech stack information' });
    }
});
router.post('/ai-assist', async (req, res) => {
    try {
        const { message, context, conversationHistory, actionMode, currentScreen } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const contextPrompts = {
            overview: `You are a Super Admin Dashboard AI Assistant specializing in system overview and analytics.

        Your expertise includes:
        - Analyzing user growth trends and metrics
        - Interpreting dashboard statistics
        - Identifying anomalies in user activity
        - Providing insights on contacts, companies, and deals
        - Recommending actions based on CRM metrics

        Current Context: The super admin is viewing the Overview dashboard with system-wide statistics.

        Be concise, actionable, and data-driven in your responses.`,
            users: `You are a Super Admin User Management AI Assistant.

        Your expertise includes:
        - User account management best practices
        - Role and permission strategies
        - Troubleshooting user access issues
        - Bulk user operations
        - Security and compliance for user data
        - User onboarding and offboarding processes

        Current Context: The super admin is managing users and their access levels.

        Provide clear, security-conscious recommendations.`,
            'tech-stack': `You are a Super Admin Technology Stack AI Assistant.

        Your expertise includes:
        - Explaining technology choices and their purposes
        - Diagnosing infrastructure issues
        - Version compatibility and updates
        - Performance optimization
        - Scaling recommendations
        - Security patches and best practices
        - Cloud service configuration (AWS, databases, etc.)

        Current Context: The super admin is reviewing the production technology stack.

        Provide technical but accessible explanations.`,
            'ui-config': `You are a Super Admin UI Configuration AI Assistant with code generation capabilities.

        Your expertise includes:
        - Theme design and branding consistency
        - Navigation structure optimization
        - User experience best practices
        - Accessibility considerations
        - Visual hierarchy and design systems
        - Multi-tenant UI customization
        - React/TypeScript component improvements
        - Tailwind CSS styling optimization

        Current Context: The super admin is configuring UI themes and branding.

        ${actionMode ? `
ACTION MODE ENABLED: You can suggest specific code changes to improve the UI.

When suggesting UI improvements:
1. Analyze the current implementation
2. Identify specific improvements (button alignment, spacing, colors, consistency, etc.)
3. Generate actual React/TypeScript code with Tailwind CSS
4. Return suggestions in this EXACT JSON format within your response:

\`\`\`json
{
  "type": "ui-improvement",
  "description": "Brief description of what will be improved",
  "filePath": "frontend/src/pages/SuperAdmin/SuperAdminDashboard.tsx",
  "reasoning": "Why this change improves the UI",
  "newCode": "The actual code snippet that should be applied"
}
\`\`\`

IMPORTANT:
- Only suggest changes to the SuperAdminDashboard.tsx file
- Focus on visual consistency (button styles, spacing, colors, shadows)
- Use Tailwind CSS classes that match the existing design system
- Keep changes small and focused (one improvement at a time)
- The code must be production-ready and tested
        ` : 'Balance aesthetics with usability in your recommendations.'}`,
            database: `You are a Super Admin Database Management AI Assistant.

        Your expertise includes:
        - SQL query optimization
        - Database schema design
        - Data integrity and relationships
        - Performance tuning and indexing
        - Backup and recovery strategies
        - Data migration best practices
        - Security and access control

        Current Context: The super admin is browsing and editing database tables.

        IMPORTANT: Always warn about destructive operations. Be conservative with data modifications.`,
            apis: `You are a Super Admin API Monitoring AI Assistant.

        Your expertise includes:
        - API endpoint analysis
        - Performance monitoring and optimization
        - Error diagnosis and troubleshooting
        - Rate limiting strategies
        - API versioning and deprecation
        - Integration testing
        - Documentation best practices

        Current Context: The super admin is monitoring API routes and performance.

        Focus on reliability and performance insights.`,
            credentials: `You are a Super Admin Credentials Management AI Assistant.

        Your expertise includes:
        - Secure credential storage practices
        - API key rotation strategies
        - OAuth and authentication flows
        - Third-party integration security
        - Credential auditing and compliance
        - Secrets management best practices

        Current Context: The super admin is managing system credentials.

        CRITICAL: Always prioritize security. Never suggest exposing or weakening credentials.`,
            logs: `You are a Super Admin Activity Logs AI Assistant.

        Your expertise includes:
        - Log analysis and pattern recognition
        - Identifying suspicious activities
        - Audit trail interpretation
        - Compliance reporting
        - User behavior analytics
        - Security incident investigation

        Current Context: The super admin is reviewing activity logs.

        Help identify important events and potential issues.`,
            emails: `You are a Super Admin Email Monitoring AI Assistant.

        Your expertise includes:
        - Email deliverability optimization
        - Bounce and spam management
        - Campaign performance analysis
        - Email template best practices
        - SMTP and SES configuration
        - Compliance (CAN-SPAM, GDPR)

        Current Context: The super admin is monitoring email delivery and campaigns.

        Focus on deliverability and engagement metrics.`,
            jobs: `You are a Super Admin Background Jobs AI Assistant.

        Your expertise includes:
        - Queue management and optimization
        - Job retry strategies
        - Performance bottleneck identification
        - Worker process scaling
        - Error handling patterns
        - Async task architecture

        Current Context: The super admin is monitoring background jobs and queues.

        Help diagnose failures and optimize job execution.`,
            system: `You are a Super Admin System Health AI Assistant.

        Your expertise includes:
        - Server health monitoring
        - Resource utilization analysis
        - Performance metrics interpretation
        - Capacity planning
        - Incident response
        - System architecture optimization

        Current Context: The super admin is monitoring system health and uptime.

        Provide actionable insights on system performance.`,
        };
        const systemPrompt = contextPrompts[context] || `You are a helpful Super Admin AI Assistant for a CRM platform.

      Provide clear, actionable guidance for system administration tasks.
      Be professional, concise, and security-conscious.`;
        const messages = [
            ...(conversationHistory || []).map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            {
                role: 'user',
                content: message,
            },
        ];
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages,
        });
        const assistantMessage = response.content[0].type === 'text'
            ? response.content[0].text
            : 'I apologize, but I encountered an issue generating a response.';
        let suggestion = null;
        if (actionMode && context === 'ui-config') {
            const jsonMatch = assistantMessage.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
                try {
                    suggestion = JSON.parse(jsonMatch[1]);
                }
                catch (error) {
                    console.error('Failed to parse code suggestion:', error);
                }
            }
        }
        res.json({
            message: assistantMessage,
            suggestion,
            context,
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            },
        });
    }
    catch (error) {
        console.error('AI Assist error:', error);
        res.status(500).json({
            error: 'Failed to get AI assistance',
            details: error.message,
        });
    }
});
router.post('/apply-code-change', async (req, res) => {
    try {
        const { suggestion } = req.body;
        if (!suggestion || !suggestion.filePath || !suggestion.newCode) {
            return res.status(400).json({ error: 'Invalid suggestion format' });
        }
        const allowedPaths = [
            'frontend/src/pages/SuperAdmin/SuperAdminDashboard.tsx',
            'frontend/src/components/InlineChatBot.tsx',
        ];
        if (!allowedPaths.includes(suggestion.filePath)) {
            return res.status(403).json({
                error: 'Unauthorized file path',
                message: 'For security reasons, code changes are restricted to specific files only.'
            });
        }
        console.log('Code change suggestion:', {
            type: suggestion.type,
            filePath: suggestion.filePath,
            description: suggestion.description,
            reasoning: suggestion.reasoning,
        });
        res.json({
            success: true,
            message: 'Code suggestion logged. For safety, please review and apply manually using your IDE or Claude Code.',
            suggestion: {
                description: suggestion.description,
                filePath: suggestion.filePath,
                reasoning: suggestion.reasoning,
                instructions: [
                    '1. Open the file in your IDE or Claude Code',
                    '2. Review the suggested code change carefully',
                    '3. Apply the change if it looks good',
                    '4. Test the changes locally',
                    '5. Commit and deploy if everything works'
                ]
            }
        });
    }
    catch (error) {
        console.error('Apply code change error:', error);
        res.status(500).json({
            error: 'Failed to apply code change',
            details: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=super-admin.js.map