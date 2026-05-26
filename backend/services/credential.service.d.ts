export declare function encryptCredential(plainText: string): string;
export declare function decryptCredential(encryptedText: string): string;
export declare function maskCredential(value: string): string;
export declare class CredentialService {
    createCredential(data: {
        name: string;
        type: string;
        service: string;
        value: string;
        expiresAt?: Date;
        metadata?: any;
        createdBy: string;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    getAllCredentials(): Promise<{
        maskedValue: string;
        encryptedValue: any;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        lastUsed: Date | null;
        createdBy: string;
    }[]>;
    getCredentialById(id: string): Promise<{
        value: string;
        encryptedValue: any;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    getCredentialByService(service: string, type?: string): Promise<{
        value: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    updateCredential(id: string, data: {
        name?: string;
        value?: string;
        expiresAt?: Date;
        metadata?: any;
        isActive?: boolean;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    deleteCredential(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    markAsUsed(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }>;
    testCredential(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getExpiringCredentials(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        expiresAt: Date | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        type: string;
        service: string;
        encryptedValue: string;
        lastUsed: Date | null;
        createdBy: string;
    }[]>;
}
declare const _default: CredentialService;
export default _default;
//# sourceMappingURL=credential.service.d.ts.map