"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("../middleware/auth");
const superAdmin_1 = require("../middleware/superAdmin");
const export_service_1 = __importDefault(require("../services/export.service"));
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use(superAdmin_1.requireSuperAdmin);
const exportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many export requests. Please try again in 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});
router.use(exportLimiter);
function parseExportOptions(query) {
    return {
        format: query.format || 'csv',
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        columns: query.columns ? query.columns.split(',') : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
    };
}
router.get('/users', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportUsers(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/contacts', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportContacts(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/companies', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportCompanies(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/deals', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportDeals(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/activities', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportActivities(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/email-logs', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportEmailLogs(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/website-visits', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportWebsiteVisits(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.get('/campaigns', async (req, res, next) => {
    try {
        const options = parseExportOptions(req.query);
        const result = await export_service_1.default.exportCampaigns(options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
router.post('/custom', async (req, res, next) => {
    try {
        const { model, where, format } = req.body;
        if (!model) {
            return res.status(400).json({ error: 'Model name is required' });
        }
        const options = {
            format: format || 'csv',
        };
        const result = await export_service_1.default.exportCustomQuery(model, where || {}, options);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.data);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=export.routes.js.map