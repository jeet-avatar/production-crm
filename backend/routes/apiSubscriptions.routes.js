"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const apiSubscriptions_controller_1 = require("../controllers/apiSubscriptions.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/plans', apiSubscriptions_controller_1.getApiPlans);
router.post('/webhook', express_2.default.raw({ type: 'application/json' }), apiSubscriptions_controller_1.handleStripeWebhook);
router.use(auth_1.authenticateJWT);
router.get('/current', apiSubscriptions_controller_1.getCurrentSubscription);
router.post('/checkout', apiSubscriptions_controller_1.createCheckoutSession);
router.post('/cancel', apiSubscriptions_controller_1.cancelSubscription);
exports.default = router;
//# sourceMappingURL=apiSubscriptions.routes.js.map