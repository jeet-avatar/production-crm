// @ts-nocheck
/**
 * AI-Powered Decision Makers CSV Import Script
 *
 * This script intelligently processes the Decision Makers CSV file with 3 sections:
 * - Section 1: Companies (Name, LinkedIn, Website, Employee Count)
 * - Section 2: Contacts (Name, Company, Role)
 * - Section 3: Company Details (Job Postings, Hiring Intent, Tech Stack, AI Pitch)
 *
 * Usage: npx ts-node scripts/importDecisionMakers.ts <csv-file-path> <user-email>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CompanyRow {
  'Company Name': string;
  'LinkedIn Search': string;
  'Website Search': string;
  'Employee Count Search': string;
}

interface ContactRow {
  'Name': string;
  'Company Name': string;
  'Role': string;
}

interface CompanyDetailRow {
  [key: string]: string;
}

async function importDecisionMakers(csvPath: string, userEmail: string) {
  console.log('🚀 Starting AI-Powered Decision Makers Import...\n');

  // Find or create user
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    throw new Error(`User with email ${userEmail} not found!`);
  }

  console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})\n`);

  // Read CSV file
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');

  // Find section boundaries
  let section1End = 0;
  let section2Start = 0;
  let section2End = 0;
  let section3Start = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Section 2 starts with "Name,Company Name,Role"
    if (line.startsWith('Name,Company Name,Role')) {
      section1End = i;
      section2Start = i;
    }

    // Section 3 starts when we see a company name as first column after section 2
    if (section2Start > 0 && section2End === 0 && i > section2Start + 1) {
      const cols = line.split(',');
      if (cols.length >= 4 && cols[0] && !cols[1] && !cols[2]) {
        section2End = i;
        section3Start = i;
      }
    }
  }

  console.log(`📊 Detected sections:`);
  console.log(`   Section 1 (Companies): Lines 1-${section1End}`);
  console.log(`   Section 2 (Contacts): Lines ${section2Start}-${section2End || 'end'}`);
  console.log(`   Section 3 (Details): Lines ${section3Start || 'none'}-end\n`);

  // Parse Section 1: Companies
  const section1Content = lines.slice(0, section1End).join('\n');
  const companies: CompanyRow[] = csv.parse(section1Content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  console.log(`📦 Section 1: Found ${companies.length} companies`);

  const companyMap = new Map<string, string>(); // company name -> company ID

  for (const row of companies) {
    if (!row['Company Name']) continue;

    try {
      const company = await prisma.company.upsert({
        where: {
          domain: extractDomain(row['Website Search']),
        },
        update: {
          name: row['Company Name'],
          linkedin: cleanUrl(row['LinkedIn Search']),
          website: cleanUrl(row['Website Search']),
          employeeCount: row['Employee Count Search']?.trim() || null,
        },
        create: {
          userId: user.id,
          name: row['Company Name'],
          domain: extractDomain(row['Website Search']),
          linkedin: cleanUrl(row['LinkedIn Search']),
          website: cleanUrl(row['Website Search']),
          employeeCount: row['Employee Count Search']?.trim() || null,
          isActive: true,
        },
      });

      companyMap.set(row['Company Name'], company.id);
      console.log(`   ✓ ${row['Company Name']}`);
    } catch (err) {
      console.error(`   ✗ Failed: ${row['Company Name']} - ${err.message}`);
    }
  }

  console.log(`\n📇 Section 2: Processing contacts...`);

  // Parse Section 2: Contacts
  if (section2Start > 0 && section2End > section2Start) {
    const section2Content = lines.slice(section2Start, section2End).join('\n');
    const contacts: ContactRow[] = csv.parse(section2Content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    });

    console.log(`   Found ${contacts.length} contacts`);

    for (const row of contacts) {
      if (!row['Name'] || row['Name'] === 'Name') continue;
      if (row['Role']?.toLowerCase().includes('company page')) continue;

      const nameParts = row['Name'].trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      try {
        const companyId = companyMap.get(row['Company Name']);

        const contact = await prisma.contact.upsert({
          where: {
            email: generateEmail(row['Name'], row['Company Name']),
          },
          update: {
            firstName,
            lastName,
            role: row['Role']?.trim() || null,
            companyId: companyId || null,
          },
          create: {
            userId: user.id,
            firstName,
            lastName,
            email: generateEmail(row['Name'], row['Company Name']),
            role: row['Role']?.trim() || null,
            companyId: companyId || null,
            status: 'LEAD',
          },
        });

        console.log(`   ✓ ${row['Name']} - ${row['Role']} @ ${row['Company Name']}`);
      } catch (err) {
        console.error(`   ✗ Failed: ${row['Name']} - ${err.message}`);
      }
    }
  }

  console.log(`\n📋 Section 3: Processing company details...`);

  // Parse Section 3: Company Details (if exists)
  if (section3Start > 0) {
    const section3Content = lines.slice(section3Start).join('\n');
    const details = csv.parse(section3Content, {
      columns: false,
      skip_empty_lines: true,
    });

    for (const row of details) {
      if (!row[0] || row[0] === 'Company Name') continue;

      const companyName = row[0].trim();
      const jobPostings = row[1] || null;
      const hiringIntent = row[2] || null;
      const techStack = row[3] || null;
      const aiPitch = row[4] || null;

      const companyId = companyMap.get(companyName);
      if (!companyId) {
        console.log(`   ⚠ Company not found: ${companyName}`);
        continue;
      }

      try {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            jobPostings,
            hiringIntent,
            techStack,
            aiPitch,
            enriched: true,
            enrichedAt: new Date(),
          },
        });

        console.log(`   ✓ Enriched: ${companyName}`);
      } catch (err) {
        console.error(`   ✗ Failed to enrich: ${companyName} - ${err.message}`);
      }
    }
  }

  console.log(`\n✨ Import completed successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Companies created/updated: ${companyMap.size}`);
  console.log(`   Ready to use in your CRM!\n`);
}

function cleanUrl(url: string): string {
  if (!url) return '';
  url = url.trim();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  return url;
}

function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const cleanedUrl = cleanUrl(url);
    const domain = new URL(cleanedUrl).hostname.replace('www.', '');
    return domain;
  } catch {
    return url.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

function generateEmail(name: string, companyName: string): string {
  const namePart = name.toLowerCase().replace(/\s+/g, '.');
  const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${namePart}@${domain}.com`;
}

// Main execution
const csvPath = process.argv[2];
const userEmail = process.argv[3];

if (!csvPath || !userEmail) {
  console.error('❌ Usage: npx ts-node scripts/importDecisionMakers.ts <csv-file-path> <user-email>');
  console.error('\nExample:');
  console.error('  npx ts-node scripts/importDecisionMakers.ts "/Users/jeet/Desktop/Decision Makers[24].csv" "jeetnair.in@gmail.com"');
  process.exit(1);
}

importDecisionMakers(csvPath, userEmail)
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
