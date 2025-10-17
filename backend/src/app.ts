import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import passport from './config/passport';

// Import security guards
import { applyAllSecurityHeaders } from './middleware/securityHeaders';
import { applyAllSecurityGuards, fileUploadGuard } from './middleware/securityGuards';
import { getCsrfToken, csrfProtection } from './middleware/csrfProtection';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import contactRoutes from './routes/contacts';
import companyRoutes from './routes/companies';
import dealRoutes from './routes/deals';
import activityRoutes from './routes/activities';
import campaignRoutes from './routes/campaigns';
import automationRoutes from './routes/automations';
import emailTemplateRoutes from './routes/emailTemplates';
import tagRoutes from './routes/tags';
import dashboardRoutes from './routes/dashboard';
import enrichmentRoutes from './routes/enrichment';
import emailComposerRoutes from './routes/emailComposer';
import csvImportRoutes from './routes/csvImport';
import positionRoutes from './routes/positions';
import emailServerRoutes from './routes/emailServers';
import emailTrackingRoutes from "./routes/emailTracking";
import analyticsRoutes from './routes/analytics';
import subscriptionRoutes from './routes/subscriptions';
import pricingRoutes from './routes/pricing';
import adminRoutes from './routes/admin';
import verificationRoutes from './routes/verification';
import teamRoutes from './routes/team';
import sharingRoutes from './routes/sharing';
import leadsRoutes from './routes/leads.routes';
import tasksRoutes from './routes/tasks.routes';
import projectsRoutes from './routes/projects.routes';
import ticketsRoutes from './routes/tickets.routes';
import internalRoutes from './routes/internal.routes';
import aiChatRoutes from './routes/ai-chat';
import videoCampaignsRoutes from './routes/videoCampaigns';
// import godaddyRoutes from './routes/godaddy'; // Disabled - service not implemented

const app = express();
const prisma = new PrismaClient();

// Trust proxy - required for rate limiting behind Nginx reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
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
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      // Production - ONLY production domains
      return [
        'https://brandmonkz.com',
        'https://www.brandmonkz.com',
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];

    case 'sandbox':
    case 'staging':
      // Sandbox/Staging - Production domains + sandbox domain
      return [
        'https://brandmonkz.com',
        'https://www.brandmonkz.com',
        process.env.FRONTEND_URL || 'https://sandbox.brandmonkz.com',
      ].filter(Boolean) as string[];

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
      ].filter(Boolean) as string[];
  }
};

// CORS configuration with environment-based origins
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
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
logger.info(`✅ CORS configured for environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`✅ Allowed origins: ${getAllowedOrigins().join(', ')}`);

// Compression middleware
app.use(compression());

// Logging middleware - privacy-friendly format (no IP logging for iCloud Private Relay compatibility)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting - compatible with iCloud Private Relay and privacy tools
const limiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (reduced window)
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // 5000 requests per minute
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to only count failed/suspicious ones
  skipFailedRequests: false,
  skipSuccessfulRequests: true, // Only count failed requests
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Apply enhanced security headers
app.use(applyAllSecurityHeaders());

// Apply all security guards to API routes
app.use('/api', applyAllSecurityGuards());

// CSRF token endpoint (for frontend to get token)
app.get('/api/csrf-token', getCsrfToken);

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
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Service unavailable',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/email-composer', emailComposerRoutes);
app.use('/api/csv-import', csvImportRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/email-servers', emailServerRoutes);
app.use('/api/tracking', emailTrackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/video-campaigns', videoCampaignsRoutes);
// app.use('/api/godaddy', godaddyRoutes); // Disabled - service not implemented

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app, prisma };