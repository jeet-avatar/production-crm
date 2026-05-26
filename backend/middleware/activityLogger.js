"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
exports.activityLoggerMiddleware = activityLoggerMiddleware;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function logActivity(action, userId, entityType, entityId, description, metadata, ipAddress, userAgent) {
    try {
        await prisma.activityLog.create({
            data: {
                action,
                userId,
                entityType,
                entityId,
                description,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
                ipAddress,
                userAgent,
            },
        });
    }
    catch (error) {
        console.error('Error logging activity:', error);
    }
}
function activityLoggerMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const userId = req.user?.id || null;
            const ipAddress = req.ip || req.socket.remoteAddress || undefined;
            const userAgent = req.get('user-agent') || undefined;
            const path = req.path;
            const method = req.method;
            let action = null;
            let entityType;
            let entityId;
            let description;
            if (path === '/api/auth/login' && method === 'POST') {
                action = 'USER_LOGIN';
                description = `User logged in from ${ipAddress}`;
            }
            else if (path === '/api/auth/logout' && method === 'POST') {
                action = 'USER_LOGOUT';
                description = 'User logged out';
            }
            else if (path === '/api/auth/signup' && method === 'POST') {
                action = 'USER_CREATED';
                description = `New user account created: ${req.body?.email}`;
                entityId = body?.user?.id;
            }
            else if (path === '/api/auth/reset-password' && method === 'POST') {
                action = 'PASSWORD_RESET';
                description = 'User reset their password';
            }
            else if (path === '/api/users/me' && method === 'PATCH') {
                action = 'USER_UPDATED';
                entityType = 'users';
                entityId = userId || undefined;
                description = 'User updated their profile';
            }
            else if (path === '/api/contacts' && method === 'POST') {
                action = 'CONTACT_CREATED';
                entityType = 'contacts';
                entityId = body?.contact?.id || body?.id;
                description = `Created contact: ${req.body?.firstName} ${req.body?.lastName}`;
            }
            else if (path.startsWith('/api/contacts/') && method === 'PUT') {
                action = 'CONTACT_UPDATED';
                entityType = 'contacts';
                entityId = req.params.id;
                description = `Updated contact: ${req.body?.firstName} ${req.body?.lastName}`;
            }
            else if (path.startsWith('/api/contacts/') && method === 'DELETE') {
                action = 'CONTACT_DELETED';
                entityType = 'contacts';
                entityId = req.params.id;
                description = 'Deleted contact';
            }
            else if (path === '/api/companies' && method === 'POST') {
                action = 'COMPANY_CREATED';
                entityType = 'companies';
                entityId = body?.company?.id || body?.id;
                description = `Created company: ${req.body?.name}`;
            }
            else if (path.startsWith('/api/companies/') && method === 'PUT') {
                action = 'COMPANY_UPDATED';
                entityType = 'companies';
                entityId = req.params.id;
                description = `Updated company: ${req.body?.name}`;
            }
            else if (path.startsWith('/api/companies/') && method === 'DELETE') {
                action = 'COMPANY_DELETED';
                entityType = 'companies';
                entityId = req.params.id;
                description = 'Deleted company';
            }
            else if (path === '/api/deals' && method === 'POST') {
                action = 'DEAL_CREATED';
                entityType = 'deals';
                entityId = body?.deal?.id || body?.id;
                description = `Created deal: ${req.body?.title}`;
            }
            else if (path.startsWith('/api/deals/') && method === 'PUT') {
                action = 'DEAL_UPDATED';
                entityType = 'deals';
                entityId = req.params.id;
                description = `Updated deal: ${req.body?.title}`;
            }
            else if (path.startsWith('/api/deals/') && method === 'DELETE') {
                action = 'DEAL_DELETED';
                entityType = 'deals';
                entityId = req.params.id;
                description = 'Deleted deal';
            }
            else if (path.includes('/campaigns') && path.includes('/send') && method === 'POST') {
                action = 'EMAIL_SENT';
                entityType = 'campaigns';
                entityId = req.params.id;
                description = `Sent campaign emails: ${body?.sentCount || 0} emails`;
            }
            else if (path.includes('/video') && method === 'POST') {
                action = 'VIDEO_GENERATED';
                entityType = 'video_campaigns';
                entityId = body?.campaign?.id || body?.id;
                description = 'Started video generation';
            }
            else if (path === '/api/team/invite' && method === 'POST') {
                action = 'TEAM_INVITE_SENT';
                entityType = 'users';
                description = `Team invite sent to: ${req.body?.email}`;
            }
            else if (path.startsWith('/api/team/') && method === 'DELETE') {
                action = 'TEAM_MEMBER_REMOVED';
                entityType = 'users';
                entityId = req.params.id;
                description = 'Removed team member';
            }
            else if (path.startsWith('/api/super-admin/users/') && method === 'PATCH') {
                action = 'USER_UPDATED';
                entityType = 'users';
                entityId = req.params.id;
                description = 'Super admin updated user';
            }
            else if (path.startsWith('/api/super-admin/users/') && method === 'DELETE') {
                action = 'USER_DELETED';
                entityType = 'users';
                entityId = req.params.id;
                description = 'Super admin deleted user';
            }
            else if (path === '/api/super-admin/database/query' && method === 'POST') {
                action = 'DATABASE_QUERY';
                description = `Super admin executed database query`;
            }
            else if (path.includes('/super-admin') && path.includes('/settings') && method === 'PATCH') {
                action = 'SETTINGS_CHANGED';
                description = 'Super admin changed system settings';
            }
            if (action) {
                logActivity(action, userId, entityType, entityId, description, {
                    path,
                    method,
                    statusCode: res.statusCode,
                }, ipAddress, userAgent).catch((error) => {
                    console.error('Failed to log activity:', error);
                });
            }
        }
        return originalJson(body);
    };
    next();
}
exports.default = activityLoggerMiddleware;
//# sourceMappingURL=activityLogger.js.map