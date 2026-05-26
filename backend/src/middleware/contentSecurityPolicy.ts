import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Generate nonce for inline scripts
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Comprehensive Content Security Policy
 * Prevents XSS, clickjacking, and other injection attacks
 */
export function strictContentSecurityPolicy(req: Request, res: Response, next: NextFunction) {
  const nonce = generateNonce();

  // Store nonce in request for use in rendered pages
  (req as any).cspNonce = nonce;

  // Strict CSP that blocks most XSS attempts
  const cspDirectives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://apis.google.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: https: blob:`,
    `media-src 'self' https: blob:`,
    `connect-src 'self' https://accounts.google.com https://www.googleapis.com ${process.env.FRONTEND_URL || '*'}`,
    `frame-src 'self' https://accounts.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`, // Prevent clickjacking
    `upgrade-insecure-requests`,
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable XSS filter
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Control referrer
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()'); // Restrict features

  // Prevent DNS prefetching
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Subresource Integrity (SRI) Hash Generator
 * For verifying integrity of external resources
 */
export function generateSRIHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Clickjacking Protection with Frame-Busting
 */
export function clickjackingProtection(req: Request, res: Response, next: NextFunction) {
  // Multiple layers of clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");

  next();
}

/**
 * MIME Type Sniffing Protection
 */
export function mimeTypeProtection(req: Request, res: Response, next: NextFunction) {
  // Prevent browsers from MIME-sniffing away from declared content-type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Ensure correct content type for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  next();
}

/**
 * Referrer Policy - Limit information leakage
 */
export function strictReferrerPolicy(req: Request, res: Response, next: NextFunction) {
  // Only send origin for cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Feature Policy / Permissions Policy
 * Restrict browser features to prevent abuse
 */
export function featurePolicy(req: Request, res: Response, next: NextFunction) {
  const policy = [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', ');

  res.setHeader('Permissions-Policy', policy);
  next();
}

/**
 * HTTP Strict Transport Security (HSTS)
 * Force HTTPS connections
 */
export function strictTransportSecurity(req: Request, res: Response, next: NextFunction) {
  // Force HTTPS for 1 year, including subdomains
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
}
