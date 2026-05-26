"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContact = validateContact;
exports.validateContactsBatch = validateContactsBatch;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
const emailVerificationService_1 = require("./emailVerificationService");
async function validateContact(contact) {
    const result = {
        isValid: false,
        confidence: 'low',
        checks: {
            companyWebsite: false,
            emailVerification: false,
            socialMedia: false,
        },
        reasons: [],
        score: 0,
    };
    let passedChecks = 0;
    const totalChecks = 3;
    if (contact.companyWebsite) {
        logger_1.logger.info(`Validating ${contact.name} - Checking company website...`);
        const websiteCheck = await checkCompanyWebsiteTeamPage(contact.name, contact.companyWebsite);
        result.checks.companyWebsite = websiteCheck.found;
        if (websiteCheck.found) {
            passedChecks++;
            result.reasons.push(`Found on company website: ${websiteCheck.pageUrl}`);
            result.score += 40;
        }
        else {
            result.reasons.push('Not found on company website team pages');
        }
    }
    if (contact.email) {
        logger_1.logger.info(`Validating ${contact.name} - Verifying email via SMTP...`);
        try {
            const emailCheck = await (0, emailVerificationService_1.verifyEmail)(contact.email);
            result.checks.emailVerification = emailCheck.isValid;
            if (emailCheck.isValid) {
                passedChecks++;
                result.reasons.push(`Email verified: ${emailCheck.reason}`);
                result.score += 40;
            }
            else {
                result.reasons.push(`Email verification failed: ${emailCheck.reason}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Email verification error:', error);
            result.reasons.push('Email verification error');
        }
    }
    logger_1.logger.info(`Validating ${contact.name} - Checking social media...`);
    const socialCheck = await checkSocialMediaPresence(contact);
    result.checks.socialMedia = socialCheck.found;
    if (socialCheck.found) {
        passedChecks++;
        result.reasons.push(`Social media verified: ${socialCheck.platforms.join(', ')}`);
        result.score += 20;
    }
    else {
        result.reasons.push('No social media presence found');
    }
    if (passedChecks >= 2) {
        result.isValid = true;
        result.confidence = passedChecks === 3 ? 'high' : 'medium';
    }
    else if (passedChecks === 1) {
        result.isValid = false;
        result.confidence = 'low';
    }
    else {
        result.isValid = false;
        result.confidence = 'low';
    }
    logger_1.logger.info(`Validation result for ${contact.name}: ${result.isValid ? '✅ VALID' : '❌ INVALID'} (${passedChecks}/${totalChecks} checks passed, score: ${result.score})`);
    return result;
}
async function checkCompanyWebsiteTeamPage(personName, websiteUrl) {
    try {
        if (!websiteUrl.startsWith('http')) {
            websiteUrl = 'https://' + websiteUrl;
        }
        const teamPagePaths = [
            '/team',
            '/about',
            '/about-us',
            '/our-team',
            '/people',
            '/leadership',
            '/company',
            '/company/team',
            '/about/team',
        ];
        const nameLower = personName.toLowerCase();
        const nameVariations = [
            nameLower,
            nameLower.replace(/\s+/g, ''),
            nameLower.split(' ')[0],
            nameLower.split(' ').slice(-1)[0],
        ];
        for (const path of teamPagePaths) {
            try {
                const url = new URL(path, websiteUrl).href;
                const response = await axios_1.default.get(url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    },
                    validateStatus: (status) => status < 500,
                });
                if (response.status === 200) {
                    const $ = cheerio.load(response.data);
                    const pageText = $('body').text().toLowerCase();
                    for (const variation of nameVariations) {
                        if (pageText.includes(variation)) {
                            logger_1.logger.info(`✅ Found "${personName}" on ${url}`);
                            return { found: true, pageUrl: url };
                        }
                    }
                }
            }
            catch (error) {
                continue;
            }
        }
        logger_1.logger.info(`⚠️  "${personName}" not found on company website team pages`);
        return { found: false };
    }
    catch (error) {
        logger_1.logger.error('Website team page check error:', error);
        return { found: false };
    }
}
async function checkSocialMediaPresence(contact) {
    const foundPlatforms = [];
    if (contact.twitter) {
        const twitterExists = await checkTwitterProfile(contact.twitter);
        if (twitterExists) {
            foundPlatforms.push('Twitter');
        }
    }
    if (contact.github) {
        const githubExists = await checkGitHubProfile(contact.github);
        if (githubExists) {
            foundPlatforms.push('GitHub');
        }
    }
    if (contact.linkedin && isValidLinkedInUrl(contact.linkedin)) {
        foundPlatforms.push('LinkedIn');
    }
    return {
        found: foundPlatforms.length > 0,
        platforms: foundPlatforms,
    };
}
async function checkTwitterProfile(twitterHandle) {
    try {
        const username = twitterHandle.replace(/^@/, '').split('/').pop();
        const response = await axios_1.default.head(`https://twitter.com/${username}`, {
            timeout: 3000,
            validateStatus: (status) => status < 500,
        });
        return response.status === 200;
    }
    catch (error) {
        return false;
    }
}
async function checkGitHubProfile(githubUsername) {
    try {
        const username = githubUsername.split('/').pop();
        const response = await axios_1.default.get(`https://api.github.com/users/${username}`, {
            timeout: 3000,
            validateStatus: (status) => status < 500,
        });
        return response.status === 200;
    }
    catch (error) {
        return false;
    }
}
function isValidLinkedInUrl(url) {
    const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    return linkedInPattern.test(url);
}
async function validateContactsBatch(contacts, options = {}) {
    const results = new Map();
    if (options.parallel) {
        const validations = await Promise.all(contacts.map(contact => validateContact(contact)));
        contacts.forEach((contact, index) => {
            results.set(contact.email, validations[index]);
        });
    }
    else {
        for (const contact of contacts) {
            const validation = await validateContact(contact);
            results.set(contact.email, validation);
            if (options.delayMs && contacts.indexOf(contact) < contacts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, options.delayMs));
            }
        }
    }
    return results;
}
//# sourceMappingURL=contactValidation.js.map