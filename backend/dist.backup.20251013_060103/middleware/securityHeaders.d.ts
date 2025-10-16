import { Request, Response, NextFunction } from 'express';
export declare function contentSecurityPolicy(): (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: Error) => void) => void;
export declare function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void;
export declare function secureCorsHeaders(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function applyAllSecurityHeaders(): ((req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void)[];
declare const _default: {
    contentSecurityPolicy: typeof contentSecurityPolicy;
    additionalSecurityHeaders: typeof additionalSecurityHeaders;
    secureCorsHeaders: typeof secureCorsHeaders;
    applyAllSecurityHeaders: typeof applyAllSecurityHeaders;
};
export default _default;
//# sourceMappingURL=securityHeaders.d.ts.map