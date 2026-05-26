"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = void 0;
exports.encryptCredential = encryptCredential;
exports.decryptCredential = decryptCredential;
exports.maskCredential = maskCredential;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
function getEncryptionKey() {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!key) {
        console.warn('⚠️  CREDENTIAL_ENCRYPTION_KEY not set. Using default key. SET THIS IN PRODUCTION!');
        return crypto_1.default.scryptSync('default-credential-key-change-in-production', 'salt', KEY_LENGTH);
    }
    return crypto_1.default.scryptSync(key, 'credential-salt', KEY_LENGTH);
}
function encryptCredential(plainText) {
    try {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const salt = crypto_1.default.randomBytes(SALT_LENGTH);
        const key = getEncryptionKey();
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        const result = Buffer.concat([salt, iv, tag, encrypted]);
        return result.toString('base64');
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Failed to encrypt credential: ${error.message}`);
    }
}
function decryptCredential(encryptedText) {
    try {
        const data = Buffer.from(encryptedText, 'base64');
        const salt = data.subarray(0, SALT_LENGTH);
        const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const key = getEncryptionKey();
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        console.error('Decryption error:', error);
        throw new Error(`Failed to decrypt credential: ${error.message}`);
    }
}
function maskCredential(value) {
    if (!value || value.length <= 4) {
        return '****';
    }
    return '*'.repeat(value.length - 4) + value.slice(-4);
}
class CredentialService {
    async createCredential(data) {
        const encryptedValue = encryptCredential(data.value);
        return await prisma.systemCredential.create({
            data: {
                name: data.name,
                type: data.type,
                service: data.service,
                encryptedValue,
                expiresAt: data.expiresAt,
                metadata: data.metadata,
                createdBy: data.createdBy,
            },
        });
    }
    async getAllCredentials() {
        const credentials = await prisma.systemCredential.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        return credentials.map((cred) => ({
            ...cred,
            maskedValue: maskCredential(decryptCredential(cred.encryptedValue)),
            encryptedValue: undefined,
        }));
    }
    async getCredentialById(id) {
        const credential = await prisma.systemCredential.findUnique({
            where: { id },
        });
        if (!credential) {
            throw new Error('Credential not found');
        }
        const decryptedValue = decryptCredential(credential.encryptedValue);
        return {
            ...credential,
            value: decryptedValue,
            encryptedValue: undefined,
        };
    }
    async getCredentialByService(service, type) {
        const where = { service, isActive: true };
        if (type)
            where.type = type;
        const credential = await prisma.systemCredential.findFirst({
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!credential) {
            return null;
        }
        const decryptedValue = decryptCredential(credential.encryptedValue);
        return {
            ...credential,
            value: decryptedValue,
        };
    }
    async updateCredential(id, data) {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.value !== undefined)
            updateData.encryptedValue = encryptCredential(data.value);
        if (data.expiresAt !== undefined)
            updateData.expiresAt = data.expiresAt;
        if (data.metadata !== undefined)
            updateData.metadata = data.metadata;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        return await prisma.systemCredential.update({
            where: { id },
            data: updateData,
        });
    }
    async deleteCredential(id) {
        return await prisma.systemCredential.delete({
            where: { id },
        });
    }
    async markAsUsed(id) {
        return await prisma.systemCredential.update({
            where: { id },
            data: {
                lastUsed: new Date(),
            },
        });
    }
    async testCredential(id) {
        const credential = await this.getCredentialById(id);
        if (!credential.value || credential.value.trim() === '') {
            return {
                success: false,
                message: 'Credential value is empty',
            };
        }
        return {
            success: true,
            message: 'Credential is valid and can be decrypted',
        };
    }
    async getExpiringCredentials() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return await prisma.systemCredential.findMany({
            where: {
                expiresAt: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
                isActive: true,
            },
            orderBy: {
                expiresAt: 'asc',
            },
        });
    }
}
exports.CredentialService = CredentialService;
exports.default = new CredentialService();
//# sourceMappingURL=credential.service.js.map