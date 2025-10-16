"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const app_1 = require("../app");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = require("../utils/logger");
const aiEnrichment_1 = require("../services/aiEnrichment");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/companies/:id/enrich', async (req, res, next) => {
    try {
        const { id } = req.params;
        const company = await app_1.prisma.company.findFirst({
            where: {
                id,
                userId: req.user?.id,
            },
        });
        if (!company) {
            throw new errorHandler_1.AppError('Company not found', 404);
        }
        console.log(`\n🚀 Starting enrichment for: ${company.name}`);
        const enrichmentData = await (0, aiEnrichment_1.enrichCompanyWithAI)(company.name, company.website || undefined, company.linkedin || undefined);
        console.log(`✅ Enrichment complete with confidence: ${enrichmentData.confidence}%`);
        const enrichedCompany = await app_1.prisma.company.update({
            where: { id },
            data: {
                enriched: true,
                enrichedAt: new Date(),
                industry: enrichmentData.industry || company.industry,
                location: enrichmentData.headquarters || company.location,
                description: enrichmentData.description || company.description,
                employeeCount: enrichmentData.employeeCount || company.employeeCount,
                foundedYear: enrichmentData.foundedYear || company.foundedYear,
                videoUrl: enrichmentData.videoUrl || company.videoUrl,
                hiringInfo: enrichmentData.hiringIntent || company.hiringInfo,
                pitch: enrichmentData.pitch || company.pitch,
                enrichmentData: enrichmentData,
            },
        });
        logger_1.logger.info(`Company enriched: ${company.name} (Confidence: ${enrichmentData.confidence}%)`);
        res.json({
            message: 'Company enriched successfully',
            company: enrichedCompany,
            enrichmentData,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/companies/bulk-enrich', async (req, res, next) => {
    try {
        const { companyIds } = req.body;
        if (!companyIds || !Array.isArray(companyIds)) {
            throw new errorHandler_1.AppError('Company IDs array is required', 400);
        }
        const enrichedCount = await app_1.prisma.company.updateMany({
            where: {
                id: { in: companyIds },
                userId: req.user?.id,
                enriched: false,
            },
            data: {
                enriched: true,
                enrichedAt: new Date(),
            },
        });
        logger_1.logger.info(`Bulk enriched ${enrichedCount.count} companies`);
        res.json({
            message: `Successfully enriched ${enrichedCount.count} companies`,
            count: enrichedCount.count,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=enrichment.js.map