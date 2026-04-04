export declare function sanitizeFilename(filename: string): string;
export declare function validatePathInDirectory(filePath: string, baseDir: string): void;
export declare function safePathJoin(baseDir: string, ...parts: string[]): string;
export declare function sanitizeObject<T extends Record<string, any>>(input: any, allowedFields: string[]): Partial<T>;
export declare function sanitizeString(input: string, maxLength?: number): string;
export declare function sanitizeEmail(email: string): string;
export declare function sanitizeURL(url: string, allowedProtocols?: string[]): string;
export declare function sanitizeInteger(input: any, min?: number, max?: number): number;
export declare function sanitizeBoolean(input: any): boolean;
export declare function sanitizeLogMessage(message: string): string;
//# sourceMappingURL=security.d.ts.map