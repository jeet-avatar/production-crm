"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateJWT);
router.get('/user', analytics_controller_1.getUserAnalytics);
router.get('/api-keys/:keyId/overview', analytics_controller_1.getApiKeyAnalytics);
router.get('/api-keys/:keyId/time-series', analytics_controller_1.getTimeSeriesAnalytics);
router.get('/api-keys/:keyId/endpoints', analytics_controller_1.getEndpointAnalytics);
router.get('/api-keys/:keyId/products', analytics_controller_1.getProductAnalytics);
router.get('/api-keys/:keyId/activity', analytics_controller_1.getRecentActivity);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map