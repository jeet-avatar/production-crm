import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { personalizationService } from '../services/personalization.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/personalization/video-script
 * Generate personalized video script for a contact at a company
 */
router.post('/video-script', authenticate, async (req, res, next) => {
  try {
    const { contactId, companyId, userCompanyName } = req.body;

    if (!contactId || !companyId) {
      return res.status(400).json({
        error: 'contactId and companyId are required',
      });
    }

    logger.info('Generating personalized video script', {
      contactId,
      companyId,
      userId: req.user?.id,
    });

    const result = await personalizationService.generateVideoScript(
      contactId,
      companyId,
      userCompanyName || 'BrandMonkz'
    );

    res.json({
      success: true,
      script: result.content,
      confidence: result.confidence,
      personalizedElements: result.personalizedElements,
      usedSignals: result.usedSignals,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error: any) {
    logger.error('Error generating video script', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/personalization/email-subject
 * Generate personalized email subject line
 */
router.post('/email-subject', authenticate, async (req, res, next) => {
  try {
    const { contactId, companyId, userCompanyName } = req.body;

    if (!contactId || !companyId) {
      return res.status(400).json({
        error: 'contactId and companyId are required',
      });
    }

    logger.info('Generating personalized email subject', {
      contactId,
      companyId,
      userId: req.user?.id,
    });

    const result = await personalizationService.generateEmailSubject(
      contactId,
      companyId,
      userCompanyName || 'BrandMonkz'
    );

    res.json({
      success: true,
      subject: result.content,
      confidence: result.confidence,
      personalizedElements: result.personalizedElements,
      usedSignals: result.usedSignals,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error: any) {
    logger.error('Error generating email subject', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/personalization/email-body
 * Generate personalized email body
 */
router.post('/email-body', authenticate, async (req, res, next) => {
  try {
    const { contactId, companyId, userCompanyName } = req.body;

    if (!contactId || !companyId) {
      return res.status(400).json({
        error: 'contactId and companyId are required',
      });
    }

    logger.info('Generating personalized email body', {
      contactId,
      companyId,
      userId: req.user?.id,
    });

    const result = await personalizationService.generateEmailBody(
      contactId,
      companyId,
      userCompanyName || 'BrandMonkz'
    );

    res.json({
      success: true,
      body: result.content,
      confidence: result.confidence,
      personalizedElements: result.personalizedElements,
      usedSignals: result.usedSignals,
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error: any) {
    logger.error('Error generating email body', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/personalization/analyze-company
 * Analyze a company's intent signals and return personalization opportunities
 */
router.post('/analyze-company', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        error: 'companyId is required',
      });
    }

    logger.info('Analyzing company for personalization', {
      companyId,
      userId: req.user?.id,
    });

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        industry: true,
        description: true,
        intent: true,
        hiringInfo: true,
        jobPostings: true,
        hiringIntent: true,
        aiRecentNews: true,
        techStack: true,
        enrichmentData: true,
      },
    });

    if (!company) {
      return res.status(404).json({
        error: 'Company not found',
      });
    }

    // Analyze available signals
    const signals: any[] = [];
    let confidenceScore = 40; // Base score

    if (company.intent) {
      signals.push({
        type: 'intent',
        value: company.intent,
        impact: 'high',
      });
      confidenceScore += 15;
    }

    if (company.hiringInfo) {
      signals.push({
        type: 'hiring_info',
        value: company.hiringInfo,
        impact: 'high',
      });
      confidenceScore += 15;
    }

    if (company.jobPostings) {
      signals.push({
        type: 'job_postings',
        value: company.jobPostings,
        impact: 'medium',
      });
      confidenceScore += 10;
    }

    if (company.aiRecentNews) {
      signals.push({
        type: 'recent_news',
        value: company.aiRecentNews,
        impact: 'high',
      });
      confidenceScore += 15;
    }

    if (company.techStack) {
      signals.push({
        type: 'tech_stack',
        value: company.techStack,
        impact: 'medium',
      });
      confidenceScore += 10;
    }

    // ✅ NEW: Generate signals from enriched data if no specific signals exist
    const fs = require('fs');
    fs.appendFileSync('/tmp/analyze-debug.log', `\n\n=== ${new Date().toISOString()} ===\n`);
    fs.appendFileSync('/tmp/analyze-debug.log', `Company ID: ${companyId}\n`);
    fs.appendFileSync('/tmp/analyze-debug.log', `Company Name: ${company.name}\n`);
    fs.appendFileSync('/tmp/analyze-debug.log', `Signals before enrichment fallback: ${signals.length}\n`);

    if (signals.length === 0) {
      fs.appendFileSync('/tmp/analyze-debug.log', `No specific signals found, checking enriched data...\n`);
      // Check if company has enriched data
      const enrichedData = company.enrichmentData as any;
      fs.appendFileSync('/tmp/analyze-debug.log', `Industry: ${company.industry}\n`);
      fs.appendFileSync('/tmp/analyze-debug.log', `Has Description: ${!!company.description}\n`);
      fs.appendFileSync('/tmp/analyze-debug.log', `Has EnrichmentData: ${!!enrichedData}\n`);
      fs.appendFileSync('/tmp/analyze-debug.log', `Has Pitch: ${!!enrichedData?.pitch}\n`);

      fs.appendFileSync('/tmp/analyze-debug.log', `Checking industry: ${!!company.industry}\n`);
      if (company.industry) {
        fs.appendFileSync('/tmp/analyze-debug.log', `✅ Adding industry signal: ${company.industry}\n`);
        console.log('✅ Adding industry signal');
        signals.push({
          type: 'industry',
          value: `Company operates in ${company.industry} industry`,
          impact: 'medium',
        });
        confidenceScore += 10;
        fs.appendFileSync('/tmp/analyze-debug.log', `Industry signal added, signals count: ${signals.length}\n`);
      } else {
        fs.appendFileSync('/tmp/analyze-debug.log', `❌ Industry check failed, value: ${company.industry}\n`);
      }

      if (enrichedData?.pitch) {
        console.log('✅ Adding pitch signal');
        signals.push({
          type: 'value_proposition',
          value: enrichedData.pitch,
          impact: 'high',
        });
        confidenceScore += 15;
      }

      if (company.description) {
        console.log('✅ Adding description signal');
        signals.push({
          type: 'company_overview',
          value: company.description,
          impact: 'medium',
        });
        confidenceScore += 10;
      }

      console.log('📊 Signals after enrichment fallback:', signals.length);
    }

    const response = {
      success: true,
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
      },
      signals,
      confidenceScore: Math.min(confidenceScore, 95),
      recommendation: confidenceScore >= 70
        ? 'High personalization potential - ideal for video campaigns'
        : confidenceScore >= 50
        ? 'Moderate personalization potential - good for targeted outreach'
        : 'Limited signals - consider enriching company data first',
      _debug: {
        companyHadIndustry: !!company.industry,
        companyHadDescription: !!company.description,
        companyHadEnrichmentData: !!company.enrichmentData,
        enrichmentDataPitch: company.enrichmentData ? !!(company.enrichmentData as any).pitch : false,
        signalsCount: signals.length,
      },
    };
    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error: any) {
    console.error('❌ ERROR in analyze-company:', error);
    logger.error('Error analyzing company', { error: error.message, stack: error.stack });
    next(error);
  }
});

export default router;
