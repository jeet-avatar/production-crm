import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to get client IP
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// Helper to extract resource info from endpoint
function extractResourceInfo(method: string, path: string) {
  // Remove /api prefix
  const cleanPath = path.replace('/api/', '');

  // Map common patterns
  const resourceMap: Record<string, string> = {
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

  // Find matching resource
  let resource = 'other';
  for (const [key, value] of Object.entries(resourceMap)) {
    if (cleanPath.startsWith(key)) {
      resource = value;
      break;
    }
  }

  // Determine action from HTTP method and path
  let action = 'view';
  if (method === 'GET') action = 'view';
  else if (method === 'POST') action = 'create';
  else if (method === 'PUT' || method === 'PATCH') action = 'update';
  else if (method === 'DELETE') action = 'delete';

  // Extract resource ID if present (e.g., /contacts/123)
  const idMatch = cleanPath.match(/\/([a-zA-Z0-9-_]+)$/);
  const resourceId = idMatch && idMatch[1].length > 5 ? idMatch[1] : undefined;

  return { action, resource, resourceId };
}

// Middleware to track user activities
export const trackUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Only track authenticated API calls
  const user = (req as any).user;
  if (!user || !user.id) {
    return next();
  }

  // Skip tracking for certain endpoints
  const skipPaths = [
    '/api/health',
    '/api/csrf-token',
    '/api/track',
    '/api/ui-config',
  ];

  if (skipPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Get session token
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);

  // Continue with request
  res.on('finish', async () => {
    try {
      // Calculate duration
      const duration = Date.now() - startTime;

      // Find active session
      let sessionId: string | undefined;
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

      // Skip if no active session found
      if (!sessionId) {
        return;
      }

      // Extract resource info
      const { action, resource, resourceId } = extractResourceInfo(
        req.method,
        req.path
      );

      // Extract metadata
      const metadata: any = {};
      if (req.query && Object.keys(req.query).length > 0) {
        metadata.query = req.query;
      }
      if (req.body && Object.keys(req.body).length > 0 && req.body.password === undefined) {
        // Don't log passwords or sensitive data
        const sanitizedBody = { ...req.body };
        delete sanitizedBody.password;
        delete sanitizedBody.passwordHash;
        delete sanitizedBody.token;
        metadata.body = sanitizedBody;
      }

      // Create activity record
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

      // Update session action count
      await prisma.userSession.update({
        where: { id: sessionId },
        data: {
          actionsCount: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Failed to track user activity:', error);
    }
  });

  next();
};
