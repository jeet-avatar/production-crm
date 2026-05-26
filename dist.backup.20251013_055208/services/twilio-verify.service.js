"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioVerifyService = void 0;
const twilio_1 = __importDefault(require("twilio"));
class TwilioVerifyService {
    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.verifySid = process.env.TWILIO_VERIFY_SID || 'VA90ffd3c7d478be108b78b51d50a6c34a';
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials are not configured');
        }
        this.client = (0, twilio_1.default)(accountSid, authToken);
    }
    async sendVerificationCode(phoneNumber, channel = 'sms') {
        try {
            const verification = await this.client.verify.v2
                .services(this.verifySid)
                .verifications.create({
                to: phoneNumber,
                channel: channel,
            });
            return {
                success: true,
                status: verification.status,
                to: verification.to,
                channel: verification.channel,
                valid: verification.valid,
            };
        }
        catch (error) {
            console.error('Twilio Verify Error:', error);
            throw new Error(`Failed to send verification code: ${error.message}`);
        }
    }
    async verifyCode(phoneNumber, code) {
        try {
            const verificationCheck = await this.client.verify.v2
                .services(this.verifySid)
                .verificationChecks.create({
                to: phoneNumber,
                code: code,
            });
            return {
                success: verificationCheck.status === 'approved',
                status: verificationCheck.status,
                to: verificationCheck.to,
                valid: verificationCheck.valid,
            };
        }
        catch (error) {
            console.error('Twilio Verify Check Error:', error);
            throw new Error(`Failed to verify code: ${error.message}`);
        }
    }
    async sendVerificationCall(phoneNumber) {
        return this.sendVerificationCode(phoneNumber, 'call');
    }
}
exports.TwilioVerifyService = TwilioVerifyService;
//# sourceMappingURL=twilio-verify.service.js.map