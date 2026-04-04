/**
 * Email Pattern Generator
 * Generates corporate email addresses based on common patterns
 * $0 cost solution - no third-party APIs needed
 */

export interface GeneratedEmail {
  email: string;
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract domain from company website URL or name
 */
export function extractDomain(websiteOrName: string): string | null {
  if (!websiteOrName) return null;

  // If it's a URL, extract domain
  try {
    const url = websiteOrName.toLowerCase().trim();

    // Remove protocol
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');

    // Remove path and query string
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];

    // Remove port
    domain = domain.split(':')[0];

    // If domain looks valid (has a dot), return it
    if (domain.includes('.')) {
      return domain;
    }

    // Otherwise, try to create domain from company name
    const cleanName = websiteOrName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .replace(/(inc|llc|ltd|corp|corporation|company|co)$/, ''); // Remove company suffixes

    return cleanName ? `${cleanName}.com` : null;
  } catch {
    return null;
  }
}

/**
 * Clean and normalize name for email generation
 */
function cleanName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters
    .replace(/\s+/g, ''); // Remove spaces
}

/**
 * Generate multiple email pattern variations
 */
export function generateEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string
): GeneratedEmail[] {
  if (!firstName || !lastName || !domain) {
    return [];
  }

  const first = cleanName(firstName);
  const last = cleanName(lastName);
  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);

  if (!first || !last || !firstInitial || !lastInitial) {
    return [];
  }

  // Common corporate email patterns, ordered by popularity
  const patterns: Array<{ pattern: string; email: string; confidence: 'high' | 'medium' | 'low' }> = [
    // Most common patterns (70%+ of companies)
    {
      pattern: 'firstname.lastname',
      email: `${first}.${last}@${domain}`,
      confidence: 'high',
    },
    {
      pattern: 'firstnamelastname',
      email: `${first}${last}@${domain}`,
      confidence: 'high',
    },
    {
      pattern: 'firstname',
      email: `${first}@${domain}`,
      confidence: 'high',
    },

    // Common patterns (20-30% of companies)
    {
      pattern: 'f.lastname',
      email: `${firstInitial}.${last}@${domain}`,
      confidence: 'medium',
    },
    {
      pattern: 'flastname',
      email: `${firstInitial}${last}@${domain}`,
      confidence: 'medium',
    },
    {
      pattern: 'firstname_lastname',
      email: `${first}_${last}@${domain}`,
      confidence: 'medium',
    },

    // Less common patterns (5-10% of companies)
    {
      pattern: 'lastname.firstname',
      email: `${last}.${first}@${domain}`,
      confidence: 'low',
    },
    {
      pattern: 'firstinitial-lastname',
      email: `${firstInitial}-${last}@${domain}`,
      confidence: 'low',
    },
  ];

  return patterns;
}

/**
 * Generate best-guess email (most common pattern)
 */
export function generateBestGuessEmail(
  firstName: string,
  lastName: string,
  domain: string
): GeneratedEmail | null {
  const patterns = generateEmailPatterns(firstName, lastName, domain);
  return patterns.length > 0 ? patterns[0] : null;
}

/**
 * Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Get domain from existing contacts at same company (pattern learning)
 */
export async function learnDomainFromContacts(
  prisma: any,
  companyId: string
): Promise<string | null> {
  try {
    // Find contacts with verified emails at this company
    const contacts = await prisma.contact.findMany({
      where: {
        companyId,
        email: { not: null },
        emailVerified: true,
      },
      select: {
        email: true,
      },
      take: 5, // Sample a few contacts
    });

    if (contacts.length === 0) return null;

    // Extract domains and find most common
    const domainCounts = new Map<string, number>();

    for (const contact of contacts) {
      if (contact.email) {
        const domain = contact.email.split('@')[1];
        if (domain) {
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        }
      }
    }

    // Return most common domain
    let maxCount = 0;
    let mostCommonDomain: string | null = null;

    for (const [domain, count] of domainCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonDomain = domain;
      }
    }

    return mostCommonDomain;
  } catch (error) {
    console.error('Error learning domain from contacts:', error);
    return null;
  }
}
