// @ts-nocheck
/**
 * NetSuite Data Import Script
 *
 * Imports 3 CSV files:
 * 1. Netsuite Users-Table 1.csv: Company information
 * 2. Company Personals-Table 1.csv: Contact persons (3-4 per company)
 * 3. Pitch-Table 1.csv: Company details (hiring info, intent, pitch)
 *
 * Usage: npx ts-node scripts/importNetsuiteData.ts <folder-path> <user-email>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import * as path from 'path';

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

interface PitchRow {
  'Company Name': string;
  'Recent Hiring Post': string;
  'Intent of hiring for the position': string;
  'Using NetSuite': string;
  'Pitch for Agentic AI': string;
}

async function importNetsuiteData(folderPath: string, userEmail: string) {
  console.log('🚀 Starting NetSuite Data Import...\n');

  // Find user
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    throw new Error(`User with email ${userEmail} not found!`);
  }

  console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})\n`);

  // Manual company name aliases for known mismatches
  const companyAliases = new Map<string, string>([
    ['Abernathy', 'Abernathy Company'],
    ['Accelerate Learning Inc.', 'Accelerate Learning'],
    ['ActionHealth', 'Action Health'],
  ]);

  // File paths
  const companiesFile = path.join(folderPath, 'Netsuite Users-Table 1.csv');
  const contactsFile = path.join(folderPath, 'Company Personals-Table 1.csv');
  const pitchFile = path.join(folderPath, 'Pitch-Table 1.csv');

  // Verify files exist
  if (!fs.existsSync(companiesFile)) {
    throw new Error(`Companies file not found: ${companiesFile}`);
  }
  if (!fs.existsSync(contactsFile)) {
    throw new Error(`Contacts file not found: ${contactsFile}`);
  }
  if (!fs.existsSync(pitchFile)) {
    throw new Error(`Pitch file not found: ${pitchFile}`);
  }

  console.log('📁 Found all 3 CSV files\n');

  // Step 1: Import Companies
  console.log('📦 Step 1: Importing companies from Netsuite Users-Table 1.csv...');
  const companiesContent = fs.readFileSync(companiesFile, 'utf-8');
  const companies: CompanyRow[] = csv.parse(companiesContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  const companyMap = new Map<string, string>(); // company name -> company ID
  let companiesImported = 0;

  for (const row of companies) {
    if (!row['Company Name']) continue;

    try {
      const domain = extractDomain(row['Website Search']);

      const company = await prisma.company.upsert({
        where: { domain },
        update: {
          name: row['Company Name'],
          linkedin: cleanUrl(row['LinkedIn Search']),
          website: cleanUrl(row['Website Search']),
          employeeCount: row['Employee Count Search']?.trim() || null,
          dataSource: 'csv_import',
          importedAt: new Date(),
        },
        create: {
          userId: user.id,
          name: row['Company Name'],
          domain,
          linkedin: cleanUrl(row['LinkedIn Search']),
          website: cleanUrl(row['Website Search']),
          employeeCount: row['Employee Count Search']?.trim() || null,
          dataSource: 'csv_import',
          importedAt: new Date(),
          isActive: true,
        },
      });

      companyMap.set(row['Company Name'], company.id);

      // Also map by domain for better matching
      if (domain) {
        companyMap.set(domain, company.id);
      }

      // Map by website URL keywords for fuzzy matching
      const websiteKeywords = extractKeywords(row['Website Search']);
      websiteKeywords.forEach(keyword => {
        if (!companyMap.has(keyword)) {
          companyMap.set(keyword, company.id);
        }
      });

      companiesImported++;
      console.log(`   ✓ ${row['Company Name']}`);
    } catch (err) {
      console.error(`   ✗ Failed: ${row['Company Name']} - ${err.message}`);
    }
  }

  console.log(`\n✅ Imported ${companiesImported} companies\n`);

  // Step 2: Import Contacts
  console.log('📇 Step 2: Importing contacts from Company Personals-Table 1.csv...');
  const contactsContent = fs.readFileSync(contactsFile, 'utf-8');
  const contacts: ContactRow[] = csv.parse(contactsContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  let contactsImported = 0;
  let contactsSkipped = 0;

  for (const row of contacts) {
    if (!row['Name'] || row['Name'] === 'Name') continue;

    // Skip "Company Page" entries
    if (row['Role']?.toLowerCase().includes('company page')) {
      contactsSkipped++;
      continue;
    }

    const nameParts = row['Name'].trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      // Try exact match first
      let companyId = companyMap.get(row['Company Name']);

      // Try alias match
      if (!companyId && companyAliases.has(row['Company Name'])) {
        const aliasName = companyAliases.get(row['Company Name'])!;
        companyId = companyMap.get(aliasName);
        if (companyId) {
          console.log(`   🔗 Alias matched "${row['Company Name']}" → "${aliasName}"`);
        }
      }

      // If not found, try fuzzy matching by company name keywords
      if (!companyId) {
        const keywords = extractKeywords(row['Company Name']);
        for (const keyword of keywords) {
          companyId = companyMap.get(keyword);
          if (companyId) {
            console.log(`   🔍 Fuzzy matched "${row['Company Name']}" via keyword "${keyword}"`);
            break;
          }
        }
      }

      if (!companyId) {
        console.log(`   ⚠ Company not found for contact: ${row['Name']} @ ${row['Company Name']}`);
        continue;
      }

      // Generate unique email
      const email = generateEmail(row['Name'], row['Company Name']);

      const contact = await prisma.contact.upsert({
        where: { email },
        update: {
          firstName,
          lastName,
          role: row['Role']?.trim() || null,
          companyId,
        },
        create: {
          userId: user.id,
          firstName,
          lastName,
          email,
          role: row['Role']?.trim() || null,
          companyId,
          status: 'LEAD',
          isActive: true,
        },
      });

      contactsImported++;
      console.log(`   ✓ ${row['Name']} - ${row['Role']} @ ${row['Company Name']}`);
    } catch (err) {
      console.error(`   ✗ Failed: ${row['Name']} - ${err.message}`);
    }
  }

  console.log(`\n✅ Imported ${contactsImported} contacts (skipped ${contactsSkipped} company pages)\n`);

  // Step 3: Import Company Details (Pitch data)
  console.log('📋 Step 3: Importing company details from Pitch-Table 1.csv...');
  const pitchContent = fs.readFileSync(pitchFile, 'utf-8');
  const pitchData: PitchRow[] = csv.parse(pitchContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  let detailsImported = 0;

  for (const row of pitchData) {
    if (!row['Company Name']) continue;

    // Try exact match first
    let companyId = companyMap.get(row['Company Name']);

    // Try alias match
    if (!companyId && companyAliases.has(row['Company Name'])) {
      const aliasName = companyAliases.get(row['Company Name'])!;
      companyId = companyMap.get(aliasName);
      if (companyId) {
        console.log(`   🔗 Alias matched "${row['Company Name']}" → "${aliasName}"`);
      }
    }

    // If not found, try fuzzy matching by company name keywords
    if (!companyId) {
      const keywords = extractKeywords(row['Company Name']);
      for (const keyword of keywords) {
        companyId = companyMap.get(keyword);
        if (companyId) {
          console.log(`   🔍 Fuzzy matched "${row['Company Name']}" via keyword "${keyword}"`);
          break;
        }
      }
    }

    if (!companyId) {
      console.log(`   ⚠ Company not found: ${row['Company Name']}`);
      continue;
    }

    try {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          jobPostings: row['Recent Hiring Post'] || null,
          hiringIntent: row['Intent of hiring for the position'] || null,
          intent: row['Intent of hiring for the position'] || null,
          hiringInfo: row['Recent Hiring Post'] || null,
          aiPitch: row['Pitch for Agentic AI'] || null,
          enriched: true,
          enrichedAt: new Date(),
        },
      });

      detailsImported++;
      console.log(`   ✓ Enriched: ${row['Company Name']}`);
    } catch (err) {
      console.error(`   ✗ Failed to enrich: ${row['Company Name']} - ${err.message}`);
    }
  }

  console.log(`\n✅ Enriched ${detailsImported} companies with pitch data\n`);

  // Summary
  console.log('✨ Import completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   Companies: ${companiesImported}`);
  console.log(`   Contacts: ${contactsImported}`);
  console.log(`   Enriched: ${detailsImported}\n`);
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

function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Clean and split the text
  const cleaned = text.toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/\.com|\.org|\.net|\.io/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

  const words = cleaned.split(/\s+/).filter(word => word.length > 2);

  // Return unique keywords (both individual words and the full cleaned text)
  const keywords = new Set(words);
  keywords.add(cleaned.replace(/\s+/g, ''));

  return Array.from(keywords);
}

// Main execution
const folderPath = process.argv[2];
const userEmail = process.argv[3];

if (!folderPath || !userEmail) {
  console.error('❌ Usage: npx ts-node scripts/importNetsuiteData.ts <folder-path> <user-email>');
  console.error('\nExample:');
  console.error('  npx ts-node scripts/importNetsuiteData.ts "/Users/jeet/Desktop/Decision Makers crm upload" "jeetnair.in@gmail.com"');
  process.exit(1);
}

importNetsuiteData(folderPath, userEmail)
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
