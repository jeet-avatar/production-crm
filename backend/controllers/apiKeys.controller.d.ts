import { Request, Response } from 'express';
import { ApiProduct } from '@prisma/client';
export declare function createApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function listApiKeys(req: Request, res: Response): Promise<void>;
export declare function getApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function revokeApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function rotateApiKey(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getApiKeyUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    keyData?: any;
    error?: string;
}>;
export declare function trackApiKeyUsage(data: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    product: ApiProduct;
    creditsUsed: number;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    errorCode?: string;
    errorMessage?: string;
}): Promise<void>;
//# sourceMappingURL=apiKeys.controller.d.ts.map