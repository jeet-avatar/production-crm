"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUserActivity = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
function extractResourceInfo(method, path) {
    const cleanPath = path.replace('/api/', '');
    const resourceMap = {
        '/contacts': 'contact',
        '/companies': 'company',
        '/deals': 'deal',
        '/campaigns': 'campaign',
        '/activities': 'activity',
        '/email-templates': 'email_template',
        '/email-composer': 'email',
        '/dashboard': 'dashboard',
        '/analytics': 'analytics',
        '/users': 'user',
        '/super-admin': 'admin',
    };
    let resource = 'other';
    for (const [key, value] of Object.entries(resourceMap)) {
        if (cleanPath.startsWith(key)) {
            resource = value;
            break;
        }
    }
    let action = 'view';
    if (method === 'GET')
        action = 'view';
    else if (method === 'POST')
        action = 'create';
    else if (method === 'PUT' || method === 'PATCH')
        action = 'update';
    else if (method === 'DELETE')
        action = 'delete';
    const idMatch = cleanPath.match(/\/([a-zA-Z0-9-_]+)$/);
    const resourceId = idMatch && idMatch[1].length > 5 ? idMatch[1] : undefined;
    return { action, resource, resourceId };
}
const trackUserActivity = async (req, res, next) => {
    const startTime = Date.now();
    const user = req.user;
    if (!user || !user.id) {
        return next();
    }
    const skipPaths = [
        '/api/health',
        '/api/csrf-token',
        '/api/track',
        '/api/ui-config',
    ];
    if (skipPaths.some((path) => req.path.startsWith(path))) {
        return next();
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    res.on('finish', async () => {
        try {
            const duration = Date.now() - startTime;
            let sessionId;
            if (token) {
                const session = await prisma.userSession.findFirst({
                    where: {
                        userId: user.id,
                        sessionToken: token,
                        isActive: true,
                    },
                    select: { id: true },
                });
                sessionId = session?.id;
            }
            if (!sessionId) {
                return;
            }
            const { action, resource, resourceId } = extractResourceInfo(req.method, req.path);
            const metadata = {};
            if (req.query && Object.keys(req.query).length > 0) {
                metadata.query = req.query;
            }
            if (req.body && Object.keys(req.body).length > 0 && req.body.password === undefined) {
                const sanitizedBody = { ...req.body };
                delete sanitizedBody.password;
                delete sanitizedBody.passwordHash;
                delete sanitizedBody.token;
                metadata.body = sanitizedBody;
            }
            await prisma.userActivity.create({
                data: {
                    userId: user.id,
                    sessionId,
                    action,
                    resource,
                    resourceId,
                    method: req.method,
                    endpoint: req.path,
                    statusCode: res.statusCode,
                    duration,
                    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
                    ipAddress: getClientIp(req),
                },
            });
            await prisma.userSession.update({
                where: { id: sessionId },
                data: {
                    actionsCount: { increment: 1 },
                },
            });
        }
        catch (error) {
            console.error('Failed to track user activity:', error);
        }
    });
    next();
};
exports.trackUserActivity = trackUserActivity;
//# sourceMappingURL=activityTracker.js.map