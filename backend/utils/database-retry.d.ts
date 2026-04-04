import { PrismaClient } from '@prisma/client';
export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
}
export declare function withRetry<T>(operation: () => Promise<T>, customOptions?: RetryOptions): Promise<T>;
export declare function createPrismaClient(options?: {
    logQueries?: boolean;
    connectionTimeout?: number;
}): PrismaClient;
export declare function testConnection(prisma: PrismaClient, retryOptions?: RetryOptions): Promise<boolean>;
export declare function disconnectPrisma(prisma: PrismaClient): Promise<void>;
export declare function initializeDatabase(): Promise<PrismaClient>;
export declare function getPrismaClient(): Promise<PrismaClient>;
//# sourceMappingURL=database-retry.d.ts.map