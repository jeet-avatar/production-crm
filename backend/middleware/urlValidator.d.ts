export declare const BLOCKED_DOMAINS: string[];
export declare function isUrlBlocked(url: string): boolean;
export declare function validateUrl(url: string, fieldName?: string): void;
export declare function urlValidationMiddleware(fields: string[]): (req: any, res: any, next: any) => void;
//# sourceMappingURL=urlValidator.d.ts.map