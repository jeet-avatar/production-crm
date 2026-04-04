import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/superAdmin';
import exportService, { ExportOptions } from '../services/export.service';

const router = express.Router();

// Apply authentication and super admin middleware to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

// Rate limiting for exports - 5 requests per 10 minutes
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: 'Too many export requests. Please try again in 10 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(exportLimiter);

/**
 * Helper function to parse export options from query
 */
function parseExportOptions(query: any): ExportOptions {
  return {
    format: query.format || 'csv',
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    columns: query.columns ? query.columns.split(',') : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  };
}

/**
 * GET /api/export/users - Export users
 */
router.get('/users', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportUsers(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/contacts - Export contacts
 */
router.get('/contacts', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportContacts(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/companies - Export companies
 */
router.get('/companies', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportCompanies(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/deals - Export deals
 */
router.get('/deals', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportDeals(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/activities - Export activities
 */
router.get('/activities', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportActivities(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/email-logs - Export email logs
 */
router.get('/email-logs', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportEmailLogs(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/website-visits - Export website visits
 */
router.get('/website-visits', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportWebsiteVisits(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/campaigns - Export campaigns
 */
router.get('/campaigns', async (req, res, next) => {
  try {
    const options = parseExportOptions(req.query);
    const result = await exportService.exportCampaigns(options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/export/custom - Export custom query
 */
router.post('/custom', async (req, res, next) => {
  try {
    const { model, where, format } = req.body;

    if (!model) {
      return res.status(400).json({ error: 'Model name is required' });
    }

    const options: ExportOptions = {
      format: format || 'csv',
    };

    const result = await exportService.exportCustomQuery(model, where || {}, options);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
