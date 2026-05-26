import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            idempotencyKey?: string;
        }
    }
}
export declare function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export declare function markIdempotencyComplete(key: string, response: any, status: 'completed' | 'failed'): Promise<void>;
export declare function cleanupExpiredIdempotencyKeys(): Promise<number>;
//# sourceMappingURL=idempotency.d.ts.map