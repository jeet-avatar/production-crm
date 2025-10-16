import { Request, Response, NextFunction } from 'express';
export declare function generateCsrfToken(sessionId: string): string;
export declare function validateCsrfToken(sessionId: string, token: string): boolean;
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function getCsrfToken(req: Request, res: Response): void;
declare const _default: {
    csrfProtection: typeof csrfProtection;
    generateCsrfToken: typeof generateCsrfToken;
    validateCsrfToken: typeof validateCsrfToken;
    getCsrfToken: typeof getCsrfToken;
};
export default _default;
//# sourceMappingURL=csrfProtection.d.ts.map