"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmailFormat = validateEmailFormat;
exports.validateDomain = validateDomain;
exports.validateMxRecords = validateMxRecords;
exports.verifyEmailSMTP = verifyEmailSMTP;
exports.verifyEmail = verifyEmail;
exports.verifyEmailsBatch = verifyEmailsBatch;
exports.quickVerifyEmail = quickVerifyEmail;
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const net_1 = __importDefault(require("net"));
const logger_1 = require("../utils/logger");
const resolveMx = (0, util_1.promisify)(dns_1.default.resolveMx);
function validateEmailFormat(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
async function validateDomain(domain) {
    try {
        await (0, util_1.promisify)(dns_1.default.resolve4)(domain);
        return true;
    }
    catch {
        try {
            await (0, util_1.promisify)(dns_1.default.resolve6)(domain);
            return true;
        }
        catch {
            return false;
        }
    }
}
async function validateMxRecords(domain) {
    try {
        const mxRecords = await resolveMx(domain);
        return {
            valid: mxRecords.length > 0,
            mxRecords: mxRecords.sort((a, b) => a.priority - b.priority),
        };
    }
    catch {
        return { valid: false };
    }
}
async function verifyEmailSMTP(email) {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
        return { valid: false, reason: 'Invalid email format' };
    }
    try {
        const mxResult = await validateMxRecords(domain);
        if (!mxResult.valid || !mxResult.mxRecords || mxResult.mxRecords.length === 0) {
            return { valid: false, reason: 'No MX records found' };
        }
        const mxServer = mxResult.mxRecords[0].exchange;
        return new Promise((resolve) => {
            const socket = net_1.default.createConnection(25, mxServer);
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve({ valid: false, reason: 'SMTP timeout' });
            }, 10000);
            let stage = 0;
            let buffer = '';
            socket.on('data', (data) => {
                buffer += data.toString();
                if (!buffer.includes('\r\n'))
                    return;
                const response = buffer.trim();
                buffer = '';
                try {
                    if (stage === 0 && response.startsWith('220')) {
                        socket.write('HELO verify.brandmonkz.com\r\n');
                        stage = 1;
                    }
                    else if (stage === 1 && response.startsWith('250')) {
                        socket.write('MAIL FROM:<verify@brandmonkz.com>\r\n');
                        stage = 2;
                    }
                    else if (stage === 2 && response.startsWith('250')) {
                        socket.write(`RCPT TO:<${email}>\r\n`);
                        stage = 3;
                    }
                    else if (stage === 3) {
                        clearTimeout(timeout);
                        socket.write('QUIT\r\n');
                        socket.end();
                        if (response.startsWith('250') || response.startsWith('251')) {
                            resolve({ valid: true });
                        }
                        else if (response.startsWith('550') || response.startsWith('551')) {
                            resolve({ valid: false, reason: 'Mailbox does not exist' });
                        }
                        else if (response.startsWith('450') || response.startsWith('451')) {
                            resolve({ valid: true, reason: 'Greylisted (possibly valid)' });
                        }
                        else {
                            resolve({ valid: false, reason: `Unknown SMTP response: ${response}` });
                        }
                    }
                }
                catch (error) {
                    clearTimeout(timeout);
                    socket.destroy();
                    resolve({ valid: false, reason: 'SMTP protocol error' });
                }
            });
            socket.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ valid: false, reason: `Connection error: ${error.message}` });
            });
            socket.on('timeout', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve({ valid: false, reason: 'Connection timeout' });
            });
        });
    }
    catch (error) {
        return { valid: false, reason: `SMTP error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
}
async function verifyEmail(email) {
    const result = {
        email,
        isValid: false,
        confidence: 'invalid',
        checks: {
            format: false,
            domain: false,
            mxRecords: false,
            smtpCheck: false,
        },
    };
    try {
        result.checks.format = validateEmailFormat(email);
        if (!result.checks.format) {
            result.reason = 'Invalid email format';
            return result;
        }
        const domain = email.split('@')[1];
        result.checks.domain = await validateDomain(domain);
        if (!result.checks.domain) {
            result.reason = 'Domain does not exist';
            return result;
        }
        const mxResult = await validateMxRecords(domain);
        result.checks.mxRecords = mxResult.valid;
        if (!result.checks.mxRecords) {
            result.reason = 'Domain cannot receive emails (no MX records)';
            return result;
        }
        const smtpResult = await verifyEmailSMTP(email);
        result.checks.smtpCheck = smtpResult.valid;
        if (smtpResult.valid) {
            result.isValid = true;
            result.confidence = 'high';
            result.reason = smtpResult.reason || 'Email verified via SMTP';
        }
        else {
            result.confidence = 'medium';
            result.reason = smtpResult.reason || 'Could not verify via SMTP';
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error('Email verification error:', error);
        result.reason = error instanceof Error ? error.message : 'Unknown error';
        return result;
    }
}
async function verifyEmailsBatch(emails, delayMs = 1000) {
    const results = [];
    for (const email of emails) {
        const result = await verifyEmail(email);
        results.push(result);
        if (emails.indexOf(email) < emails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
}
async function quickVerifyEmail(email) {
    const result = {
        email,
        isValid: false,
        confidence: 'invalid',
        checks: {
            format: false,
            domain: false,
            mxRecords: false,
            smtpCheck: false,
        },
    };
    result.checks.format = validateEmailFormat(email);
    if (!result.checks.format) {
        result.reason = 'Invalid format';
        return result;
    }
    const domain = email.split('@')[1];
    result.checks.domain = await validateDomain(domain);
    result.checks.mxRecords = (await validateMxRecords(domain)).valid;
    if (result.checks.domain && result.checks.mxRecords) {
        result.isValid = true;
        result.confidence = 'medium';
        result.reason = 'Quick verification (domain & MX valid)';
    }
    else {
        result.reason = result.checks.domain ? 'No MX records' : 'Domain invalid';
    }
    return result;
}
//# sourceMappingURL=emailVerificationService.js.map