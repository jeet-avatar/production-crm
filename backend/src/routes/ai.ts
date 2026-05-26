import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { CompanyScraperService } from '../services/company-scraper.service';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Lazy initialization - only create service when needed to avoid startup errors
let scraperService: CompanyScraperService | null = null;
const getScraperService = (): CompanyScraperService => {
  if (!scraperService) {
    scraperService = new CompanyScraperService();
  }
  return scraperService;
};

/**
 * POST /api/ai/scrape-company
 * Scrape company data from a domain using AI
 */
router.post(
  '/scrape-company',
  [
    body('domain')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Domain is required')
      .matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/)
      .withMessage('Invalid domain format'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
      }

      const { domain } = req.body;

      logger.info(`🤖 AI scraping request for domain: ${domain}`);

      // Get scraper service (lazy initialization)
      const service = getScraperService();

      // Validate domain format
      if (!service.isValidDomain(domain)) {
        throw new AppError('Invalid domain format', 400);
      }

      // Scrape company data
      const companyData = await service.scrapeCompanyData(domain);

      logger.info(`✅ Successfully scraped company data for: ${domain}`);

      res.json({
        success: true,
        companyData,
        message: 'Company data scraped successfully',
      });
    } catch (error) {
      logger.error('❌ Error in AI scrape-company endpoint:', error);
      next(error);
    }
  }
);

export default router;
