/**
 * URL Validation Middleware
 * Blocks specific domains from being used in the application
 */

export const BLOCKED_DOMAINS = [
  'bedpage.com',
  'www.bedpage.com',
  // Add more blocked domains here
];

/**
 * Check if a URL contains a blocked domain
 */
export function isUrlBlocked(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    return BLOCKED_DOMAINS.some(blocked =>
      hostname === blocked || hostname.endsWith(`.${blocked}`)
    );
  } catch (error) {
    // Invalid URL format
    return true;
  }
}

/**
 * Validate URL and throw error if blocked
 */
export function validateUrl(url: string, fieldName: string = 'URL'): void {
  if (isUrlBlocked(url)) {
    throw new Error(`${fieldName} contains a blocked domain`);
  }
}

/**
 * Express middleware to validate URLs in request body
 */
export function urlValidationMiddleware(fields: string[]) {
  return (req: any, res: any, next: any) => {
    try {
      for (const field of fields) {
        const url = req.body[field];
        if (url && typeof url === 'string') {
          validateUrl(url, field);
        }
      }
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'Invalid URL',
        message: error.message
      });
    }
  };
}
