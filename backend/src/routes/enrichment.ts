// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { enrichCompanyWithAI } from '../services/aiEnrichment';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Enrich a company by ID
router.post('/companies/:id/enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership before enrichment
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Use AI enrichment service
    console.log(`\n🚀 Starting enrichment for: ${company.name}`);

    const enrichmentData = await enrichCompanyWithAI(
      company.name,
      company.website || undefined,
      company.linkedin || undefined
    );

    console.log(`✅ Enrichment complete with confidence: ${enrichmentData.confidence}%`);

    // Update company with enriched data
    const enrichedCompany = await prisma.company.update({
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
        enrichmentData: enrichmentData as any,
      },
    });

    logger.info(`Company enriched: ${company.name} (Confidence: ${enrichmentData.confidence}%)`);

    res.json({
      message: 'Company enriched successfully',
      company: enrichedCompany,
      enrichmentData,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk enrich companies
router.post('/companies/bulk-enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      throw new AppError('Company IDs array is required', 400);
    }

    // ✅ Only enrich companies owned by user
    const enrichedCount = await prisma.company.updateMany({
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

    logger.info(`Bulk enriched ${enrichedCount.count} companies`);

    res.json({
      message: `Successfully enriched ${enrichedCount.count} companies`,
      count: enrichedCount.count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
