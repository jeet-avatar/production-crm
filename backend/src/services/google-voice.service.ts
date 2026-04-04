/**
 * Google Voice Service
 *
 * Replacement for Twilio using Google Voice for SMS/calls
 *
 * HOW IT WORKS:
 * - Google Voice doesn't have a public API
 * - Instead, we use sms: and tel: URI schemes which open Google Messages/Voice
 * - Messages are sent through the user's Google Voice number via their browser/device
 * - This is FREE (unlike Twilio which charges per message)
 *
 * SETUP REQUIRED:
 * 1. Get a free Google Voice number at https://voice.google.com
 * 2. Configure your Google Voice number in Settings → Integrations
 * 3. Enable Google Messages for Web at https://messages.google.com
 */

export class GoogleVoiceService {
  private userGoogleVoiceNumber: string;

  constructor(userGoogleVoiceNumber?: string) {
    this.userGoogleVoiceNumber = userGoogleVoiceNumber || '';
  }

  /**
   * Generate SMS link that opens Google Messages
   * This uses the sms: URI scheme supported by all browsers
   *
   * @param to - Recipient phone number (E.164 format: +15555551234)
   * @param body - Pre-filled message content
   * @returns Object with SMS link and instructions
   */
  generateSMSLink(to: string, body: string) {
    // Validate phone number format
    if (!to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
    }

    // Create SMS URI (works on all platforms)
    // Format: sms:+15555551234?body=Hello%20World
    const encodedBody = encodeURIComponent(body);
    const smsLink = `sms:${to}?body=${encodedBody}`;

    // Alternative: Google Messages web link (desktop users)
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

  /**
   * Generate call link that opens Google Voice dialer
   *
   * @param to - Phone number to call
   * @returns Object with call link and instructions
   */
  generateCallLink(to: string) {
    // Validate phone number format
    if (!to.startsWith('+')) {
      throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
    }

    // Create tel: URI (opens phone dialer/Google Voice)
    const callLink = `tel:${to}`;

    // Google Voice web link (desktop users)
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

  /**
   * Create activity record for SMS (tracking only, actual sending via browser)
   *
   * @param to - Recipient phone number
   * @param body - Message content
   * @returns Activity metadata
   */
  async createSMSActivity(to: string, body: string) {
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
        cost: 0, // FREE!
        requiresUserAction: true,
        instructions: smsData.instructions,
      },
    };
  }

  /**
   * Create activity record for call
   *
   * @param to - Phone number to call
   * @returns Activity metadata
   */
  async createCallActivity(to: string) {
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
        cost: 0, // FREE!
        requiresUserAction: true,
        instructions: callData.instructions,
      },
    };
  }

  /**
   * Validate Google Voice number format
   *
   * @param phoneNumber - Phone number to validate
   * @returns Validation result
   */
  validatePhoneNumber(phoneNumber: string) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    const isValid = e164Regex.test(phoneNumber);

    return {
      phoneNumber,
      valid: isValid,
      format: isValid ? 'E.164' : 'invalid',
      error: isValid ? null : 'Phone number must be in E.164 format (e.g., +15555551234)',
    };
  }

  /**
   * Get setup instructions for Google Voice
   *
   * @returns Setup guide
   */
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
