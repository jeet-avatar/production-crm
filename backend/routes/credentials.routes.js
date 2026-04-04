"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const superAdmin_1 = require("../middleware/superAdmin");
const credential_service_1 = __importDefault(require("../services/credential.service"));
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use(superAdmin_1.requireSuperAdmin);
router.get('/', async (req, res, next) => {
    try {
        const credentials = await credential_service_1.default.getAllCredentials();
        res.json({
            credentials,
            total: credentials.length,
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const credential = await credential_service_1.default.getCredentialById(id);
        res.json({ credential });
    }
    catch (error) {
        if (error.message === 'Credential not found') {
            return res.status(404).json({ error: 'Credential not found' });
        }
        next(error);
    }
});
router.post('/', async (req, res, next) => {
    try {
        const { name, type, service, value, expiresAt, metadata } = req.body;
        if (!name || !type || !service || !value) {
            return res.status(400).json({
                error: 'Missing required fields: name, type, service, value',
            });
        }
        const validTypes = ['API_KEY', 'OAUTH_TOKEN', 'SMTP', 'DATABASE', 'OTHER'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid credential type. Must be one of: ${validTypes.join(', ')}`,
            });
        }
        const credential = await credential_service_1.default.createCredential({
            name,
            type,
            service,
            value,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            metadata,
            createdBy: req.user.id,
        });
        res.status(201).json({
            credential: {
                ...credential,
                encryptedValue: undefined,
            },
            message: 'Credential created successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, value, expiresAt, metadata, isActive } = req.body;
        const credential = await credential_service_1.default.updateCredential(id, {
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
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Credential not found' });
        }
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await credential_service_1.default.deleteCredential(id);
        res.json({ message: 'Credential deleted successfully' });
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Credential not found' });
        }
        next(error);
    }
});
router.post('/:id/test', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await credential_service_1.default.testCredential(id);
        if (result.success) {
            await credential_service_1.default.markAsUsed(id);
        }
        res.json(result);
    }
    catch (error) {
        if (error.message === 'Credential not found') {
            return res.status(404).json({ error: 'Credential not found' });
        }
        next(error);
    }
});
router.get('/expiring/soon', async (req, res, next) => {
    try {
        const expiringCredentials = await credential_service_1.default.getExpiringCredentials();
        res.json({
            credentials: expiringCredentials,
            total: expiringCredentials.length,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=credentials.routes.js.map