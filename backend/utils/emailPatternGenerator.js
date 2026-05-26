"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDomain = extractDomain;
exports.generateEmailPatterns = generateEmailPatterns;
exports.generateBestGuessEmail = generateBestGuessEmail;
exports.isValidEmailFormat = isValidEmailFormat;
exports.learnDomainFromContacts = learnDomainFromContacts;
function extractDomain(websiteOrName) {
    if (!websiteOrName)
        return null;
    try {
        const url = websiteOrName.toLowerCase().trim();
        let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        domain = domain.split(':')[0];
        if (domain.includes('.')) {
            return domain;
        }
        const cleanName = websiteOrName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .replace(/(inc|llc|ltd|corp|corporation|company|co)$/, '');
        return cleanName ? `${cleanName}.com` : null;
    }
    catch {
        return null;
    }
}
function cleanName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, '');
}
function generateEmailPatterns(firstName, lastName, domain) {
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
    const patterns = [
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
function generateBestGuessEmail(firstName, lastName, domain) {
    const patterns = generateEmailPatterns(firstName, lastName, domain);
    return patterns.length > 0 ? patterns[0] : null;
}
function isValidEmailFormat(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
async function learnDomainFromContacts(prisma, companyId) {
    try {
        const contacts = await prisma.contact.findMany({
            where: {
                companyId,
                email: { not: null },
                emailVerified: true,
            },
            select: {
                email: true,
            },
            take: 5,
        });
        if (contacts.length === 0)
            return null;
        const domainCounts = new Map();
        for (const contact of contacts) {
            if (contact.email) {
                const domain = contact.email.split('@')[1];
                if (domain) {
                    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
                }
            }
        }
        let maxCount = 0;
        let mostCommonDomain = null;
        for (const [domain, count] of domainCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonDomain = domain;
            }
        }
        return mostCommonDomain;
    }
    catch (error) {
        console.error('Error learning domain from contacts:', error);
        return null;
    }
}
//# sourceMappingURL=emailPatternGenerator.js.map