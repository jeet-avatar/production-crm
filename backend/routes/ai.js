"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const company_scraper_service_1 = require("../services/company-scraper.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
let scraperService = null;
const getScraperService = () => {
    if (!scraperService) {
        scraperService = new company_scraper_service_1.CompanyScraperService();
    }
    return scraperService;
};
router.post('/scrape-company', [
    (0, express_validator_1.body)('domain')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Domain is required')
        .matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/)
        .withMessage('Invalid domain format'),
], async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            throw new errorHandler_1.AppError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
        }
        const { domain } = req.body;
        logger_1.logger.info(`🤖 AI scraping request for domain: ${domain}`);
        const service = getScraperService();
        if (!service.isValidDomain(domain)) {
            throw new errorHandler_1.AppError('Invalid domain format', 400);
        }
        const companyData = await service.scrapeCompanyData(domain);
        logger_1.logger.info(`✅ Successfully scraped company data for: ${domain}`);
        res.json({
            success: true,
            companyData,
            message: 'Company data scraped successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Error in AI scrape-company endpoint:', error);
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map