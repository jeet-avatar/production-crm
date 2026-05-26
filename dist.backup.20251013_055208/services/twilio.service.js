"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwilioService = void 0;
const twilio_1 = __importDefault(require("twilio"));
class TwilioService {
    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
        }
        if (!this.fromNumber) {
            throw new Error('Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER in .env');
        }
        this.client = (0, twilio_1.default)(accountSid, authToken);
    }
    async sendSMS(to, body) {
        try {
            if (!to.startsWith('+')) {
                throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
            }
            if (body.length > 1600) {
                throw new Error('SMS message must be 1600 characters or less');
            }
            const message = await this.client.messages.create({
                body,
                from: this.fromNumber,
                to,
            });
            return {
                sid: message.sid,
                status: message.status,
                to: message.to,
                from: message.from,
                body: message.body,
                dateCreated: message.dateCreated,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
            };
        }
        catch (error) {
            console.error('Twilio SMS Error:', error);
            throw new Error(`Failed to send SMS: ${error.message}`);
        }
    }
    async getSMSStatus(messageSid) {
        try {
            const message = await this.client.messages(messageSid).fetch();
            return {
                sid: message.sid,
                status: message.status,
                to: message.to,
                from: message.from,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                dateCreated: message.dateCreated,
                dateSent: message.dateSent,
                dateUpdated: message.dateUpdated,
            };
        }
        catch (error) {
            console.error('Twilio Status Check Error:', error);
            throw new Error(`Failed to get SMS status: ${error.message}`);
        }
    }
    async getMessageDetails(messageSid) {
        try {
            const message = await this.client.messages(messageSid).fetch();
            return message;
        }
        catch (error) {
            console.error('Twilio Message Details Error:', error);
            throw new Error(`Failed to get message details: ${error.message}`);
        }
    }
    async validatePhoneNumber(phoneNumber) {
        try {
            const result = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
            return {
                phoneNumber: result.phoneNumber,
                countryCode: result.countryCode,
                nationalFormat: result.nationalFormat,
                valid: true,
            };
        }
        catch (error) {
            console.error('Phone Number Validation Error:', error);
            return {
                phoneNumber,
                valid: false,
                error: error.message,
            };
        }
    }
}
exports.TwilioService = TwilioService;
//# sourceMappingURL=twilio.service.js.map