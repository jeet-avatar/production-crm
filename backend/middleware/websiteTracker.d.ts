import { Request, Response, NextFunction } from 'express';
export declare const trackWebsiteVisit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateVisitMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=websiteTracker.d.ts.map