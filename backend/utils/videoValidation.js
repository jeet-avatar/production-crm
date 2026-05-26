"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELEVENLABS_VOICES = void 0;
exports.validateVoiceId = validateVoiceId;
exports.validateEmailTemplate = validateEmailTemplate;
exports.sanitizeForVoiceover = sanitizeForVoiceover;
exports.validateNarrationScript = validateNarrationScript;
exports.logCampaignFailure = logCampaignFailure;
exports.validateVideoCampaignInput = validateVideoCampaignInput;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const prisma = new client_1.PrismaClient();
exports.ELEVENLABS_VOICES = [
    '21m00Tcm4TlvDq8ikWAM',
    'AZnzlk1XvdvUeBnXmlld',
    'EXAVITQu4vr4xnSDxMaL',
    'ErXwobaYiN019PkySvjV',
    'MF3mGyEYCl7XYWbV9V6O',
    'TxGEqnHWrfWFTfGW9XjX',
    'VR6AewLTigWG4xSOukaG',
    'pNInz6obpgDQGcFmaJgB',
    'yoZ06aMxZJJ28mfd3POQ',
    'bIHbv24MWmeRgasZH58o',
    'nPczCjzI2devNBz1zQrb',
    'N2lVS1w4EtoT3dr4eOWO',
    'XrExE9yKIg1WjnnlVkGX',
];
async function validateVoiceId(voiceId) {
    if (!voiceId) {
        return {
            valid: false,
            error: 'Voice ID is required',
            details: 'Please select a voice from the voice selector'
        };
    }
    if (!exports.ELEVENLABS_VOICES.includes(voiceId)) {
        return {
            valid: false,
            error: 'Invalid voice selection',
            details: `Voice ID "${voiceId}" is not recognized. Please select a voice from the ElevenLabs voice selector.`
        };
    }
    return { valid: true };
}
async function validateEmailTemplate(templateId) {
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
    }
    catch (error) {
        logger_1.logger.error('Error validating template:', error);
        return {
            valid: false,
            error: 'Template validation failed',
            details: 'An error occurred while validating the template'
        };
    }
}
function sanitizeForVoiceover(text) {
    if (!text)
        return '';
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
        .replace(/[^\w\s.,!?'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function validateNarrationScript(script) {
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
async function logCampaignFailure(campaignId, step, error, additionalData) {
    const errorDetails = {
        campaignId,
        step,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
    logger_1.logger.error('Campaign generation failed:', errorDetails);
    try {
        await prisma.videoCampaign.update({
            where: { id: campaignId },
            data: {
                status: 'FAILED',
                generationError: JSON.stringify(errorDetails),
                updatedAt: new Date()
            }
        });
    }
    catch (updateError) {
        logger_1.logger.error('Failed to update campaign status:', updateError);
    }
}
async function validateVideoCampaignInput(input) {
    const errors = [];
    const warnings = [];
    let sanitizedScript;
    if (!input.companyName || input.companyName.trim().length === 0) {
        errors.push({
            field: 'companyName',
            message: 'Company name is required',
            details: 'Please provide a company name for the campaign'
        });
    }
    if (input.voiceId) {
        const voiceValidation = await validateVoiceId(input.voiceId);
        if (!voiceValidation.valid) {
            errors.push({
                field: 'voiceId',
                message: voiceValidation.error || 'Invalid voice',
                details: voiceValidation.details || ''
            });
        }
    }
    else {
        warnings.push({
            field: 'voiceId',
            message: 'No voice selected, will use default voice'
        });
    }
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
    if (input.narrationScript) {
        const scriptValidation = validateNarrationScript(input.narrationScript);
        if (!scriptValidation.valid) {
            errors.push({
                field: 'narrationScript',
                message: scriptValidation.error || 'Invalid script',
                details: scriptValidation.details || ''
            });
        }
        else {
            sanitizedScript = scriptValidation.sanitized;
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
exports.default = {
    validateVoiceId,
    validateEmailTemplate,
    sanitizeForVoiceover,
    validateNarrationScript,
    logCampaignFailure,
    validateVideoCampaignInput,
    ELEVENLABS_VOICES: exports.ELEVENLABS_VOICES
};
//# sourceMappingURL=videoValidation.js.map