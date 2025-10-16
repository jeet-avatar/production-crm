"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const godaddy_1 = __importDefault(require("../services/godaddy"));
const router = (0, express_1.Router)();
router.get('/status', auth_1.authenticate, async (req, res) => {
    try {
        const isConfigured = godaddy_1.default.isConfigured();
        res.json({
            configured: isConfigured,
            message: isConfigured
                ? 'GoDaddy API is configured'
                : 'GoDaddy API credentials not set. Add GODADDY_API_KEY and GODADDY_API_SECRET to your .env file',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/domains', auth_1.authenticate, async (req, res) => {
    try {
        const result = await godaddy_1.default.listDomains();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/domains/:domain', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const result = await godaddy_1.default.getDomain(domain);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/domains/:domain/dns', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { type, name } = req.query;
        const result = await godaddy_1.default.getDNSRecords(domain, type, name);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/domains/:domain/dns', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'Records array is required' });
        }
        const result = await godaddy_1.default.updateDNSRecords(domain, records);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/dns', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const record = req.body;
        if (!record.type || !record.name || !record.data) {
            return res.status(400).json({ error: 'type, name, and data are required' });
        }
        const result = await godaddy_1.default.addDNSRecord(domain, record);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/domains/:domain/dns/:type/:name', auth_1.authenticate, async (req, res) => {
    try {
        const { domain, type, name } = req.params;
        const result = await godaddy_1.default.deleteDNSRecord(domain, type, name);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/point-to-ip', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { ipAddress, subdomain } = req.body;
        if (!ipAddress) {
            return res.status(400).json({ error: 'ipAddress is required' });
        }
        const result = await godaddy_1.default.pointDomainToServer(domain, ipAddress, subdomain);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/cname', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { subdomain, target } = req.body;
        if (!subdomain || !target) {
            return res.status(400).json({ error: 'subdomain and target are required' });
        }
        const result = await godaddy_1.default.addCNAMERecord(domain, subdomain, target);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/setup-email-auth', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const config = req.body;
        const result = await godaddy_1.default.setupEmailAuthentication(domain, config);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/setup-aws-ses', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { verificationToken, dkimTokens } = req.body;
        if (!verificationToken || !dkimTokens || !Array.isArray(dkimTokens)) {
            return res.status(400).json({
                error: 'verificationToken and dkimTokens (array) are required',
            });
        }
        const result = await godaddy_1.default.setupForAWSSES(domain, {
            verificationToken,
            dkimTokens,
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/domains/:domain/quick-setup-aws', auth_1.authenticate, async (req, res) => {
    try {
        const { domain } = req.params;
        const { albDNS, apiSubdomain } = req.body;
        if (!albDNS) {
            return res.status(400).json({ error: 'albDNS is required' });
        }
        const subdomain = apiSubdomain || 'api';
        const result = await godaddy_1.default.addCNAMERecord(domain, subdomain, albDNS);
        res.json({
            ...result,
            url: `https://${subdomain}.${domain}`,
            note: 'Make sure to add SSL certificate in AWS Certificate Manager for this domain',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=godaddy.js.map