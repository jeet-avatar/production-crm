import { Request, Response, NextFunction } from 'express';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const getAccountOwnerId: (req: Request) => string;
export declare const isResourceOwner: (req: Request, resourceUserId: string) => boolean;
export declare const canAccessResource: (req: Request, resourceType: "contact" | "company" | "deal" | "activity", resourceId: string, resourceUserId: string) => Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map