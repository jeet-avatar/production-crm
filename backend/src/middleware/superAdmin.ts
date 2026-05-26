import { Request, Response, NextFunction } from 'express';
import { prisma } from '../app';

// Super admin email - loaded from environment variable for security
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

// Validate that SUPER_ADMIN_EMAIL is configured
if (!SUPER_ADMIN_EMAIL) {
  console.error('❌ SECURITY ERROR: SUPER_ADMIN_EMAIL environment variable is not set');
  console.error('   Please set SUPER_ADMIN_EMAIL in your .env file');
}

/**
 * Middleware to check super admin access
 * Requires user to have SUPER_ADMIN role
 */
export const requireSuperAdmin = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
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
      console.warn(
        `⚠️  Unauthorized super admin access attempt by ${user.email} (role: ${user.role})`
      );
      return res.status(403).json({
        error: 'Access denied - Super admin role required',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
