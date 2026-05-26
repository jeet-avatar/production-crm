import { Request, Response } from 'express';
export declare const API_PLANS: {
    FREE: {
        id: string;
        name: string;
        monthlyPrice: number;
        annualPrice: number;
        stripePriceId: any;
        limits: {
            leadCredits: number;
            aiRequests: number;
            videoCredits: number;
            emailCredits: number;
            enrichmentCredits: number;
            crmApiCalls: number;
            integrationCalls: number;
        };
        features: string[];
    };
    STARTER: {
        id: string;
        name: string;
        monthlyPrice: number;
        annualPrice: number;
        stripePriceId: string;
        limits: {
            leadCredits: number;
            aiRequests: number;
            videoCredits: number;
            emailCredits: number;
            enrichmentCredits: number;
            crmApiCalls: number;
            integrationCalls: number;
        };
        features: string[];
    };
    PROFESSIONAL: {
        id: string;
        name: string;
        monthlyPrice: number;
        annualPrice: number;
        stripePriceId: string;
        limits: {
            leadCredits: number;
            aiRequests: number;
            videoCredits: number;
            emailCredits: number;
            enrichmentCredits: number;
            crmApiCalls: number;
            integrationCalls: number;
        };
        features: string[];
        popular: boolean;
    };
    BUSINESS: {
        id: string;
        name: string;
        monthlyPrice: number;
        annualPrice: number;
        stripePriceId: string;
        limits: {
            leadCredits: number;
            aiRequests: number;
            videoCredits: number;
            emailCredits: number;
            enrichmentCredits: number;
            crmApiCalls: number;
            integrationCalls: number;
        };
        features: string[];
    };
    ENTERPRISE: {
        id: string;
        name: string;
        monthlyPrice: any;
        annualPrice: any;
        stripePriceId: any;
        limits: {
            leadCredits: number;
            aiRequests: number;
            videoCredits: number;
            emailCredits: number;
            enrichmentCredits: number;
            crmApiCalls: number;
            integrationCalls: number;
        };
        features: string[];
    };
};
export declare function getApiPlans(req: Request, res: Response): Promise<void>;
export declare function getCurrentSubscription(req: Request, res: Response): Promise<void>;
export declare function createCheckoutSession(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function handleStripeWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function cancelSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function incrementUsage(userId: string, product: 'leadCredits' | 'aiRequests' | 'videoCredits' | 'emailCredits' | 'enrichmentCredits' | 'crmApiCalls' | 'integrationCalls', amount?: number): Promise<boolean>;
export declare function checkCredits(userId: string, product: 'leadCredits' | 'aiRequests' | 'videoCredits' | 'emailCredits' | 'enrichmentCredits' | 'crmApiCalls' | 'integrationCalls', amount?: number): Promise<{
    allowed: boolean;
    remaining: number;
}>;
//# sourceMappingURL=apiSubscriptions.controller.d.ts.map