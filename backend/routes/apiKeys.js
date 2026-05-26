"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const apiKeys_controller_1 = require("../controllers/apiKeys.controller");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, apiKeys_controller_1.createApiKey);
router.get('/', auth_1.authenticateToken, apiKeys_controller_1.listApiKeys);
router.get('/:id', auth_1.authenticateToken, apiKeys_controller_1.getApiKey);
router.put('/:id', auth_1.authenticateToken, apiKeys_controller_1.updateApiKey);
router.delete('/:id', auth_1.authenticateToken, apiKeys_controller_1.revokeApiKey);
router.post('/:id/rotate', auth_1.authenticateToken, apiKeys_controller_1.rotateApiKey);
router.get('/:id/usage', auth_1.authenticateToken, apiKeys_controller_1.getApiKeyUsage);
exports.default = router;
//# sourceMappingURL=apiKeys.js.map