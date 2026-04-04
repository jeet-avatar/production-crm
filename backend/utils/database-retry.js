"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
exports.createPrismaClient = createPrismaClient;
exports.testConnection = testConnection;
exports.disconnectPrisma = disconnectPrisma;
exports.initializeDatabase = initializeDatabase;
exports.getPrismaClient = getPrismaClient;
const client_1 = require("@prisma/client");
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    onRetry: (attempt, error) => {
        console.warn(`[DB Retry] Attempt ${attempt} failed:`, error.message);
    },
};
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const calculateDelay = (attempt, options) => {
    const delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
    return Math.min(delay, options.maxDelayMs);
};
async function withRetry(operation, customOptions = {}) {
    const options = { ...DEFAULT_RETRY_OPTIONS, ...customOptions };
    let lastError;
    for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (!isRetriableError(error)) {
                throw error;
            }
            if (attempt > options.maxRetries) {
                throw error;
            }
            options.onRetry(attempt, error);
            const delay = calculateDelay(attempt, options);
            await sleep(delay);
        }
    }
    throw lastError;
}
function isRetriableError(error) {
    const retriableErrorCodes = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNRESET',
        'EPIPE',
        'P1001',
        'P1002',
        'P1008',
        'P1017',
    ];
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    return (retriableErrorCodes.some(code => errorCode === code || errorMessage.includes(code)) ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED'));
}
function createPrismaClient(options = {}) {
    const { logQueries = false, connectionTimeout = 10000 } = options;
    return new client_1.PrismaClient({
        log: logQueries ? ['query', 'info', 'warn', 'error'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
}
async function testConnection(prisma, retryOptions) {
    try {
        await withRetry(async () => {
            await prisma.$queryRaw `SELECT 1`;
            return true;
        }, retryOptions);
        console.log('✅ Database connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
async function disconnectPrisma(prisma) {
    try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
    }
    catch (error) {
        console.error('⚠️ Error disconnecting from database:', error);
    }
}
async function initializeDatabase() {
    const prisma = createPrismaClient({
        logQueries: process.env.NODE_ENV === 'development',
        connectionTimeout: 10000,
    });
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
    process.on('beforeExit', async () => {
        await disconnectPrisma(prisma);
    });
    return prisma;
}
let prismaInstance = null;
async function getPrismaClient() {
    if (!prismaInstance) {
        prismaInstance = await initializeDatabase();
    }
    return prismaInstance;
}
//# sourceMappingURL=database-retry.js.map