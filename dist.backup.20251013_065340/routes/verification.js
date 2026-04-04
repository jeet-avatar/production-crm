"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const twilio_verify_service_1 = require("../services/twilio-verify.service");
const router = (0, express_1.Router)();
router.post('/send', async (req, res, next) => {
    try {
        const { phoneNumber, channel } = req.body;
        if (!phoneNumber) {
            throw new errorHandler_1.AppError('Phone number is required', 400);
        }
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
            throw new errorHandler_1.AppError('Invalid phone number format. Use E.164 format: +1234567890', 400);
        }
        const verifyService = new twilio_verify_service_1.TwilioVerifyService();
        const result = await verifyService.sendVerificationCode(phoneNumber, channel === 'call' ? 'call' : 'sms');
        res.json({
            success: true,
            message: `Verification code sent via ${channel || 'SMS'}`,
            data: {
                to: result.to,
                channel: result.channel,
                status: result.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/verify', async (req, res, next) => {
    try {
        const { phoneNumber, code } = req.body;
        if (!phoneNumber || !code) {
            throw new errorHandler_1.AppError('Phone number and verification code are required', 400);
        }
        const verifyService = new twilio_verify_service_1.TwilioVerifyService();
        const result = await verifyService.verifyCode(phoneNumber, code);
        if (!result.success) {
            throw new errorHandler_1.AppError('Invalid or expired verification code', 400);
        }
        res.json({
            success: true,
            message: 'Phone number verified successfully',
            data: {
                verified: true,
                status: result.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/send-call', async (req, res, next) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            throw new errorHandler_1.AppError('Phone number is required', 400);
        }
        const verifyService = new twilio_verify_service_1.TwilioVerifyService();
        const result = await verifyService.sendVerificationCall(phoneNumber);
        res.json({
            success: true,
            message: 'Verification code will be delivered via phone call',
            data: {
                to: result.to,
                channel: result.channel,
                status: result.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
router.use(auth_1.authenticate);
router.post('/send-to-contact', async (req, res, next) => {
    try {
        const { contactId, channel } = req.body;
        if (!contactId) {
            throw new errorHandler_1.AppError('Contact ID is required', 400);
        }
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            throw new errorHandler_1.AppError('Phone number is required', 400);
        }
        const verifyService = new twilio_verify_service_1.TwilioVerifyService();
        const result = await verifyService.sendVerificationCode(phoneNumber, channel || 'sms');
        res.json({
            success: true,
            message: 'Verification code sent to contact',
            data: {
                contactId,
                to: result.to,
                channel: result.channel,
                status: result.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=verification.js.map