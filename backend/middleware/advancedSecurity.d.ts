import { Request, Response, NextFunction } from 'express';
export declare function advancedRateLimiter(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function ipFilterMiddleware(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export declare function maliciousPayloadDetection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function bruteForcePrevention(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requestIntegrityCheck(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function suspiciousActivityDetection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function sessionHijackingPrevention(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function getSecurityStats(): {
    blacklistedIPs: string[];
    suspiciousIPs: {
        ip: string;
        score: number;
    }[];
    activeRateLimits: number;
    failedLoginAttempts: number;
};
export declare function blockIP(ip: string, metadata?: {
    reason?: string;
    blockedBy?: string;
    threatLevel?: string;
    attackType?: string;
    attempts?: number;
    country?: string;
}): Promise<void>;
export declare function unblockIP(ip: string): Promise<void>;
//# sourceMappingURL=advancedSecurity.d.ts.map