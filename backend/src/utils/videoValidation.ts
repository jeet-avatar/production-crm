/**
 * Video Campaign Validation Utilities
 *
 * Prevents common failure scenarios:
 * - Invalid voice selections
 * - Missing templates
 * - Malicious content
 */

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

// ElevenLabs Professional Voices (supported)
export const ELEVENLABS_VOICES = [
  '21m00Tcm4TlvDq8ikWAM', // Rachel
  'AZnzlk1XvdvUeBnXmlld', // Domi
  'EXAVITQu4vr4xnSDxMaL', // Bella
  'ErXwobaYiN019PkySvjV', // Antoni
  'MF3mGyEYCl7XYWbV9V6O', // Elli
  'TxGEqnHWrfWFTfGW9XjX', // Josh
  'VR6AewLTigWG4xSOukaG', // Arnold
  'pNInz6obpgDQGcFmaJgB', // Adam
  'yoZ06aMxZJJ28mfd3POQ', // Sam
  'bIHbv24MWmeRgasZH58o', // Will
  'nPczCjzI2devNBz1zQrb', // Brian
  'N2lVS1w4EtoT3dr4eOWO', // Callum
  'XrExE9yKIg1WjnnlVkGX', // Matilda
];

/**
 * Validate voice selection for video campaigns
 * Only ElevenLabs voices are supported
 */
export async function validateVoiceId(voiceId: string): Promise<{
  valid: boolean;
  error?: string;
  details?: string;
}> {
  if (!voiceId) {
    return {
      valid: false,
      error: 'Voice ID is required',
      details: 'Please select a voice from the voice selector'
    };
  }

  // Check if it's a valid ElevenLabs voice
  if (!ELEVENLABS_VOICES.includes(voiceId)) {
    return {
      valid: false,
      error: 'Invalid voice selection',
      details: `Voice ID "${voiceId}" is not recognized. Please select a voice from the ElevenLabs voice selector.`
    };
  }

  return { valid: true };
}

/**
 * Validate email template exists and supports video URLs
 */
export async function validateEmailTemplate(templateId: string): Promise<{
  valid: boolean;
  template?: any;
  error?: string;
  details?: string;
}> {
  if (!templateId) {
    return {
      valid: false,
      error: 'Template ID is required',
      details: 'Please select an email template'
    };
  }

  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        variables: true,
        isActive: true,
      }
    });

    if (!template) {
      return {
        valid: false,
        error: 'Template not found',
        details: `Email template "${templateId}" does not exist. It may have been deleted.`
      };
    }

    if (!template.isActive) {
      return {
        valid: false,
        error: 'Template is inactive',
        details: `Template "${template.name}" is not active. Please select an active template.`
      };
    }

    // Check if template supports video URLs
    if (!template.variables || !(Array.isArray(template.variables) && template.variables.includes('videoUrl'))) {
      return {
        valid: false,
        error: 'Template does not support videos',
        details: `Template "${template.name}" does not have a {{videoUrl}} variable. Please select a video-compatible template.`
      };
    }

    return {
      valid: true,
      template
    };
  } catch (error) {
    logger.error('Error validating template:', error);
    return {
      valid: false,
      error: 'Template validation failed',
      details: 'An error occurred while validating the template'
    };
  }
}

/**
 * Sanitize content for voice synthesis
 * Removes HTML, special characters that might trigger content filters
 */
export function sanitizeForVoiceover(text: string): string {
  if (!text) return '';

  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove URLs (might trigger filters)
    .replace(/https?:\/\/[^\s]+/g, '')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
    // Remove special characters but keep punctuation
    .replace(/[^\w\s.,!?'-]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

/**
 * Validate narration script content
 */
export function validateNarrationScript(script: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
  details?: string;
} {
  if (!script) {
    return {
      valid: false,
      sanitized: '',
      error: 'Narration script is required',
      details: 'Please provide a narration script for the video'
    };
  }

  const sanitized = sanitizeForVoiceover(script);

  if (sanitized.length < 10) {
    return {
      valid: false,
      sanitized,
      error: 'Narration script too short',
      details: `Script must be at least 10 characters. Got ${sanitized.length} characters after sanitization.`
    };
  }

  if (sanitized.length > 5000) {
    return {
      valid: false,
      sanitized: sanitized.substring(0, 5000),
      error: 'Narration script too long',
      details: `Script must be less than 5000 characters. Got ${sanitized.length} characters. Script has been truncated.`
    };
  }

  return {
    valid: true,
    sanitized
  };
}

/**
 * Log campaign failure with detailed information
 */
export async function logCampaignFailure(
  campaignId: string,
  step: string,
  error: Error,
  additionalData?: any
): Promise<void> {
  const errorDetails = {
    campaignId,
    step,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...additionalData
  };

  logger.error('Campaign generation failed:', errorDetails);

  try {
    await prisma.videoCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'FAILED',
        generationError: JSON.stringify(errorDetails), // Full details for debugging
        updatedAt: new Date()
      }
    });
  } catch (updateError) {
    logger.error('Failed to update campaign status:', updateError);
  }
}

/**
 * Comprehensive pre-flight validation for video campaign creation
 */
export async function validateVideoCampaignInput(input: {
  voiceId?: string;
  templateId?: string;
  narrationScript?: string;
  companyName?: string;
}): Promise<{
  valid: boolean;
  errors: Array<{ field: string; message: string; details: string }>;
  warnings: Array<{ field: string; message: string }>;
  sanitizedScript?: string;
}> {
  const errors: Array<{ field: string; message: string; details: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];
  let sanitizedScript: string | undefined;

  // Validate company name
  if (!input.companyName || input.companyName.trim().length === 0) {
    errors.push({
      field: 'companyName',
      message: 'Company name is required',
      details: 'Please provide a company name for the campaign'
    });
  }

  // Validate voice ID
  if (input.voiceId) {
    const voiceValidation = await validateVoiceId(input.voiceId);
    if (!voiceValidation.valid) {
      errors.push({
        field: 'voiceId',
        message: voiceValidation.error || 'Invalid voice',
        details: voiceValidation.details || ''
      });
    }
  } else {
    warnings.push({
      field: 'voiceId',
      message: 'No voice selected, will use default voice'
    });
  }

  // Validate template
  if (input.templateId) {
    const templateValidation = await validateEmailTemplate(input.templateId);
    if (!templateValidation.valid) {
      errors.push({
        field: 'templateId',
        message: templateValidation.error || 'Invalid template',
        details: templateValidation.details || ''
      });
    }
  }

  // Validate narration script
  if (input.narrationScript) {
    const scriptValidation = validateNarrationScript(input.narrationScript);
    if (!scriptValidation.valid) {
      errors.push({
        field: 'narrationScript',
        message: scriptValidation.error || 'Invalid script',
        details: scriptValidation.details || ''
      });
    } else {
      sanitizedScript = scriptValidation.sanitized;

      // Warn if sanitization changed the script significantly
      const originalLength = input.narrationScript.length;
      const sanitizedLength = sanitizedScript.length;
      if (sanitizedLength < originalLength * 0.8) {
        warnings.push({
          field: 'narrationScript',
          message: `Script was sanitized: ${originalLength} → ${sanitizedLength} characters`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    sanitizedScript
  };
}

export default {
  validateVoiceId,
  validateEmailTemplate,
  sanitizeForVoiceover,
  validateNarrationScript,
  logCampaignFailure,
  validateVideoCampaignInput,
  ELEVENLABS_VOICES
};
