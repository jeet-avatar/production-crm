"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("./app");
const client_1 = require("@prisma/client");
const logger_1 = require("./utils/logger");
const dotenvResult = dotenv_1.default.config({ path: '/home/ec2-user/crm-backend/backend/.env' });
console.log('🔧 Environment loaded:', dotenvResult.error ? dotenvResult.error.message : 'SUCCESS');
console.log('🔧 SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('🔧 SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');
const PORT = process.env.PORT || 3000;
const prisma = new client_1.PrismaClient();
async function startServer() {
    try {
        await prisma.$connect();
        logger_1.logger.info('✅ Database connected successfully');
        const server = app_1.app.listen(PORT, () => {
            logger_1.logger.info(`🚀 Server running on port ${PORT}`);
            logger_1.logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
            logger_1.logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        });
        process.on('SIGTERM', async () => {
            logger_1.logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
            });
            await prisma.$disconnect();
            logger_1.logger.info('Database connection closed');
            process.exit(0);
        });
        process.on('SIGINT', async () => {
            logger_1.logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
            });
            await prisma.$disconnect();
            logger_1.logger.info('Database connection closed');
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();
//# sourceMappingURL=server.js.map