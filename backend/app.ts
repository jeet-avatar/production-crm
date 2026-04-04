import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma'; // Use shared Prisma Client instance
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import passport from './config/passport';

// Import security guards
import { applyAllSecurityHeaders } from './middleware/securityHeaders';
import { applyAllSecurityGuards, fileUploadGuard } from './middleware/securityGuards';
import { getCsrfToken, csrfProtection } from './middleware/csrfProtection';
import { trackWebsiteVisit } from './middleware/websiteTracker';
import { trackSessionActivity } from './middleware/sessionTracker';
import { trackUserActivity } from './middleware/activityTracker';

// Import advanced security features
import {
  advancedRateLimiter,
  ipFilterMiddleware,
  maliciousPayloadDetection,
  bruteForcePrevention,
  requestIntegrityCheck,
  suspiciousActivityDetection,
  sessionHijackingPrevention,
} from './middleware/advancedSecurity';
import {
  strictContentSecurityPolicy,
  clickjackingProtection,
  mimeTypeProtection,
  strictReferrerPolicy,
  featurePolicy,
  strictTransportSecurity,
} from './middleware/contentSecurityPolicy';

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
import systemTemplateRoutes from './routes/systemTemplates';
import superAdminRoutes from './routes/superAdmin';
import uiConfigManagerRoutes from './routes/uiConfigManager';
import tagRoutes from './routes/tags';
import dashboardRoutes from './routes/dashboard';
import enrichmentRoutes from './routes/enrichment';
import emailVerificationRoutes from './routes/emailVerification.routes';
import emailComposerRoutes from './routes/emailComposer';
import csvImportRoutes from './routes/csvImport';
import bulkImportRoutes from './routes/bulkImport';
import positionRoutes from './routes/positions';
import emailServerRoutes from './routes/emailServers';
import emailTrackingRoutes from "./routes/emailTracking";
import analyticsRoutes from './routes/analytics';
import subscriptionRoutes from './routes/subscriptions';
import pricingRoutes from './routes/pricing';
import adminRoutes from './routes/admin';
import verificationRoutes from './routes/verification';
import teamRoutes from './routes/team';
import videoCampaignsRoutes from './routes/videoCampaigns';
import aiChatRoutes from './routes/ai-chat';
import aiRoutes from './routes/ai';
import godaddyRoutes from './routes/godaddy';
import unsubscribeRoutes from './routes/unsubscribe';
import uiConfigRoutes from './routes/uiConfig';
import healthRoutes from './routes/health';
import leadsRoutes from './routes/leads.routes';
import mediaRoutes from './routes/media';
import trackingRoutes from './routes/tracking';
import emailFooterRoutes from './routes/emailFooter';
import apiKeyRoutes from './routes/apiKeys';
import apiAnalyticsRoutes from './routes/analytics.routes';
import apiSubscriptionRoutes from './routes/apiSubscriptions.routes';
import personalizationRoutes from './routes/personalization.routes';
import credentialsRoutes from './routes/credentials.routes';
import exportRoutes from './routes/export.routes';
import automationCampaignRoutes from './routes/automation.routes';
import publicCheckoutRoutes from './routes/publicCheckout.routes';
import partnersRoutes from './routes/partners.routes';
import contactSalesRoutes from './routes/contact.routes';
import standaloneEmailRoutes from './routes/standaloneEmail';
// Placeholder routes removed: sharing - not implemented yet

const app = express();
// Prisma instance imported from ./prisma.ts to avoid circular dependencies

// DEBUG: Log ALL requests BEFORE any middleware
app.use((req, res, next) => {
  console.log(`🚨 [GLOBAL DEBUG] ${req.method} ${req.url} (originalUrl: ${req.originalUrl}, path: ${req.path})`);
  next();
});

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

    case 'development':
    default:
      // Development - localhost allowed + S3
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
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'), // Increased to 5000 for heavy AI usage
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
  skip: (req) => {
    // Skip rate limiting for public endpoints and high-frequency GET requests
    const publicEndpoints = [
      '/api/ui-config/active',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/google',
      '/api/auth/google/callback',
      '/api/public-checkout/create-session',  // Pricing page
    ];

    // Skip rate limiting for public checkout (pricing page)
    if (req.path.includes('/public-checkout')) {
      return true;
    }

    // Skip rate limiting for all auth endpoints (login, OAuth, etc.)
    if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
      return true;
    }

    // Skip rate limiting for AI endpoints (heavy usage expected)
    if (req.path.startsWith('/api/ai-chat') || req.path.startsWith('/ai-chat') ||
        req.path.includes('/ai/') || req.path.includes('/ai-generate')) {
      return true;
    }

    // Skip rate limiting for ALL video-campaigns endpoints (heavy polling + uploads)
    if (req.path.startsWith('/api/video-campaigns') || req.path.startsWith('/video-campaigns')) {
      return true;
    }

    // Skip rate limiting for media proxy endpoints (embedded in emails, high traffic)
    if (req.path.startsWith('/media/')) {
      return true;
    }

    return publicEndpoints.some(endpoint => req.path === endpoint || req.originalUrl === endpoint);
  },
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// PUBLIC CHECKOUT - Must be BEFORE security middleware (no auth required for pricing page)
app.use('/api/public-checkout', publicCheckoutRoutes);

// EMAIL FOOTER - Must be BEFORE security middleware (has its own authenticate middleware)
// Debug: Check if route is being reached
app.use('/api/email-footer', (req, res, next) => {
  console.log('🔍 [DEBUG] Email-footer route MATCHED! Method:', req.method, 'Path:', req.path, 'URL:', req.url);
  next();
});
app.use('/api/email-footer', emailFooterRoutes);
// Debug: This should NOT execute if route handled the request
app.use('/api/email-footer', (req, res, next) => {
  console.log('⚠️ [DEBUG] Email-footer route did NOT handle request, continuing to next middleware');
  next();
});

// PARTNERS - Must be BEFORE security middleware (no auth required for public applications)
app.use('/api/partners', partnersRoutes);

// CONTACT SALES - Must be BEFORE security middleware (no auth required for public contact form)
app.use('/api/contact', contactSalesRoutes);

// ═══════════════════════════════════════════════════════════
// 🛡️ ADVANCED CYBERSECURITY LAYER
// Multi-layered protection against all major attack vectors
// ═══════════════════════════════════════════════════════════

// Layer 1: IP Filtering & Blacklist
app.use(ipFilterMiddleware);

// Layer 2: Content Security Policy & Headers
app.use(strictContentSecurityPolicy);
app.use(clickjackingProtection);
app.use(mimeTypeProtection);
app.use(strictReferrerPolicy);
app.use(featurePolicy);
app.use(strictTransportSecurity);

// Layer 3: Malicious Payload Detection
app.use(maliciousPayloadDetection);

// Layer 4: Advanced Rate Limiting (DDoS Protection)
app.use(advancedRateLimiter);

// Layer 5: Request Integrity & Replay Attack Prevention
app.use(requestIntegrityCheck);

// Layer 6: Suspicious Activity Monitoring
app.use(suspiciousActivityDetection);

// Layer 7: Brute Force Protection
app.use(bruteForcePrevention);

// Layer 8: Session Hijacking Prevention (for authenticated routes)
app.use(sessionHijackingPrevention);

// Apply enhanced security headers
app.use(applyAllSecurityHeaders());

// Website Visitor Tracking (before routes, after security)
app.use(trackWebsiteVisit);

// Debug ALL /api requests
app.use('/api', (req, res, next) => {
  console.log(`[APP.TS] 🌐 API Request: ${req.method} ${req.url} (originalUrl: ${req.originalUrl})`);
  next();
});

// Apply all security guards to API routes (excluding tokenSecurityGuard - redundant with authenticate middleware)
app.use('/api', applyAllSecurityGuards().filter(guard => guard.name !== 'tokenSecurityGuard'));

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

// Track user sessions and activities
app.use('/api', trackSessionActivity);
app.use('/api', trackUserActivity);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/campaigns', campaignRoutes);
// Debug middleware for email-templates
app.use('/api/email-templates', (req, res, next) => {
  console.log(`[APP.TS] 🔍 Email-templates request: ${req.method} ${req.url}`);
  console.log(`[APP.TS] 🔍 Full path: ${req.path}`);
  console.log(`[APP.TS] 🔍 Original URL: ${req.originalUrl}`);
  next();
});

app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/system-templates', systemTemplateRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ui-config-manager', uiConfigManagerRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/email-verification', emailVerificationRoutes);
app.use('/api/email-composer', emailComposerRoutes);
app.use('/api/csv-import', csvImportRoutes);
app.use('/api', bulkImportRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/email-servers', emailServerRoutes);
app.use('/api/tracking', emailTrackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
// Public checkout moved before security middleware (line ~265)
app.use('/api/pricing', pricingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/video-campaigns', videoCampaignsRoutes);
app.use('/api/personalization', personalizationRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/godaddy', godaddyRoutes);
app.use('/api/unsubscribe', unsubscribeRoutes);
app.use('/api/ui-config', uiConfigRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/standalone-emails', standaloneEmailRoutes);

// One-click automation routes (simplified: reuses existing video campaign endpoint)
app.use('/api/automation', automationCampaignRoutes);

app.use('/api/keys', apiKeyRoutes);
app.use('/api/keys-analytics', apiAnalyticsRoutes);
app.use('/api/subscriptions-api', apiSubscriptionRoutes);
app.use('/api/track', trackingRoutes); // Website visitor tracking
app.use('/media', mediaRoutes); // Public media proxy (no /api prefix for clean URLs)
// Email footer moved before security middleware (line 272)
// Placeholder routes not mounted: /api/sharing - to be implemented

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export { app, prisma };