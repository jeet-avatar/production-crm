"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.learnFromVerifiedEmail = learnFromVerifiedEmail;
exports.getLearnedPatterns = getLearnedPatterns;
exports.getLearnedPatternsFromSimilarCompanies = getLearnedPatternsFromSimilarCompanies;
exports.generateSmartEmail = generateSmartEmail;
exports.generateSmartEmailsBatch = generateSmartEmailsBatch;
exports.createPatternHistoryTable = createPatternHistoryTable;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const emailPatternGenerator_1 = require("../utils/emailPatternGenerator");
const emailVerificationService_1 = require("./emailVerificationService");
const prisma = new client_1.PrismaClient();
function extractPatternFromEmail(email, firstName, lastName) {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain)
        return null;
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const firstInitial = first.charAt(0);
    const local = localPart.toLowerCase();
    if (local === `${first}.${last}`)
        return 'firstname.lastname';
    if (local === `${first}${last}`)
        return 'firstnamelastname';
    if (local === `${first}`)
        return 'firstname';
    if (local === `${firstInitial}.${last}`)
        return 'f.lastname';
    if (local === `${firstInitial}${last}`)
        return 'flastname';
    if (local === `${first}_${last}`)
        return 'firstname_lastname';
    if (local === `${last}.${first}`)
        return 'lastname.firstname';
    if (local === `${firstInitial}-${last}`)
        return 'f-lastname';
    return 'custom';
}
async function learnFromVerifiedEmail(companyId, email, firstName, lastName) {
    try {
        const pattern = extractPatternFromEmail(email, firstName, lastName);
        if (!pattern)
            return;
        const domain = email.split('@')[1];
        await prisma.$executeRaw `
      INSERT INTO email_pattern_history (
        company_id,
        domain,
        pattern,
        success_count,
        total_attempts,
        last_used
      ) VALUES (
        ${companyId},
        ${domain},
        ${pattern},
        1,
        1,
        NOW()
      )
      ON CONFLICT (company_id, pattern)
      DO UPDATE SET
        success_count = email_pattern_history.success_count + 1,
        total_attempts = email_pattern_history.total_attempts + 1,
        last_used = NOW()
    `;
        logger_1.logger.info(`Learned email pattern for company ${companyId}: ${pattern}`);
    }
    catch (error) {
        logger_1.logger.error('Error learning from verified email:', error);
    }
}
async function getLearnedPatterns(companyId) {
    try {
        const patterns = await prisma.$queryRaw `
      SELECT
        pattern,
        CAST(success_count AS FLOAT) / NULLIF(total_attempts, 0) as success_rate,
        total_attempts,
        last_used
      FROM email_pattern_history
      WHERE company_id = ${companyId}
      ORDER BY
        (CAST(success_count AS FLOAT) / NULLIF(total_attempts, 0)) DESC,
        total_attempts DESC
    `;
        return patterns || [];
    }
    catch (error) {
        return [];
    }
}
async function getLearnedPatternsFromSimilarCompanies(domain, excludeCompanyId) {
    try {
        const patterns = await prisma.$queryRaw `
      SELECT
        pattern,
        SUM(success_count)::FLOAT / NULLIF(SUM(total_attempts), 0) as success_rate,
        SUM(total_attempts) as total_attempts,
        MAX(last_used) as last_used
      FROM email_pattern_history
      WHERE domain = ${domain}
        ${excludeCompanyId ? `AND company_id != ${excludeCompanyId}` : ''}
      GROUP BY pattern
      ORDER BY
        SUM(success_count)::FLOAT / NULLIF(SUM(total_attempts), 0) DESC,
        SUM(total_attempts) DESC
    `;
        return patterns || [];
    }
    catch (error) {
        return [];
    }
}
async function generateSmartEmail(firstName, lastName, companyId, domain, verify = false) {
    const learnedPatterns = await getLearnedPatterns(companyId);
    if (learnedPatterns.length > 0) {
        const bestPattern = learnedPatterns[0];
        const email = applyPattern(firstName, lastName, domain, bestPattern.pattern);
        if (email) {
            logger_1.logger.info(`Using learned pattern for company: ${bestPattern.pattern} (${bestPattern.successRate * 100}% success rate)`);
            if (verify) {
                const verification = await (0, emailVerificationService_1.quickVerifyEmail)(email);
                return {
                    email,
                    pattern: bestPattern.pattern,
                    confidence: verification.isValid ? 'high' : 'medium',
                    verified: verification.isValid,
                };
            }
            return {
                email,
                pattern: bestPattern.pattern,
                confidence: bestPattern.successRate > 0.7 ? 'high' : 'medium',
            };
        }
    }
    const similarPatterns = await getLearnedPatternsFromSimilarCompanies(domain, companyId);
    if (similarPatterns.length > 0) {
        const bestPattern = similarPatterns[0];
        const email = applyPattern(firstName, lastName, domain, bestPattern.pattern);
        if (email) {
            logger_1.logger.info(`Using pattern from similar companies: ${bestPattern.pattern}`);
            if (verify) {
                const verification = await (0, emailVerificationService_1.quickVerifyEmail)(email);
                return {
                    email,
                    pattern: bestPattern.pattern,
                    confidence: verification.isValid ? 'high' : 'medium',
                    verified: verification.isValid,
                };
            }
            return {
                email,
                pattern: bestPattern.pattern,
                confidence: 'medium',
            };
        }
    }
    const patterns = (0, emailPatternGenerator_1.generateEmailPatterns)(firstName, lastName, domain);
    const bestGuess = patterns[0];
    if (verify && bestGuess) {
        const verification = await (0, emailVerificationService_1.quickVerifyEmail)(bestGuess.email);
        return {
            email: bestGuess.email,
            pattern: bestGuess.pattern,
            confidence: verification.isValid ? 'medium' : 'low',
            verified: verification.isValid,
        };
    }
    return bestGuess || {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        pattern: 'firstname.lastname',
        confidence: 'low',
    };
}
function applyPattern(firstName, lastName, domain, pattern) {
    const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const firstInitial = first.charAt(0);
    switch (pattern) {
        case 'firstname.lastname':
            return `${first}.${last}@${domain}`;
        case 'firstnamelastname':
            return `${first}${last}@${domain}`;
        case 'firstname':
            return `${first}@${domain}`;
        case 'f.lastname':
            return `${firstInitial}.${last}@${domain}`;
        case 'flastname':
            return `${firstInitial}${last}@${domain}`;
        case 'firstname_lastname':
            return `${first}_${last}@${domain}`;
        case 'lastname.firstname':
            return `${last}.${first}@${domain}`;
        case 'f-lastname':
            return `${firstInitial}-${last}@${domain}`;
        default:
            return null;
    }
}
async function generateSmartEmailsBatch(contacts, verify = false) {
    const results = [];
    for (const contact of contacts) {
        const result = await generateSmartEmail(contact.firstName, contact.lastName, contact.companyId, contact.domain, verify);
        results.push({
            ...contact,
            ...result,
        });
        if (verify && contacts.indexOf(contact) < contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return results;
}
async function createPatternHistoryTable() {
    try {
        await prisma.$executeRaw `
      CREATE TABLE IF NOT EXISTS email_pattern_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        pattern TEXT NOT NULL,
        success_count INTEGER DEFAULT 0,
        total_attempts INTEGER DEFAULT 0,
        last_used TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(company_id, pattern)
      )
    `;
        await prisma.$executeRaw `
      CREATE INDEX IF NOT EXISTS idx_pattern_history_company
      ON email_pattern_history(company_id)
    `;
        await prisma.$executeRaw `
      CREATE INDEX IF NOT EXISTS idx_pattern_history_domain
      ON email_pattern_history(domain)
    `;
        logger_1.logger.info('Email pattern history table created successfully');
    }
    catch (error) {
        logger_1.logger.error('Error creating pattern history table:', error);
    }
}
//# sourceMappingURL=emailPatternLearning.js.map