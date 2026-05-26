"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const client_1 = require("@prisma/client");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const passport_1 = __importDefault(require("./config/passport"));
// Import security guards
const securityHeaders_1 = require("./middleware/securityHeaders");
const securityGuards_1 = require("./middleware/securityGuards");
const csrfProtection_1 = require("./middleware/csrfProtection");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const companies_1 = __importDefault(require("./routes/companies"));
const deals_1 = __importDefault(require("./routes/deals"));
const activities_1 = __importDefault(require("./routes/activities"));
const campaigns_1 = __importDefault(require("./routes/campaigns"));
const automations_1 = __importDefault(require("./routes/automations"));
const emailTemplates_1 = __importDefault(require("./routes/emailTemplates"));
const tags_1 = __importDefault(require("./routes/tags"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const enrichment_1 = __importDefault(require("./routes/enrichment"));
const emailComposer_1 = __importDefault(require("./routes/emailComposer"));
const csvImport_1 = __importDefault(require("./routes/csvImport"));
const positions_1 = __importDefault(require("./routes/positions"));
const emailServers_1 = __importDefault(require("./routes/emailServers"));
const emailTracking_1 = __importDefault(require("./routes/emailTracking"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const pricing_1 = __importDefault(require("./routes/pricing"));
const admin_1 = __importDefault(require("./routes/admin"));
const verification_1 = __importDefault(require("./routes/verification"));
// import godaddyRoutes from './routes/godaddy'; // Disabled - service not implemented
const app = (0, express_1.default)();
exports.app = app;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
// Trust proxy - required for rate limiting behind Nginx reverse proxy
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
/**
 * @security CORS Configuration
 * @description Environment-based CORS to restrict origins based on deployment environment
 * @protection Prevents unauthorized cross-origin requests in production
 */
const getAllowedOrigins = () => {
    const env = process.env.NODE_ENV || 'development';
    switch (env) {
        case 'production':
            // Production - ONLY production domains
            return [
                'https://brandmonkz.com',
                'https://www.brandmonkz.com',
                process.env.FRONTEND_URL,
            ].filter(Boolean);
        case 'sandbox':
        case 'staging':
            // Sandbox/Staging - Production domains + sandbox domain
            return [
                'https://brandmonkz.com',
                'https://www.brandmonkz.com',
                process.env.FRONTEND_URL || 'https://sandbox.brandmonkz.com',
            ].filter(Boolean);
        case 'development':
        default:
            // Development - localhost allowed + S3 sandbox
            return [
                'https://brandmonkz.com',
                'https://www.brandmonkz.com',
                'http://brandmonkz.com',
                'http://www.brandmonkz.com',
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:5175',
                'http://localhost:5176',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:8080',
                'http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com',
                'http://brandmonkz-crm-frontend.s3-website-us-east-1.amazonaws.com',
                'file://',
                process.env.FRONTEND_URL,
            ].filter(Boolean);
    }
};
// CORS configuration with environment-based origins
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            logger_1.logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600, // Cache preflight requests for 10 minutes
}));
// Log CORS configuration on startup
logger_1.logger.info(`✅ CORS configured for environment: ${process.env.NODE_ENV || 'development'}`);
logger_1.logger.info(`✅ Allowed origins: ${getAllowedOrigins().join(', ')}`);
// Compression middleware
app.use((0, compression_1.default)());
// Logging middleware - privacy-friendly format (no IP logging for iCloud Private Relay compatibility)
app.use((0, morgan_1.default)(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) },
}));
// Rate limiting - compatible with iCloud Private Relay and privacy tools
const limiter = (0, express_rate_limit_1.default)({
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // Increased from 100 to 1000
    message: {
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip failed requests to prevent iCloud Private Relay warnings
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
    // Use a custom key generator that handles missing IPs gracefully
    keyGenerator: (req) => {
        // Try to get IP from headers (behind proxy)
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded
            ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
            : req.ip || req.socket.remoteAddress || 'unknown';
        // For privacy tools like iCloud Private Relay, fallback to user agent + accept header
        if (ip === 'unknown' || !ip) {
            const userAgent = req.headers['user-agent'] || 'unknown-agent';
            const accept = req.headers['accept'] || 'unknown-accept';
            return `fallback-${userAgent.slice(0, 50)}-${accept.slice(0, 50)}`;
        }
        return ip;
    },
});
app.use('/api', limiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Initialize Passport
app.use(passport_1.default.initialize());
// Apply enhanced security headers
app.use((0, securityHeaders_1.applyAllSecurityHeaders)());
// Apply all security guards to API routes
app.use('/api', (0, securityGuards_1.applyAllSecurityGuards)());
// CSRF token endpoint (for frontend to get token)
app.get('/api/csrf-token', csrfProtection_1.getCsrfToken);
// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'CRM Email Marketing Automation API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            contacts: '/api/contacts',
            companies: '/api/companies',
            deals: '/api/deals',
            campaigns: '/api/campaigns'
        }
    });
});
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected',
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: 'Service unavailable',
        });
    }
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/contacts', contacts_1.default);
app.use('/api/companies', companies_1.default);
app.use('/api/deals', deals_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/campaigns', campaigns_1.default);
app.use('/api/automations', automations_1.default);
app.use('/api/email-templates', emailTemplates_1.default);
app.use('/api/tags', tags_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/enrichment', enrichment_1.default);
app.use('/api/email-composer', emailComposer_1.default);
app.use('/api/csv-import', csvImport_1.default);
app.use('/api/positions', positions_1.default);
app.use('/api/email-servers', emailServers_1.default);
app.use('/api/tracking', emailTracking_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/subscriptions', subscriptions_1.default);
app.use('/api/pricing', pricing_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/verification', verification_1.default);
// app.use('/api/godaddy', godaddyRoutes); // Disabled - service not implemented
// 404 handler
app.use(notFoundHandler_1.notFoundHandler);
// Global error handler
app.use(errorHandler_1.errorHandler);
