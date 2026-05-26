"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
exports.sendBulkSMS = sendBulkSMS;
exports.setSMSAttributes = setSMSAttributes;
exports.getSMSAttributes = getSMSAttributes;
exports.publishToTopic = publishToTopic;
const client_sns_1 = require("@aws-sdk/client-sns");
const credential_providers_1 = require("@aws-sdk/credential-providers");
if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required');
}
const snsClient = new client_sns_1.SNSClient({
    region: process.env.AWS_REGION,
    credentials: (0, credential_providers_1.fromEnv)(),
});
async function sendSMS(params) {
    try {
        const command = new client_sns_1.PublishCommand({
            PhoneNumber: params.phoneNumber,
            Message: params.message,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: params.smsType || 'Transactional',
                },
                ...(params.senderID
                    ? {
                        'AWS.SNS.SMS.SenderID': {
                            DataType: 'String',
                            StringValue: params.senderID,
                        },
                    }
                    : {}),
            },
        });
        const response = await snsClient.send(command);
        return {
            success: true,
            messageId: response.MessageId,
        };
    }
    catch (error) {
        console.error('SNS SMS Error:', error);
        throw new Error(`Failed to send SMS via SNS: ${error.message}`);
    }
}
async function sendBulkSMS(phoneNumbers, message, smsType) {
    const results = await Promise.allSettled(phoneNumbers.map((phoneNumber) => sendSMS({
        phoneNumber,
        message,
        smsType,
    })));
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return {
        total: phoneNumbers.length,
        successful,
        failed,
        results,
    };
}
async function setSMSAttributes(attributes) {
    try {
        const command = new client_sns_1.SetSMSAttributesCommand({
            attributes,
        });
        await snsClient.send(command);
        return { success: true };
    }
    catch (error) {
        console.error('Failed to set SMS attributes:', error);
        throw error;
    }
}
async function getSMSAttributes() {
    try {
        const command = new client_sns_1.GetSMSAttributesCommand({});
        const response = await snsClient.send(command);
        return response.attributes;
    }
    catch (error) {
        console.error('Failed to get SMS attributes:', error);
        throw error;
    }
}
async function publishToTopic(topicArn, message, subject) {
    try {
        const command = new client_sns_1.PublishCommand({
            TopicArn: topicArn,
            Message: message,
            Subject: subject,
        });
        const response = await snsClient.send(command);
        return {
            success: true,
            messageId: response.MessageId,
        };
    }
    catch (error) {
        console.error('SNS Topic Publish Error:', error);
        throw new Error(`Failed to publish to SNS topic: ${error.message}`);
    }
}
//# sourceMappingURL=awsSNS.js.map