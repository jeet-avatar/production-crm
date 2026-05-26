"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleVoiceService = void 0;
class GoogleVoiceService {
    constructor(userGoogleVoiceNumber) {
        this.userGoogleVoiceNumber = userGoogleVoiceNumber || '';
    }
    generateSMSLink(to, body) {
        if (!to.startsWith('+')) {
            throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
        }
        const encodedBody = encodeURIComponent(body);
        const smsLink = `sms:${to}?body=${encodedBody}`;
        const googleMessagesLink = `https://messages.google.com/web/conversations/new?recipient=${to}&text=${encodedBody}`;
        return {
            smsLink,
            googleMessagesLink,
            recipient: to,
            body,
            method: 'google-voice',
            instructions: {
                mobile: 'Click the SMS link to open Google Messages and send',
                desktop: 'Click the link to open Google Messages for Web',
                setup: 'Ensure Google Messages is connected to your Google Voice number at messages.google.com/web',
            },
            isFree: true,
            requiresSetup: !this.userGoogleVoiceNumber,
        };
    }
    generateCallLink(to) {
        if (!to.startsWith('+')) {
            throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
        }
        const callLink = `tel:${to}`;
        const googleVoiceLink = `https://voice.google.com/u/0/calls?a=nc,${to}`;
        return {
            callLink,
            googleVoiceLink,
            recipient: to,
            method: 'google-voice',
            instructions: {
                mobile: 'Click to open Google Voice app and start call',
                desktop: 'Click to open Google Voice for Web and start call',
                setup: 'Ensure you have Google Voice app installed or use voice.google.com',
            },
            isFree: true,
            requiresSetup: !this.userGoogleVoiceNumber,
        };
    }
    async createSMSActivity(to, body) {
        const smsData = this.generateSMSLink(to, body);
        return {
            type: 'SMS',
            status: 'pending_user_action',
            method: 'google-voice',
            recipient: to,
            message: body,
            smsLink: smsData.smsLink,
            googleMessagesLink: smsData.googleMessagesLink,
            sentAt: new Date().toISOString(),
            metadata: {
                service: 'google-voice',
                cost: 0,
                requiresUserAction: true,
                instructions: smsData.instructions,
            },
        };
    }
    async createCallActivity(to) {
        const callData = this.generateCallLink(to);
        return {
            type: 'CALL',
            status: 'pending_user_action',
            method: 'google-voice',
            recipient: to,
            callLink: callData.callLink,
            googleVoiceLink: callData.googleVoiceLink,
            initiatedAt: new Date().toISOString(),
            metadata: {
                service: 'google-voice',
                cost: 0,
                requiresUserAction: true,
                instructions: callData.instructions,
            },
        };
    }
    validatePhoneNumber(phoneNumber) {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        const isValid = e164Regex.test(phoneNumber);
        return {
            phoneNumber,
            valid: isValid,
            format: isValid ? 'E.164' : 'invalid',
            error: isValid ? null : 'Phone number must be in E.164 format (e.g., +15555551234)',
        };
    }
    getSetupInstructions() {
        return {
            title: 'Google Voice Setup (FREE Alternative to Twilio)',
            steps: [
                {
                    step: 1,
                    title: 'Get a Google Voice number (FREE)',
                    url: 'https://voice.google.com',
                    description: 'Sign up for Google Voice and choose a free phone number',
                },
                {
                    step: 2,
                    title: 'Connect Google Messages',
                    url: 'https://messages.google.com/web',
                    description: 'Link your Google Voice number to Google Messages for Web',
                },
                {
                    step: 3,
                    title: 'Configure in CRM',
                    description: 'Go to Settings → Integrations and enter your Google Voice number',
                },
                {
                    step: 4,
                    title: 'Start using',
                    description: 'Click SMS/Call buttons to send messages via Google Voice (FREE!)',
                },
            ],
            benefits: [
                '✅ Completely FREE (no per-message charges)',
                '✅ No API keys or credentials needed',
                '✅ Works on mobile and desktop',
                '✅ Integrated with Gmail and Google Workspace',
                '✅ Voicemail transcription included',
                '✅ Call forwarding and screening',
            ],
            vstwilio: {
                googleVoice: {
                    cost: '$0 - Completely free',
                    setup: 'Simple - just get a number',
                    features: 'SMS, Voice, Voicemail',
                },
                twilio: {
                    cost: '$1/month per number + $0.0075 per SMS',
                    setup: 'Complex - API keys, webhooks',
                    features: 'SMS, Voice, Programmable',
                },
            },
        };
    }
}
exports.GoogleVoiceService = GoogleVoiceService;
//# sourceMappingURL=google-voice.service.js.map