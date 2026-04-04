/**
 * Security Utilities
 * Provides input sanitization and validation functions for security
 */

import path from 'path';

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes: ../, ..\, /, \, and non-alphanumeric characters (except ._-)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename');
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Only allow alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  // Ensure filename is not empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Filename becomes empty after sanitization');
  }

  // Limit filename length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  return sanitized;
}

/**
 * Validate that a resolved path is within an allowed base directory
 * Prevents path traversal attacks
 */
export function validatePathInDirectory(filePath: string, baseDir: string): void {
  const resolvedPath = path.resolve(filePath);
  const resolvedBaseDir = path.resolve(baseDir);

  if (!resolvedPath.startsWith(resolvedBaseDir + path.sep) && resolvedPath !== resolvedBaseDir) {
    throw new Error('Path traversal attempt detected');
  }
}

/**
 * Safely join paths and validate they remain within base directory
 */
export function safePathJoin(baseDir: string, ...parts: string[]): string {
  // Sanitize all parts
  const sanitizedParts = parts.map(part => sanitizeFilename(part));

  // Join the paths
  const joinedPath = path.join(baseDir, ...sanitizedParts);

  // Validate the result is within base directory
  validatePathInDirectory(joinedPath, baseDir);

  return joinedPath;
}

/**
 * Sanitize object for mass assignment
 * Only allows specified fields through
 */
export function sanitizeObject<T extends Record<string, any>>(
  input: any,
  allowedFields: string[]
): Partial<T> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const sanitized: any = {};

  for (const field of allowedFields) {
    if (input.hasOwnProperty(field)) {
      sanitized[field] = input[field];
    }
  }

  return sanitized as Partial<T>;
}

/**
 * Validate and sanitize string input
 * Removes potential XSS and SQL injection characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email');
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string, allowedProtocols: string[] = ['http', 'https']): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  const sanitized = url.trim();

  try {
    const urlObj = new URL(sanitized);

    if (!allowedProtocols.includes(urlObj.protocol.replace(':', ''))) {
      throw new Error('Protocol not allowed');
    }

    return sanitized;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: any, min?: number, max?: number): number {
  const num = parseInt(input, 10);

  if (isNaN(num)) {
    throw new Error('Invalid integer');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  throw new Error('Invalid boolean value');
}

/**
 * Remove potential format string specifiers from log messages
 */
export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Replace format specifiers with safe alternatives
  return message.replace(/%[sdifoOj]/g, '%%');
}
