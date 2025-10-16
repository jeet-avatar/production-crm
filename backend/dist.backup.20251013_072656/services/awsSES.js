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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailViaSES = sendEmailViaSES;
exports.getSESStatistics = getSESStatistics;
exports.getSESQuota = getSESQuota;
const client_ses_1 = require("@aws-sdk/client-ses");
const credential_providers_1 = require("@aws-sdk/credential-providers");
if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required');
}
const sesClient = new client_ses_1.SESClient({
    region: process.env.AWS_REGION,
    credentials: (0, credential_providers_1.fromEnv)(),
});
async function sendEmailViaSES(params) {
    if (!process.env.SES_FROM_EMAIL && !params.from) {
        throw new Error('SES_FROM_EMAIL environment variable or params.from is required');
    }
    const fromEmail = params.from || process.env.SES_FROM_EMAIL;
    try {
        if (params.attachments && params.attachments.length > 0) {
            return await sendRawEmail(params, fromEmail);
        }
        else {
            const command = new client_ses_1.SendEmailCommand({
                Source: fromEmail,
                Destination: {
                    ToAddresses: params.to,
                    CcAddresses: params.cc,
                    BccAddresses: params.bcc,
                },
                Message: {
                    Subject: {
                        Data: params.subject,
                        Charset: 'UTF-8',
                    },
                    Body: {
                        Html: params.html
                            ? {
                                Data: params.html,
                                Charset: 'UTF-8',
                            }
                            : undefined,
                        Text: params.text
                            ? {
                                Data: params.text,
                                Charset: 'UTF-8',
                            }
                            : undefined,
                    },
                },
                ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
            });
            const response = await sesClient.send(command);
            return {
                success: true,
                messageId: response.MessageId,
            };
        }
    }
    catch (error) {
        console.error('SES Error:', error);
        throw new Error(`Failed to send email via SES: ${error.message}`);
    }
}
async function sendRawEmail(params, fromEmail) {
    const boundary = `----=_Part_${Date.now()}`;
    let rawMessage = `From: ${fromEmail}\r\n`;
    rawMessage += `To: ${params.to.join(', ')}\r\n`;
    if (params.cc)
        rawMessage += `Cc: ${params.cc.join(', ')}\r\n`;
    if (params.replyTo)
        rawMessage += `Reply-To: ${params.replyTo}\r\n`;
    rawMessage += `Subject: ${params.subject}\r\n`;
    rawMessage += `MIME-Version: 1.0\r\n`;
    rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    rawMessage += `--${boundary}\r\n`;
    if (params.html) {
        rawMessage += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
        rawMessage += `${params.html}\r\n\r\n`;
    }
    else if (params.text) {
        rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
        rawMessage += `${params.text}\r\n\r\n`;
    }
    if (params.attachments) {
        for (const attachment of params.attachments) {
            rawMessage += `--${boundary}\r\n`;
            rawMessage += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
            rawMessage += `Content-Transfer-Encoding: base64\r\n`;
            rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
            rawMessage += attachment.content.toString('base64') + '\r\n\r\n';
        }
    }
    rawMessage += `--${boundary}--`;
    const command = new client_ses_1.SendRawEmailCommand({
        RawMessage: {
            Data: Buffer.from(rawMessage),
        },
        Source: fromEmail,
        Destinations: [...params.to, ...(params.cc || []), ...(params.bcc || [])],
    });
    const response = await sesClient.send(command);
    return {
        success: true,
        messageId: response.MessageId,
    };
}
async function getSESStatistics() {
    const { GetSendStatisticsCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-ses')));
    const command = new GetSendStatisticsCommand({});
    try {
        const response = await sesClient.send(command);
        return response.SendDataPoints;
    }
    catch (error) {
        console.error('Failed to get SES statistics:', error);
        throw error;
    }
}
async function getSESQuota() {
    const { GetSendQuotaCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-ses')));
    const command = new GetSendQuotaCommand({});
    try {
        const response = await sesClient.send(command);
        return {
            max24HourSend: response.Max24HourSend,
            maxSendRate: response.MaxSendRate,
            sentLast24Hours: response.SentLast24Hours,
        };
    }
    catch (error) {
        console.error('Failed to get SES quota:', error);
        throw error;
    }
}
//# sourceMappingURL=awsSES.js.map