import { Request, Response, NextFunction } from 'express';
export declare function sanitizeInputGuard(req: Request, res: Response, next: NextFunction): void;
export declare function sqlInjectionGuard(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function emailValidationGuard(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function urlValidationGuard(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function fileUploadGuard(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function tokenSecurityGuard(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function userRateLimitGuard(req: Request, res: Response, next: NextFunction): void;
export declare function requestSizeGuard(maxSizeBytes?: number): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare function databaseQueryGuard(model: string, operation: string, query: any, userId?: string): Promise<void>;
export declare function suspiciousActivityGuard(req: Request, res: Response, next: NextFunction): void;
export declare function applyAllSecurityGuards(): (typeof tokenSecurityGuard)[];
declare const _default: {
    sanitizeInputGuard: typeof sanitizeInputGuard;
    sqlInjectionGuard: typeof sqlInjectionGuard;
    emailValidationGuard: typeof emailValidationGuard;
    urlValidationGuard: typeof urlValidationGuard;
    fileUploadGuard: typeof fileUploadGuard;
    tokenSecurityGuard: typeof tokenSecurityGuard;
    userRateLimitGuard: typeof userRateLimitGuard;
    requestSizeGuard: typeof requestSizeGuard;
    databaseQueryGuard: typeof databaseQueryGuard;
    suspiciousActivityGuard: typeof suspiciousActivityGuard;
    applyAllSecurityGuards: typeof applyAllSecurityGuards;
};
export default _default;
//# sourceMappingURL=securityGuards.d.ts.map