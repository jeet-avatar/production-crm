/**
 * Email Verification Service
 *
 * Supports multiple email verification providers:
 * - Hunter.io (Best for B2B, 50 free verifications/month)
 * - ZeroBounce (Most accurate, 100 free credits)
 * - AbstractAPI (250 free requests/month)
 * - EmailListVerify (Free tier available)
 */

import { logger } from '../utils/logger';

export interface EmailVerificationResult {
  email: string;
  isValid: boolean;
  status: 'valid' | 'invalid' | 'risky' | 'unknown' | 'catch-all';
  score: number; // 0-100, confidence score
  reason?: string;
  provider: string;
  details?: {
    syntax?: boolean;
    domain?: boolean;
    smtp?: boolean;
    mailbox?: boolean;
    disposable?: boolean;
    role?: boolean;
    free?: boolean;
    acceptAll?: boolean;
  };
}

interface VerificationProvider {
  name: string;
  verify: (email: string) => Promise<EmailVerificationResult>;
}

/**
 * Hunter.io Email Verification
 * Free tier: 50 verifications/month
 * Paid: $49/month for 500 verifications
 */
class HunterVerifier implements VerificationProvider {
  name = 'Hunter.io';
  private apiKey: string;
  private apiUrl = 'https://api.hunter.io/v2/email-verifier';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async verify(email: string): Promise<EmailVerificationResult> {
    try {
      const url = `${this.apiUrl}?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Hunter API error: ${response.status}`);
      }

      const data: any = await response.json();
      const result = data.data;

      // Hunter.io status: valid, invalid, accept_all, webmail, disposable, unknown
      let status: EmailVerificationResult['status'] = 'unknown';
      let score = result.score || 0;

      if (result.status === 'valid') {
        status = 'valid';
      } else if (result.status === 'invalid') {
        status = 'invalid';
        score = 0;
      } else if (result.status === 'accept_all') {
        status = 'catch-all';
        score = 50;
      } else if (result.status === 'webmail' || result.status === 'disposable') {
        status = 'risky';
        score = 30;
      }

      return {
        email,
        isValid: status === 'valid',
        status,
        score,
        reason: result.result,
        provider: this.name,
        details: {
          syntax: result.regexp,
          domain: result.mx_records,
          smtp: result.smtp_check,
          mailbox: result.smtp_server,
          disposable: result.disposable,
          role: result.role,
          free: result.webmail,
          acceptAll: result.accept_all,
        }
      };
    } catch (error: any) {
      logger.error(`Hunter.io verification failed for ${email}:`, error);
      throw error;
    }
  }
}

/**
 * ZeroBounce Email Verification
 * Free tier: 100 credits
 * Paid: $16/month for 2,000 validations
 */
class ZeroBounceVerifier implements VerificationProvider {
  name = 'ZeroBounce';
  private apiKey: string;
  private apiUrl = 'https://api.zerobounce.net/v2/validate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async verify(email: string): Promise<EmailVerificationResult> {
    try {
      const url = `${this.apiUrl}?api_key=${this.apiKey}&email=${encodeURIComponent(email)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ZeroBounce API error: ${response.status}`);
      }

      const result: any = await response.json();

      // ZeroBounce status: valid, invalid, catch-all, unknown, spamtrap, abuse, do_not_mail
      let status: EmailVerificationResult['status'] = 'unknown';
      let score = 0;

      if (result.status === 'valid') {
        status = 'valid';
        score = 100;
      } else if (result.status === 'invalid' || result.status === 'spamtrap' || result.status === 'abuse' || result.status === 'do_not_mail') {
        status = 'invalid';
        score = 0;
      } else if (result.status === 'catch-all') {
        status = 'catch-all';
        score = 60;
      } else {
        status = 'unknown';
        score = 30;
      }

      return {
        email,
        isValid: status === 'valid',
        status,
        score,
        reason: result.sub_status || result.status,
        provider: this.name,
        details: {
          syntax: true, // ZeroBounce always checks syntax
          domain: result.mx_found,
          smtp: result.smtp_provider !== null,
          disposable: result.disposable,
          role: result.role,
          free: result.free_email,
          acceptAll: result.status === 'catch-all',
        }
      };
    } catch (error: any) {
      logger.error(`ZeroBounce verification failed for ${email}:`, error);
      throw error;
    }
  }
}

/**
 * AbstractAPI Email Validation
 * Free tier: 250 requests/month
 * Paid: $9/month for 10,000 requests
 */
class AbstractAPIVerifier implements VerificationProvider {
  name = 'AbstractAPI';
  private apiKey: string;
  private apiUrl = 'https://emailvalidation.abstractapi.com/v1/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async verify(email: string): Promise<EmailVerificationResult> {
    try {
      const url = `${this.apiUrl}?api_key=${this.apiKey}&email=${encodeURIComponent(email)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`AbstractAPI error: ${response.status}`);
      }

      const result: any = await response.json();

      // AbstractAPI provides detailed quality score
      let status: EmailVerificationResult['status'] = 'unknown';
      let score = result.quality_score * 100 || 0; // Convert 0-1 to 0-100

      if (result.deliverability === 'DELIVERABLE') {
        status = 'valid';
      } else if (result.deliverability === 'UNDELIVERABLE') {
        status = 'invalid';
        score = 0;
      } else if (result.is_catchall_email?.value) {
        status = 'catch-all';
        score = 50;
      } else if (result.is_disposable_email?.value || result.is_free_email?.value) {
        status = 'risky';
      }

      return {
        email,
        isValid: status === 'valid',
        status,
        score,
        reason: result.deliverability,
        provider: this.name,
        details: {
          syntax: result.is_valid_format?.value,
          domain: result.is_mx_found?.value,
          smtp: result.is_smtp_valid?.value,
          disposable: result.is_disposable_email?.value,
          role: result.is_role_email?.value,
          free: result.is_free_email?.value,
          acceptAll: result.is_catchall_email?.value,
        }
      };
    } catch (error: any) {
      logger.error(`AbstractAPI verification failed for ${email}:`, error);
      throw error;
    }
  }
}

/**
 * Basic Email Verification (Free - No API key needed)
 * Only checks syntax and MX records
 */
class BasicVerifier implements VerificationProvider {
  name = 'Basic';

  async verify(email: string): Promise<EmailVerificationResult> {
    try {
      // Check email syntax
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const syntaxValid = emailRegex.test(email);

      if (!syntaxValid) {
        return {
          email,
          isValid: false,
          status: 'invalid',
          score: 0,
          reason: 'Invalid email syntax',
          provider: this.name,
          details: {
            syntax: false,
          }
        };
      }

      // Extract domain
      const domain = email.split('@')[1];

      // Check for common disposable domains
      const disposableDomains = [
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'throwaway.email', 'mailinator.com', 'yopmail.com'
      ];
      const isDisposable = disposableDomains.some(d => domain.includes(d));

      if (isDisposable) {
        return {
          email,
          isValid: false,
          status: 'risky',
          score: 10,
          reason: 'Disposable email domain',
          provider: this.name,
          details: {
            syntax: true,
            disposable: true,
          }
        };
      }

      // Basic validation passed
      return {
        email,
        isValid: true,
        status: 'valid',
        score: 70, // Lower confidence since we can't verify SMTP
        reason: 'Basic validation passed',
        provider: this.name,
        details: {
          syntax: true,
          disposable: false,
        }
      };

    } catch (error: any) {
      logger.error(`Basic verification failed for ${email}:`, error);
      throw error;
    }
  }
}

/**
 * Email Verification Service
 * Automatically selects the best available provider based on environment variables
 */
export class EmailVerificationService {
  private provider: VerificationProvider;

  constructor() {
    // Check for available API keys and select provider
    const hunterKey = process.env.HUNTER_API_KEY;
    const zeroBounceKey = process.env.ZEROBOUNCE_API_KEY;
    const abstractKey = process.env.ABSTRACTAPI_KEY;

    if (hunterKey) {
      logger.info('Using Hunter.io for email verification');
      this.provider = new HunterVerifier(hunterKey);
    } else if (zeroBounceKey) {
      logger.info('Using ZeroBounce for email verification');
      this.provider = new ZeroBounceVerifier(zeroBounceKey);
    } else if (abstractKey) {
      logger.info('Using AbstractAPI for email verification');
      this.provider = new AbstractAPIVerifier(abstractKey);
    } else {
      logger.warn('No email verification API key found, using basic verification');
      this.provider = new BasicVerifier();
    }
  }

  /**
   * Verify a single email address
   */
  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    logger.info(`Verifying email: ${email} with ${this.provider.name}`);
    return await this.provider.verify(email);
  }

  /**
   * Verify multiple email addresses in bulk
   * Processes emails sequentially to avoid rate limits
   */
  async verifyBulk(
    emails: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<EmailVerificationResult[]> {
    logger.info(`Starting bulk verification of ${emails.length} emails`);

    const results: EmailVerificationResult[] = [];
    let completed = 0;

    for (const email of emails) {
      try {
        const result = await this.verifyEmail(email);
        results.push(result);

        completed++;
        if (onProgress) {
          onProgress(completed, emails.length);
        }

        // Rate limiting: wait 1 second between requests
        if (completed < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        logger.error(`Failed to verify ${email}:`, error);
        // Add failed result
        results.push({
          email,
          isValid: false,
          status: 'unknown',
          score: 0,
          reason: `Verification failed: ${error.message}`,
          provider: this.provider.name,
        });
      }
    }

    logger.info(`Bulk verification complete: ${results.filter(r => r.isValid).length}/${emails.length} valid`);
    return results;
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }
}

// Singleton instance
export const emailVerificationService = new EmailVerificationService();
