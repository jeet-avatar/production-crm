import { Request, Response, NextFunction } from 'express';
export declare function strictContentSecurityPolicy(req: Request, res: Response, next: NextFunction): void;
export declare function generateSRIHash(content: string, algorithm?: 'sha256' | 'sha384' | 'sha512'): string;
export declare function clickjackingProtection(req: Request, res: Response, next: NextFunction): void;
export declare function mimeTypeProtection(req: Request, res: Response, next: NextFunction): void;
export declare function strictReferrerPolicy(req: Request, res: Response, next: NextFunction): void;
export declare function featurePolicy(req: Request, res: Response, next: NextFunction): void;
export declare function strictTransportSecurity(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=contentSecurityPolicy.d.ts.map