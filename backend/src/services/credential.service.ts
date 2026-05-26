import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!key) {
    console.warn('⚠️  CREDENTIAL_ENCRYPTION_KEY not set. Using default key. SET THIS IN PRODUCTION!');
    // Default key for development only - MUST be changed in production
    return crypto.scryptSync('default-credential-key-change-in-production', 'salt', KEY_LENGTH);
  }

  // Derive key from environment variable
  return crypto.scryptSync(key, 'credential-salt', KEY_LENGTH);
}

/**
 * Encrypt a credential value
 * @param plainText - The credential value to encrypt
 * @returns Encrypted value as base64 string
 */
export function encryptCredential(plainText: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getEncryptionKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    return result.toString('base64');
  } catch (error: any) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt credential: ${error.message}`);
  }
}

/**
 * Decrypt a credential value
 * @param encryptedText - The encrypted credential value (base64)
 * @returns Decrypted plaintext value
 */
export function decryptCredential(encryptedText: string): string {
  try {
    const data = Buffer.from(encryptedText, 'base64');

    // Extract components
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error: any) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt credential: ${error.message}`);
  }
}

/**
 * Mask credential value for display (show only last 4 characters)
 * @param value - The credential value
 * @returns Masked value
 */
export function maskCredential(value: string): string {
  if (!value || value.length <= 4) {
    return '****';
  }
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/**
 * Credential Service Class
 */
export class CredentialService {
  /**
   * Create a new credential
   */
  async createCredential(data: {
    name: string;
    type: string;
    service: string;
    value: string;
    expiresAt?: Date;
    metadata?: any;
    createdBy: string;
  }) {
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

  /**
   * Get all credentials (with masked values)
   */
  async getAllCredentials() {
    const credentials = await prisma.systemCredential.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return with masked values
    return credentials.map((cred) => ({
      ...cred,
      maskedValue: maskCredential(decryptCredential(cred.encryptedValue)),
      encryptedValue: undefined, // Don't expose encrypted value
    }));
  }

  /**
   * Get credential by ID (with actual decrypted value)
   */
  async getCredentialById(id: string) {
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

  /**
   * Get credential by service (for internal use)
   */
  async getCredentialByService(service: string, type?: string) {
    const where: any = { service, isActive: true };
    if (type) where.type = type;

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

  /**
   * Update a credential
   */
  async updateCredential(id: string, data: {
    name?: string;
    value?: string;
    expiresAt?: Date;
    metadata?: any;
    isActive?: boolean;
  }) {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.encryptedValue = encryptCredential(data.value);
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return await prisma.systemCredential.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a credential
   */
  async deleteCredential(id: string) {
    return await prisma.systemCredential.delete({
      where: { id },
    });
  }

  /**
   * Update last used timestamp
   */
  async markAsUsed(id: string) {
    return await prisma.systemCredential.update({
      where: { id },
      data: {
        lastUsed: new Date(),
      },
    });
  }

  /**
   * Test credential connection (placeholder - implement per service type)
   */
  async testCredential(id: string): Promise<{ success: boolean; message: string }> {
    const credential = await this.getCredentialById(id);

    // Basic validation
    if (!credential.value || credential.value.trim() === '') {
      return {
        success: false,
        message: 'Credential value is empty',
      };
    }

    // TODO: Implement actual connection tests per service type
    // For now, just verify it can be decrypted
    return {
      success: true,
      message: 'Credential is valid and can be decrypted',
    };
  }

  /**
   * Get expiring credentials (within 30 days)
   */
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

export default new CredentialService();
