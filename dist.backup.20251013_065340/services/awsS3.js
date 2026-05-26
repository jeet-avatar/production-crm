"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = uploadToS3;
exports.getFromS3 = getFromS3;
exports.deleteFromS3 = deleteFromS3;
exports.listS3Files = listS3Files;
exports.getPresignedUrl = getPresignedUrl;
exports.getPresignedUploadUrl = getPresignedUploadUrl;
exports.streamToBuffer = streamToBuffer;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const credential_providers_1 = require("@aws-sdk/credential-providers");
if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is required');
}
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: (0, credential_providers_1.fromEnv)(),
});
async function uploadToS3(params) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: params.bucket,
            Key: params.key,
            Body: params.body,
            ContentType: params.contentType,
            Metadata: params.metadata,
        });
        const response = await s3Client.send(command);
        return {
            success: true,
            etag: response.ETag,
            location: `https://${params.bucket}.s3.amazonaws.com/${params.key}`,
        };
    }
    catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Failed to upload to S3: ${error.message}`);
    }
}
async function getFromS3(bucket, key) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const response = await s3Client.send(command);
        return {
            body: response.Body,
            contentType: response.ContentType,
            metadata: response.Metadata,
        };
    }
    catch (error) {
        console.error('S3 Get Error:', error);
        throw new Error(`Failed to get from S3: ${error.message}`);
    }
}
async function deleteFromS3(bucket, key) {
    try {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        await s3Client.send(command);
        return { success: true };
    }
    catch (error) {
        console.error('S3 Delete Error:', error);
        throw new Error(`Failed to delete from S3: ${error.message}`);
    }
}
async function listS3Files(bucket, prefix) {
    try {
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
        });
        const response = await s3Client.send(command);
        return response.Contents || [];
    }
    catch (error) {
        console.error('S3 List Error:', error);
        throw new Error(`Failed to list S3 files: ${error.message}`);
    }
}
async function getPresignedUrl(bucket, key, expiresIn = 3600) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        console.error('S3 Presigned URL Error:', error);
        throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
}
async function getPresignedUploadUrl(bucket, key, contentType, expiresIn = 3600) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        console.error('S3 Presigned Upload URL Error:', error);
        throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
    }
}
async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
//# sourceMappingURL=awsS3.js.map