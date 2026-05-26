import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireSuperAdmin } from '../middleware/superAdmin';
import credentialService from '../services/credential.service';

const router = express.Router();

// Apply authentication and super admin middleware to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

/**
 * GET /api/credentials - Get all credentials (with masked values)
 */
router.get('/', async (req, res, next) => {
  try {
    const credentials = await credentialService.getAllCredentials();

    res.json({
      credentials,
      total: credentials.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/:id - Get credential by ID (with actual value)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const credential = await credentialService.getCredentialById(id);

    res.json({ credential });
  } catch (error: any) {
    if (error.message === 'Credential not found') {
      return res.status(404).json({ error: 'Credential not found' });
    }
    next(error);
  }
});

/**
 * POST /api/credentials - Create new credential
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, type, service, value, expiresAt, metadata } = req.body;

    // Validate required fields
    if (!name || !type || !service || !value) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, service, value',
      });
    }

    // Validate credential type
    const validTypes = ['API_KEY', 'OAUTH_TOKEN', 'SMTP', 'DATABASE', 'OTHER'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid credential type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const credential = await credentialService.createCredential({
      name,
      type,
      service,
      value,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata,
      createdBy: req.user!.id,
    });

    res.status(201).json({
      credential: {
        ...credential,
        encryptedValue: undefined, // Don't expose encrypted value
      },
      message: 'Credential created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/credentials/:id - Update credential
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, value, expiresAt, metadata, isActive } = req.body;

    const credential = await credentialService.updateCredential(id, {
      name,
      value,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata,
      isActive,
    });

    res.json({
      credential: {
        ...credential,
        encryptedValue: undefined,
      },
      message: 'Credential updated successfully',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Credential not found' });
    }
    next(error);
  }
});

/**
 * DELETE /api/credentials/:id - Delete credential
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await credentialService.deleteCredential(id);

    res.json({ message: 'Credential deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Credential not found' });
    }
    next(error);
  }
});

/**
 * POST /api/credentials/:id/test - Test credential connection
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await credentialService.testCredential(id);

    // Update last used timestamp if test was successful
    if (result.success) {
      await credentialService.markAsUsed(id);
    }

    res.json(result);
  } catch (error: any) {
    if (error.message === 'Credential not found') {
      return res.status(404).json({ error: 'Credential not found' });
    }
    next(error);
  }
});

/**
 * GET /api/credentials/expiring/soon - Get expiring credentials
 */
router.get('/expiring/soon', async (req, res, next) => {
  try {
    const expiringCredentials = await credentialService.getExpiringCredentials();

    res.json({
      credentials: expiringCredentials,
      total: expiringCredentials.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
