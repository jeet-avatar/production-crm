import { Request, Response, NextFunction } from 'express';
import { ActivityLogAction } from '@prisma/client';
export declare function logActivity(action: ActivityLogAction, userId: string | null, entityType?: string, entityId?: string, description?: string, metadata?: any, ipAddress?: string, userAgent?: string): Promise<void>;
export declare function activityLoggerMiddleware(req: Request, res: Response, next: NextFunction): void;
export default activityLoggerMiddleware;
//# sourceMappingURL=activityLogger.d.ts.map