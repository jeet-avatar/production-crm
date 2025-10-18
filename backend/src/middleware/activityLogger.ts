/**
 * Activity Logger Middleware
 * Automatically logs user activities for security, compliance, and debugging
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ActivityLogAction } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper function to create an activity log
 */
export async function logActivity(
  action: ActivityLogAction,
  userId: string | null,
  entityType?: string,
  entityId?: string,
  description?: string,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
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
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Middleware to log activity after successful responses
 */
export function activityLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to log activity on success
  res.json = function (body: any): Response {
    // Only log successful responses (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const userId = (req.user as any)?.id || null;
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.get('user-agent') || undefined;
      const path = req.path;
      const method = req.method;

      // Determine action and log based on route and method
      let action: ActivityLogAction | null = null;
      let entityType: string | undefined;
      let entityId: string | undefined;
      let description: string | undefined;

      // Authentication routes
      if (path === '/api/auth/login' && method === 'POST') {
        action = 'USER_LOGIN';
        description = `User logged in from ${ipAddress}`;
      } else if (path === '/api/auth/logout' && method === 'POST') {
        action = 'USER_LOGOUT';
        description = 'User logged out';
      } else if (path === '/api/auth/signup' && method === 'POST') {
        action = 'USER_CREATED';
        description = `New user account created: ${req.body?.email}`;
        entityId = body?.user?.id;
      } else if (path === '/api/auth/reset-password' && method === 'POST') {
        action = 'PASSWORD_RESET';
        description = 'User reset their password';
      }

      // User routes
      else if (path === '/api/users/me' && method === 'PATCH') {
        action = 'USER_UPDATED';
        entityType = 'users';
        entityId = userId || undefined;
        description = 'User updated their profile';
      }

      // Contact routes
      else if (path === '/api/contacts' && method === 'POST') {
        action = 'CONTACT_CREATED';
        entityType = 'contacts';
        entityId = body?.contact?.id || body?.id;
        description = `Created contact: ${req.body?.firstName} ${req.body?.lastName}`;
      } else if (path.startsWith('/api/contacts/') && method === 'PUT') {
        action = 'CONTACT_UPDATED';
        entityType = 'contacts';
        entityId = req.params.id;
        description = `Updated contact: ${req.body?.firstName} ${req.body?.lastName}`;
      } else if (path.startsWith('/api/contacts/') && method === 'DELETE') {
        action = 'CONTACT_DELETED';
        entityType = 'contacts';
        entityId = req.params.id;
        description = 'Deleted contact';
      }

      // Company routes
      else if (path === '/api/companies' && method === 'POST') {
        action = 'COMPANY_CREATED';
        entityType = 'companies';
        entityId = body?.company?.id || body?.id;
        description = `Created company: ${req.body?.name}`;
      } else if (path.startsWith('/api/companies/') && method === 'PUT') {
        action = 'COMPANY_UPDATED';
        entityType = 'companies';
        entityId = req.params.id;
        description = `Updated company: ${req.body?.name}`;
      } else if (path.startsWith('/api/companies/') && method === 'DELETE') {
        action = 'COMPANY_DELETED';
        entityType = 'companies';
        entityId = req.params.id;
        description = 'Deleted company';
      }

      // Deal routes
      else if (path === '/api/deals' && method === 'POST') {
        action = 'DEAL_CREATED';
        entityType = 'deals';
        entityId = body?.deal?.id || body?.id;
        description = `Created deal: ${req.body?.title}`;
      } else if (path.startsWith('/api/deals/') && method === 'PUT') {
        action = 'DEAL_UPDATED';
        entityType = 'deals';
        entityId = req.params.id;
        description = `Updated deal: ${req.body?.title}`;
      } else if (path.startsWith('/api/deals/') && method === 'DELETE') {
        action = 'DEAL_DELETED';
        entityType = 'deals';
        entityId = req.params.id;
        description = 'Deleted deal';
      }

      // Campaign routes
      else if (path.includes('/campaigns') && path.includes('/send') && method === 'POST') {
        action = 'EMAIL_SENT';
        entityType = 'campaigns';
        entityId = req.params.id;
        description = `Sent campaign emails: ${body?.sentCount || 0} emails`;
      }

      // Video generation
      else if (path.includes('/video') && method === 'POST') {
        action = 'VIDEO_GENERATED';
        entityType = 'video_campaigns';
        entityId = body?.campaign?.id || body?.id;
        description = 'Started video generation';
      }

      // Team management
      else if (path === '/api/team/invite' && method === 'POST') {
        action = 'TEAM_INVITE_SENT';
        entityType = 'users';
        description = `Team invite sent to: ${req.body?.email}`;
      } else if (path.startsWith('/api/team/') && method === 'DELETE') {
        action = 'TEAM_MEMBER_REMOVED';
        entityType = 'users';
        entityId = req.params.id;
        description = 'Removed team member';
      }

      // Super Admin routes
      else if (path.startsWith('/api/super-admin/users/') && method === 'PATCH') {
        action = 'USER_UPDATED';
        entityType = 'users';
        entityId = req.params.id;
        description = 'Super admin updated user';
      } else if (path.startsWith('/api/super-admin/users/') && method === 'DELETE') {
        action = 'USER_DELETED';
        entityType = 'users';
        entityId = req.params.id;
        description = 'Super admin deleted user';
      } else if (path === '/api/super-admin/database/query' && method === 'POST') {
        action = 'DATABASE_QUERY';
        description = `Super admin executed database query`;
      } else if (path.includes('/super-admin') && path.includes('/settings') && method === 'PATCH') {
        action = 'SETTINGS_CHANGED';
        description = 'Super admin changed system settings';
      }

      // Log the activity if an action was identified
      if (action) {
        logActivity(
          action,
          userId,
          entityType,
          entityId,
          description,
          {
            path,
            method,
            statusCode: res.statusCode,
          },
          ipAddress,
          userAgent
        ).catch((error) => {
          console.error('Failed to log activity:', error);
        });
      }
    }

    // Call original json method
    return originalJson(body);
  };

  next();
}

export default activityLoggerMiddleware;
