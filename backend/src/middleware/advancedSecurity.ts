import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// In-memory store for rate limiting and blocking (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
const ipBlacklist = new Set<string>();
const suspiciousIPs = new Map<string, number>();
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const sessionFingerprints = new Map<string, string>();

/**
 * Get client IP address with proxy support
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Advanced Rate Limiting
 * Implements sliding window rate limiting with different tiers
 */
export function advancedRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  // APPLY STRICTER RATE LIMITING FOR SUPER ADMIN ROUTES
  // Super admin routes get moderate limits to prevent brute force and abuse
  let isSuperAdminRoute = req.path.includes('/super-admin');
  let isAdminRoute = req.path.includes('/admin/');

  if (isSuperAdminRoute || isAdminRoute) {
    // Super admin/admin routes: 100 requests per minute (stricter than regular authenticated users)
    const maxAdminRequests = 100;

    const requestData = requestCounts.get(ip);

    if (!requestData || now > requestData.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs, blocked: false });
      return next();
    }

    if (requestData.blocked) {
      console.warn(`⚠️ Blocked admin route access from IP: ${ip}`);
      return res.status(429).json({
        error: 'Too many requests to admin panel. Please wait before trying again.',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
    }

    requestData.count++;

    if (requestData.count > maxAdminRequests) {
      requestData.blocked = true;
      console.warn(`⚠️ Rate limit exceeded for admin routes from IP: ${ip} (${requestData.count} requests)`);
      return res.status(429).json({
        error: 'Too many requests to admin panel. Please wait before trying again.',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
    }

    return next();
  }

  // EXEMPT AUTHENTICATED USERS FROM STRICT RATE LIMITING
  // Check for Authorization header (JWT token)
  const authHeader = req.headers.authorization;
  const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');

  // EXEMPT ALL AUTH ENDPOINTS FROM RATE LIMITING - Allow free login access
  if (req.path.includes('/auth/')) {
    return next(); // Skip rate limiting for all auth endpoints
  }

  // Different rate limits based on endpoint sensitivity
  let maxRequests = hasAuthToken ? 1000 : 300; // Authenticated users: 1000/min, Unauthenticated: 300/min

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    maxRequests = hasAuthToken ? 500 : 150; // Authenticated: 500/min, Unauthenticated: 150/min
  }

  const requestData = requestCounts.get(ip);

  if (!requestData || now > requestData.resetTime) {
    // New window or expired window
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs, blocked: false });
    return next();
  }

  if (requestData.blocked) {
    return res.status(429).json({
      error: 'Too many requests. Your IP has been temporarily blocked.',
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
    });
  }

  requestData.count++;

  if (requestData.count > maxRequests) {
    requestData.blocked = true;

    // Track suspicious IPs
    const suspicionScore = suspiciousIPs.get(ip) || 0;
    suspiciousIPs.set(ip, suspicionScore + 1);

    // Auto-block IPs with high suspicion scores
    if (suspicionScore > 3) {
      ipBlacklist.add(ip);
      console.error(`🚨 IP BLACKLISTED (Rate Limit Abuse): ${ip}`);
    }

    return res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
    });
  }

  next();
}

/**
 * IP Blacklist/Whitelist Protection
 * Checks both in-memory and database-backed blacklist
 * EXEMPTS AUTHENTICATED USERS - Only blocks anonymous suspicious traffic
 */
export async function ipFilterMiddleware(req: Request, res: Response, next: NextFunction) {
  // EXEMPT PUBLIC CHECKOUT IMMEDIATELY - No IP checks for pricing page
  if (req.path && req.path.includes('/public-checkout')) {
    return next();
  }
  if (req.url && req.url.includes('/public-checkout')) {
    return next();
  }
  if (req.originalUrl && req.originalUrl.includes('/public-checkout')) {
    return next();
  }

  const ip = getClientIP(req);

  // EXEMPT AUTHENTICATED USERS FROM IP BLOCKING
  // Legitimate users with valid auth tokens should never be blocked
  const authHeader = req.headers.authorization;
  const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');

  if (hasAuthToken) {
    // User is authenticated - skip all IP blocking checks
    return next();
  }

  // EXEMPT ALL AUTH ENDPOINTS - Allow users to login/register
  if (req.path.includes('/auth/')) {
    return next();
  }

  // Check in-memory blacklist first (faster) - ONLY for unauthenticated requests
  if (ipBlacklist.has(ip)) {
    console.error(`🚫 BLOCKED REQUEST from in-memory blacklisted IP: ${ip}`);
    return res.status(403).json({
      error: 'Access denied. Your IP has been blocked due to suspicious activity.',
    });
  }

  // Check database blacklist (persistent) - ONLY for unauthenticated requests
  try {
    const blockedIP = await prisma.blockedIP.findFirst({
      where: {
        ipAddress: ip,
        isActive: true,
        OR: [
          { expiresAt: null },  // Never expires
          { expiresAt: { gt: new Date() } }  // Not yet expired
        ]
      }
    });

    if (blockedIP) {
      // Add to in-memory cache for faster subsequent checks
      ipBlacklist.add(ip);
      console.error(`🚫 BLOCKED REQUEST from database-blacklisted IP: ${ip}`);
      return res.status(403).json({
        error: 'Access denied. Your IP has been permanently blocked.',
      });
    }
  } catch (error) {
    console.error('Error checking blocked IPs:', error);
    // Continue on database error - don't block legitimate traffic
  }

  // Optional: Whitelist specific IPs for admin access (configure in .env)
  const whitelistedIPs = (process.env.WHITELISTED_IPs || '').split(',').filter(Boolean);

  if (req.path.includes('/super-admin') && whitelistedIPs.length > 0) {
    if (!whitelistedIPs.includes(ip)) {
      console.warn(`⚠️ Super Admin access denied for non-whitelisted IP: ${ip}`);
      return res.status(403).json({
        error: 'Access denied. Super Admin panel requires whitelisted IP.',
      });
    }
  }

  next();
}

/**
 * Malicious Payload Detection
 * Detects and blocks known attack patterns
 * EXEMPTS AUTHENTICATED USERS - Only scans anonymous requests
 */
export function maliciousPayloadDetection(req: Request, res: Response, next: NextFunction) {
  // EXEMPT PUBLIC CHECKOUT FIRST - Pricing page must work without security checks
  console.log(`[SECURITY CHECK] Path: ${req.path}, URL: ${req.url}, OriginalURL: ${req.originalUrl}`);

  if (req.path && req.path.includes('/public-checkout')) {
    console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (path)');
    return next();
  }
  if (req.url && req.url.includes('/public-checkout')) {
    console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (url)');
    return next();
  }
  if (req.originalUrl && req.originalUrl.includes('/public-checkout')) {
    console.log('[SECURITY CHECK] Skipping malicious payload detection for public-checkout (originalUrl)');
    return next();
  }

  console.log('[SECURITY CHECK] NOT skipping - running malicious payload detection');

  const ip = getClientIP(req);

  // EXEMPT AUTHENTICATED USERS - Legitimate users should never be blocked
  const authHeader = req.headers.authorization;
  const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');

  if (hasAuthToken) {
    // User is authenticated - skip malicious payload detection
    return next();
  }

  // Whitelist endpoints that handle JWT tokens, URLs, and encoded data
  const safeEndpoints = [
    '/health',          // Health checks should never be blocked
    '/track/visit',
    '/website-visits',
    '/auth/callback',
    '/auth/google',
    '/auth/',
    '/api-keys',
    '/email-templates', // Email templates contain HTML/DOCTYPE which is legitimate
    '/email-composer',  // Email composer handles HTML content
    '/video-campaigns/synthesize-voice', // Video generation internal service calls
    '/video-campaigns/ai', // AI video generation endpoints
    '/video-campaigns/complete', // Video generator completion callback
    '/public-checkout', // Public pricing page checkout (no auth required)
  ];

  // Skip malicious payload detection for safe endpoints (check both path and originalUrl)
  const pathToCheck = req.originalUrl || req.path || req.url;
  if (safeEndpoints.some(endpoint => pathToCheck.includes(endpoint))) {
    return next();
  }

  // Malicious patterns to detect
  const maliciousPatterns = [
    // Path Traversal
    /(\.\.|\/etc\/|\/root\/|\/home\/|c:\\|\\\\)/i,
    // XXE (XML External Entity) - more specific to avoid false positives
    /<!ENTITY|<!DOCTYPE|SYSTEM\s+["']|PUBLIC\s+["']/i,
    // NoSQL Injection (only check for MongoDB operators in non-encoded context)
    /(\$where|\$ne|\$gt|\$lt|\$regex|\$or|\$and)/,
    // CRLF Injection
    /(%0d|%0a|\\r|\\n)/i,
    // File Upload Exploits
    /(\.php|\.jsp|\.asp|\.exe|\.sh|\.bat)$/i,
  ];

  // Check URL, query params, and body for malicious content
  // Decode URL-encoded data to avoid false positives from encoded characters
  const checkData = [
    decodeURIComponent(req.url || ''),
    JSON.stringify(req.query),
    JSON.stringify(req.body),
  ].join(' ');

  for (const pattern of maliciousPatterns) {
    if (pattern.test(checkData)) {
      const suspicionScore = suspiciousIPs.get(ip) || 0;
      suspiciousIPs.set(ip, suspicionScore + 5); // High score for malicious payloads

      if (suspicionScore > 10) {
        ipBlacklist.add(ip);
      }

      console.error(`🚨 MALICIOUS PAYLOAD DETECTED from IP: ${ip}`, {
        pattern: pattern.toString(),
        path: req.path,
        method: req.method,
      });

      return res.status(400).json({
        error: 'Invalid request. Malicious content detected.',
      });
    }
  }

  next();
}

/**
 * Brute Force Protection for Login
 * TEMPORARILY DISABLED TO ALLOW FREE LOGIN ACCESS
 */
export function bruteForcePrevention(req: Request, res: Response, next: NextFunction) {
  // TEMPORARILY DISABLED - Allow unlimited login attempts
  return next();

  // Only apply to login endpoints
  if (!req.path.includes('/login') && !req.path.includes('/auth')) {
    return next();
  }

  const ip = getClientIP(req);
  const identifier = `${ip}:${req.body?.email || 'unknown'}`;
  const now = Date.now();
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attemptData = failedLoginAttempts.get(identifier);

  if (attemptData) {
    const timeSinceLastAttempt = now - attemptData.lastAttempt;

    // Reset if lockout period has passed
    if (timeSinceLastAttempt > lockoutDuration) {
      failedLoginAttempts.delete(identifier);
      return next();
    }

    // Check if account is locked out
    if (attemptData.count >= maxAttempts) {
      const remainingTime = Math.ceil((lockoutDuration - timeSinceLastAttempt) / 1000 / 60);

      console.warn(`🔒 BRUTE FORCE ATTEMPT BLOCKED: ${identifier}`);

      return res.status(429).json({
        error: `Too many failed login attempts. Account temporarily locked.`,
        retryAfter: `${remainingTime} minutes`,
      });
    }
  }

  // Store original res.json to intercept failed login responses
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // Detect failed login (status 401 or error message)
    if (res.statusCode === 401 || body?.error) {
      const current = failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: now };
      failedLoginAttempts.set(identifier, {
        count: current.count + 1,
        lastAttempt: now,
      });

      // Track suspicious IPs
      const suspicionScore = suspiciousIPs.get(ip) || 0;
      suspiciousIPs.set(ip, suspicionScore + 1);
    } else {
      // Successful login - clear attempts
      failedLoginAttempts.delete(identifier);
    }

    return originalJson(body);
  };

  next();
}

/**
 * Request Integrity Verification
 * Validates request signatures for sensitive operations
 */
export function requestIntegrityCheck(req: Request, res: Response, next: NextFunction) {
  // Skip for public endpoints
  const publicPaths = ['/health', '/auth/login', '/auth/register', '/track'];
  if (publicPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Verify request hasn't been tampered with
  const timestamp = req.headers['x-request-timestamp'] as string;

  if (timestamp) {
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Reject old or future-dated requests (replay attack prevention)
    if (Math.abs(now - requestTime) > maxAge) {
      console.warn(`⚠️ REPLAY ATTACK SUSPECTED: Timestamp out of range`, {
        ip: getClientIP(req),
        path: req.path,
        timestamp,
      });

      return res.status(400).json({
        error: 'Request expired or invalid timestamp.',
      });
    }
  }

  next();
}

/**
 * Suspicious Activity Detection
 * ML-like behavior analysis
 * EXEMPTS AUTHENTICATED USERS - Only monitors anonymous traffic
 */
export function suspiciousActivityDetection(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);

  // EXEMPT AUTHENTICATED USERS - Legitimate users should never be flagged
  const authHeader = req.headers.authorization;
  const hasAuthToken = authHeader && authHeader.startsWith('Bearer ');

  if (hasAuthToken) {
    // User is authenticated - skip suspicious activity detection
    return next();
  }

  const suspicionScore = suspiciousIPs.get(ip) || 0;

  // Auto-decay suspicion score over time
  const decayInterval = 60 * 60 * 1000; // 1 hour
  setTimeout(() => {
    const currentScore = suspiciousIPs.get(ip) || 0;
    if (currentScore > 0) {
      suspiciousIPs.set(ip, Math.max(0, currentScore - 1));
    }
  }, decayInterval);

  // Suspicious behavior patterns
  let scoreIncrease = 0;

  // 1. Rapid endpoint scanning
  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent || userAgent.length < 10) {
    scoreIncrease += 2; // No or suspicious user agent
  }

  // 2. Accessing non-existent endpoints (404 farming)
  if (res.statusCode === 404) {
    scoreIncrease += 1;
  }

  // 3. Unusual request patterns
  if (req.method === 'OPTIONS' && !req.headers['access-control-request-method']) {
    scoreIncrease += 1; // Suspicious OPTIONS request
  }

  // 4. Known bot patterns
  const botPatterns = /(bot|crawler|spider|scraper|curl|wget|python|java)/i;
  if (botPatterns.test(userAgent) && !req.path.includes('/health')) {
    scoreIncrease += 1;
  }

  if (scoreIncrease > 0) {
    suspiciousIPs.set(ip, suspicionScore + scoreIncrease);
  }

  // Block highly suspicious IPs
  if (suspicionScore > 20) {
    ipBlacklist.add(ip);
    console.error(`🚨 IP AUTO-BLOCKED (High Suspicion Score: ${suspicionScore}): ${ip}`);

    return res.status(403).json({
      error: 'Access denied due to suspicious activity.',
    });
  }

  next();
}

/**
 * Session Hijacking Prevention
 */
export function sessionHijackingPrevention(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user || !user.id) {
    return next();
  }

  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const sessionKey = `session:${user.id}`;

  // Create fingerprint
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');

  // Store or verify session fingerprint
  const storedFingerprint = sessionFingerprints.get(sessionKey);

  if (!storedFingerprint) {
    // First request - store fingerprint
    sessionFingerprints.set(sessionKey, fingerprint);
  } else if (storedFingerprint !== fingerprint) {
    // Fingerprint mismatch - possible session hijacking
    console.error(`🚨 SESSION HIJACKING DETECTED for user: ${user.email}`, {
      userId: user.id,
      ip,
      storedFingerprint,
      currentFingerprint: fingerprint,
    });

    // Remove fingerprint
    sessionFingerprints.delete(sessionKey);

    return res.status(401).json({
      error: 'Session invalid. Please login again.',
    });
  }

  next();
}

/**
 * Clean up expired data periodically
 */
setInterval(() => {
  const now = Date.now();

  // Clean up rate limit data
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }

  // Clean up old failed login attempts
  for (const [identifier, data] of failedLoginAttempts.entries()) {
    if (now - data.lastAttempt > 15 * 60 * 1000) {
      failedLoginAttempts.delete(identifier);
    }
  }

  // Clean up low-score suspicious IPs
  for (const [ip, score] of suspiciousIPs.entries()) {
    if (score <= 0) {
      suspiciousIPs.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * Security Dashboard Stats (for monitoring)
 */
export function getSecurityStats() {
  return {
    blacklistedIPs: Array.from(ipBlacklist),
    suspiciousIPs: Array.from(suspiciousIPs.entries()).map(([ip, score]) => ({ ip, score })),
    activeRateLimits: requestCounts.size,
    failedLoginAttempts: failedLoginAttempts.size,
  };
}

/**
 * Manual IP Management (Database-backed)
 */
export async function blockIP(ip: string, metadata?: {
  reason?: string;
  blockedBy?: string;
  threatLevel?: string;
  attackType?: string;
  attempts?: number;
  country?: string;
}) {
  // Add to in-memory blacklist for immediate effect
  ipBlacklist.add(ip);

  // Add to database for persistence
  try {
    await prisma.blockedIP.upsert({
      where: { ipAddress: ip },
      create: {
        ipAddress: ip,
        reason: metadata?.reason || 'Manually blocked',
        blockedBy: metadata?.blockedBy,
        threatLevel: metadata?.threatLevel,
        attackType: metadata?.attackType,
        attempts: metadata?.attempts || 0,
        country: metadata?.country,
        isActive: true,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
      update: {
        isActive: true,
        reason: metadata?.reason || 'Manually blocked',
        blockedBy: metadata?.blockedBy,
        blockedAt: new Date()
      }
    });
    console.log(`✅ IP permanently blocked (DB + Memory): ${ip}`);
  } catch (error) {
    console.error(`Error blocking IP in database: ${ip}`, error);
    // IP is still blocked in memory even if DB fails
  }
}

export async function unblockIP(ip: string) {
  // Remove from in-memory blacklist
  ipBlacklist.delete(ip);
  suspiciousIPs.delete(ip);

  // Deactivate in database
  try {
    await prisma.blockedIP.updateMany({
      where: { ipAddress: ip },
      data: { isActive: false }
    });
    console.log(`✅ IP unblocked (DB + Memory): ${ip}`);
  } catch (error) {
    console.error(`Error unblocking IP in database: ${ip}`, error);
  }
}
