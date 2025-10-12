import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import godaddyService from '../services/godaddy';

const router = Router();

/**
 * Check GoDaddy connection status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const isConfigured = godaddyService.isConfigured();

    res.json({
      configured: isConfigured,
      message: isConfigured
        ? 'GoDaddy API is configured'
        : 'GoDaddy API credentials not set. Add GODADDY_API_KEY and GODADDY_API_SECRET to your .env file',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all domains
 */
router.get('/domains', authenticate, async (req, res) => {
  try {
    const result = await godaddyService.listDomains();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get domain details
 */
router.get('/domains/:domain', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await godaddyService.getDomain(domain);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get DNS records for a domain
 */
router.get('/domains/:domain/dns', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { type, name } = req.query;

    const result = await godaddyService.getDNSRecords(
      domain,
      type as string | undefined,
      name as string | undefined
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add or update DNS records
 */
router.put('/domains/:domain/dns', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { records } = req.body;

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const result = await godaddyService.updateDNSRecords(domain, records);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add a single DNS record
 */
router.post('/domains/:domain/dns', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const record = req.body;

    if (!record.type || !record.name || !record.data) {
      return res.status(400).json({ error: 'type, name, and data are required' });
    }

    const result = await godaddyService.addDNSRecord(domain, record);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete DNS record
 */
router.delete('/domains/:domain/dns/:type/:name', authenticate, async (req, res) => {
  try {
    const { domain, type, name } = req.params;
    const result = await godaddyService.deleteDNSRecord(domain, type, name);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Point domain to IP address
 */
router.post('/domains/:domain/point-to-ip', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { ipAddress, subdomain } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'ipAddress is required' });
    }

    const result = await godaddyService.pointDomainToServer(domain, ipAddress, subdomain);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add CNAME record
 */
router.post('/domains/:domain/cname', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { subdomain, target } = req.body;

    if (!subdomain || !target) {
      return res.status(400).json({ error: 'subdomain and target are required' });
    }

    const result = await godaddyService.addCNAMERecord(domain, subdomain, target);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Setup email authentication (SPF, DKIM, DMARC)
 */
router.post('/domains/:domain/setup-email-auth', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const config = req.body;

    const result = await godaddyService.setupEmailAuthentication(domain, config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Setup domain for AWS SES
 */
router.post('/domains/:domain/setup-aws-ses', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { verificationToken, dkimTokens } = req.body;

    if (!verificationToken || !dkimTokens || !Array.isArray(dkimTokens)) {
      return res.status(400).json({
        error: 'verificationToken and dkimTokens (array) are required',
      });
    }

    const result = await godaddyService.setupForAWSSES(domain, {
      verificationToken,
      dkimTokens,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Quick setup: Point API subdomain to AWS ALB
 */
router.post('/domains/:domain/quick-setup-aws', authenticate, async (req, res) => {
  try {
    const { domain } = req.params;
    const { albDNS, apiSubdomain } = req.body;

    if (!albDNS) {
      return res.status(400).json({ error: 'albDNS is required' });
    }

    const subdomain = apiSubdomain || 'api';

    const result = await godaddyService.addCNAMERecord(domain, subdomain, albDNS);
    res.json({
      ...result,
      url: `https://${subdomain}.${domain}`,
      note: 'Make sure to add SSL certificate in AWS Certificate Manager for this domain',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
