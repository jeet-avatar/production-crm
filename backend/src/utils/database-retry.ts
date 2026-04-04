/**
 * Database Connection Retry Logic
 * Enterprise-grade connection management for Prisma Client
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Maximum retry attempts
 * - Connection timeout handling
 * - Error logging and monitoring
 */

import { PrismaClient } from '@prisma/client';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  onRetry: (attempt, error) => {
    console.warn(`[DB Retry] Attempt ${attempt} failed:`, error.message);
  },
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff
 */
const calculateDelay = (
  attempt: number,
  options: Required<RetryOptions>
): number => {
  const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelayMs);
};

/**
 * Execute database operation with retry logic
 *
 * @example
 * ```typescript
 * const users = await withRetry(
 *   () => prisma.user.findMany(),
 *   { maxRetries: 3 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  customOptions: RetryOptions = {}
): Promise<T> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...customOptions };
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retriable errors
      if (!isRetriableError(error as Error)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt > options.maxRetries) {
        throw error;
      }

      // Call onRetry callback
      options.onRetry(attempt, error as Error);

      // Wait before retrying with exponential backoff
      const delay = calculateDelay(attempt, options);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

/**
 * Determine if an error is retriable
 */
function isRetriableError(error: Error): boolean {
  const retriableErrorCodes = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
    'EPIPE',
    'P1001', // Prisma: Can't reach database server
    'P1002', // Prisma: Database server timeout
    'P1008', // Prisma: Operations timed out
    'P1017', // Prisma: Server has closed the connection
  ];

  const errorMessage = error.message || '';
  const errorCode = (error as any).code || '';

  return (
    retriableErrorCodes.some(code =>
      errorCode === code || errorMessage.includes(code)
    ) ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ECONNREFUSED')
  );
}

/**
 * Create Prisma Client with enterprise-grade configuration
 */
export function createPrismaClient(options: {
  logQueries?: boolean;
  connectionTimeout?: number;
}= {}): PrismaClient {
  const { logQueries = false, connectionTimeout = 10000 } = options;

  return new PrismaClient({
    log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

/**
 * Test database connection with retry
 */
export async function testConnection(
  prisma: PrismaClient,
  retryOptions?: RetryOptions
): Promise<boolean> {
  try {
    await withRetry(
      async () => {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      },
      retryOptions
    );
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('⚠️ Error disconnecting from database:', error);
  }
}

/**
 * Example usage in application startup
 */
export async function initializeDatabase(): Promise<PrismaClient> {
  const prisma = createPrismaClient({
    logQueries: process.env.NODE_ENV === 'development',
    connectionTimeout: 10000,
  });

  // Test connection on startup
  const isConnected = await testConnection(prisma, {
    maxRetries: 5,
    initialDelayMs: 200,
    onRetry: (attempt, error) => {
      console.warn(`[DB Init] Connection attempt ${attempt} failed: ${error.message}`);
    },
  });

  if (!isConnected) {
    throw new Error('Failed to connect to database after multiple attempts');
  }

  // Handle process termination
  process.on('beforeExit', async () => {
    await disconnectPrisma(prisma);
  });

  return prisma;
}

// Export singleton instance for application use
let prismaInstance: PrismaClient | null = null;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (!prismaInstance) {
    prismaInstance = await initializeDatabase();
  }
  return prismaInstance;
}
