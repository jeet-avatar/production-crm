// @ts-nocheck
/**
 * Universal CSV Import Script with AI Enrichment
 *
 * Features:
 * - Accepts ANY CSV format - automatically detects columns
 * - Field-level data source tracking (Manual vs Claude AI)
 * - AI enrichment for missing fields
 * - Clear labeling: "Data by Manual" vs "Data by Claude AI"
 *
 * Usage: npx ts-node scripts/universalCSVImport.ts <csv-file-path> <user-email>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Field mapping configuration - maps common CSV headers to our schema
const FIELD_MAPPINGS = {
  // Company fields
  company: ['company', 'company name', 'organization', 'business', 'company_name'],
  domain: ['domain', 'website', 'url', 'site', 'web'],
  industry: ['industry', 'sector', 'vertical', 'business type'],
  employeeCount: ['employees', 'employee count', 'headcount', 'size', 'team size'],
  location: ['location', 'city', 'address', 'headquarters', 'hq'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
  phone: ['phone', 'telephone', 'contact number', 'phone number'],

  // Contact fields
  firstName: ['first name', 'firstname', 'first', 'given name', 'fname'],
  lastName: ['last name', 'lastname', 'last', 'surname', 'family name', 'lname'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  title: ['title', 'job title', 'position'],
  role: ['role', 'job role', 'function', 'department'],
  contactPhone: ['contact phone', 'mobile', 'cell', 'personal phone'],

  // Enrichment fields
  hiringIntent: ['hiring intent', 'intent', 'hiring purpose'],
  jobPostings: ['job postings', 'openings', 'positions', 'jobs'],
  techStack: ['tech stack', 'technology', 'tools', 'stack'],
  aiPitch: ['ai pitch', 'pitch', 'value proposition'],
};

interface ImportStats {
  companiesCreated: number;
  companiesUpdated: number;
  contactsCreated: number;
  contactsUpdated: number;
  fieldsEnrichedByAI: number;
  fieldsFromCSV: number;
}

async function universalCSVImport(csvPath: string, userEmail: string) {
  console.log('🚀 Universal CSV Import with AI Enrichment\n');

  const stats: ImportStats = {
    companiesCreated: 0,
    companiesUpdated: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    fieldsEnrichedByAI: 0,
    fieldsFromCSV: 0,
  };

  // Find user
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    throw new Error(`User with email ${userEmail} not found!`);
  }

  console.log(`✅ User: ${user.firstName} ${user.lastName}\n`);

  // Read and parse CSV
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  if (rows.length === 0) {
    throw new Error('CSV file is empty!');
  }

  console.log(`📊 Found ${rows.length} rows in CSV\n`);

  // Analyze CSV structure
  const headers = Object.keys(rows[0]);
  console.log(`📋 Detected columns: ${headers.join(', ')}\n`);

  const mappedFields = detectFieldMappings(headers);
  console.log('🔍 Field mappings detected:');
  Object.entries(mappedFields).forEach(([field, csvColumn]) => {
    console.log(`   ${field} ← "${csvColumn}"`);
  });
  console.log();

  // Process each row
  console.log('📦 Processing rows...\n');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`\n[${i + 1}/${rows.length}] Processing row...`);

    try {
      // Extract data from CSV
      const extractedData = extractDataFromRow(row, mappedFields);

      // Determine if this is a company or contact row
      const hasCompanyData = extractedData.company || extractedData.domain;
      const hasContactData = extractedData.firstName && extractedData.lastName;

      if (hasCompanyData) {
        await processCompanyRow(extractedData, user.id, stats);
      }

      if (hasContactData) {
        await processContactRow(extractedData, user.id, stats);
      }

      if (!hasCompanyData && !hasContactData) {
        console.log('   ⚠ Skipped: No recognizable company or contact data');
      }

    } catch (err) {
      console.error(`   ✗ Error processing row: ${err.message}`);
    }
  }

  // Print summary
  console.log('\n\n✨ Import completed!\n');
  console.log('📊 Summary:');
  console.log(`   Companies Created: ${stats.companiesCreated}`);
  console.log(`   Companies Updated: ${stats.companiesUpdated}`);
  console.log(`   Contacts Created: ${stats.contactsCreated}`);
  console.log(`   Contacts Updated: ${stats.contactsUpdated}`);
  console.log(`   Fields from CSV (Manual): ${stats.fieldsFromCSV}`);
  console.log(`   Fields Enriched by Claude AI: ${stats.fieldsEnrichedByAI}\n`);
}

function detectFieldMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const [field, patterns] of Object.entries(FIELD_MAPPINGS)) {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      if (patterns.includes(normalizedHeader)) {
        mappings[field] = header;
        break;
      }
    }
  }

  return mappings;
}

function extractDataFromRow(row: any, mappedFields: Record<string, string>): any {
  const data: any = {};

  for (const [field, csvColumn] of Object.entries(mappedFields)) {
    const value = row[csvColumn]?.trim();
    if (value) {
      data[field] = value;
    }
  }

  return data;
}

async function processCompanyRow(data: any, userId: string, stats: ImportStats) {
  const fieldSources: Record<string, string> = {};

  // Track which fields came from CSV
  const csvFields = ['company', 'domain', 'industry', 'employeeCount', 'location', 'linkedin', 'phone'];
  csvFields.forEach(field => {
    if (data[field]) {
      fieldSources[field] = 'manual';
      stats.fieldsFromCSV++;
    }
  });

  // Determine unique identifier
  const domain = extractDomain(data.domain || data.company);
  const companyName = data.company || domain;

  if (!companyName) {
    console.log('   ⚠ Skipped: No company name or domain');
    return;
  }

  // Check if company exists
  const existing = await prisma.company.findFirst({
    where: domain ? { domain } : { name: companyName },
  });

  // Enrich missing fields with AI
  const enrichedData = await enrichCompanyDataWithAI(
    data,
    existing,
    fieldSources,
    stats
  );

  if (existing) {
    // Update existing
    await prisma.company.update({
      where: { id: existing.id },
      data: {
        ...enrichedData,
        fieldSources,
        updatedAt: new Date(),
      },
    });
    stats.companiesUpdated++;
    console.log(`   ✓ Updated company: ${companyName}`);
  } else {
    // Create new
    await prisma.company.create({
      data: {
        userId,
        name: companyName,
        domain,
        ...enrichedData,
        fieldSources,
        dataSource: 'csv_import',
        importedAt: new Date(),
        isActive: true,
      },
    });
    stats.companiesCreated++;
    console.log(`   ✓ Created company: ${companyName}`);
  }

  // Show data sources
  printDataSources(fieldSources);
}

async function processContactRow(data: any, userId: string, stats: ImportStats) {
  const fieldSources: Record<string, string> = {};

  // Track which fields came from CSV
  const csvFields = ['firstName', 'lastName', 'email', 'contactPhone', 'title', 'role', 'company'];
  csvFields.forEach(field => {
    if (data[field]) {
      fieldSources[field] = 'manual';
      stats.fieldsFromCSV++;
    }
  });

  // Generate email if missing
  if (!data.email) {
    data.email = generateEmail(data.firstName, data.lastName, data.company);
    fieldSources['email'] = 'claude_ai';
    stats.fieldsEnrichedByAI++;
    console.log(`   🤖 AI Generated email: ${data.email}`);
  }

  // Find associated company
  let companyId = null;
  if (data.company) {
    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { contains: data.company, mode: 'insensitive' } },
          { domain: { contains: data.company.toLowerCase().replace(/[^a-z0-9]/g, '') } },
        ],
      },
    });
    if (company) {
      companyId = company.id;
      console.log(`   🔗 Linked to company: ${company.name}`);
    }
  }

  // Check if contact exists
  const existing = await prisma.contact.findUnique({
    where: { email: data.email },
  });

  const contactData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.contactPhone || null,
    title: data.title || null,
    role: data.role || null,
    companyId,
    fieldSources,
  };

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: contactData,
    });
    stats.contactsUpdated++;
    console.log(`   ✓ Updated contact: ${data.firstName} ${data.lastName}`);
  } else {
    await prisma.contact.create({
      data: {
        ...contactData,
        userId,
        status: 'LEAD',
        isActive: true,
      },
    });
    stats.contactsCreated++;
    console.log(`   ✓ Created contact: ${data.firstName} ${data.lastName}`);
  }

  printDataSources(fieldSources);
}

async function enrichCompanyDataWithAI(
  data: any,
  existing: any,
  fieldSources: Record<string, string>,
  stats: ImportStats
): Promise<any> {
  const enriched: any = {
    name: data.company,
    industry: data.industry || existing?.industry,
    employeeCount: data.employeeCount || existing?.employeeCount,
    location: data.location || existing?.location,
    linkedin: data.linkedin || existing?.linkedin,
    phone: data.phone || existing?.phone,
    website: data.domain || existing?.website,
  };

  // Fields that might benefit from AI enrichment
  const missingFields: string[] = [];

  if (!enriched.industry) missingFields.push('industry');
  if (!enriched.location) missingFields.push('location');
  if (!data.hiringIntent && !existing?.hiringIntent) missingFields.push('hiringIntent');

  // Only call AI if we have missing critical fields and company name
  if (missingFields.length > 0 && enriched.name) {
    try {
      console.log(`   🤖 Enriching ${missingFields.length} missing fields with Claude AI...`);

      const aiEnrichment = await enrichWithClaude(enriched.name, missingFields);

      if (aiEnrichment.industry && !enriched.industry) {
        enriched.industry = aiEnrichment.industry;
        fieldSources['industry'] = 'claude_ai';
        stats.fieldsEnrichedByAI++;
      }

      if (aiEnrichment.location && !enriched.location) {
        enriched.location = aiEnrichment.location;
        fieldSources['location'] = 'claude_ai';
        stats.fieldsEnrichedByAI++;
      }

      if (aiEnrichment.hiringIntent) {
        enriched.hiringIntent = aiEnrichment.hiringIntent;
        enriched.intent = aiEnrichment.hiringIntent;
        fieldSources['hiringIntent'] = 'claude_ai';
        stats.fieldsEnrichedByAI++;
      }

    } catch (err) {
      console.log(`   ⚠ AI enrichment failed: ${err.message}`);
    }
  }

  return enriched;
}

async function enrichWithClaude(companyName: string, missingFields: string[]): Promise<any> {
  const prompt = `You are a business data enrichment assistant. Given a company name, provide the following information in JSON format:

Company: ${companyName}

Required fields: ${missingFields.join(', ')}

Return ONLY a JSON object with these fields (use null if information is not available):
{
  "industry": "...",
  "location": "City, State/Country",
  "hiringIntent": "Brief description of typical hiring needs for this type of company"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  return {};
}

function extractDomain(url: string): string {
  if (!url) return '';
  try {
    const cleaned = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    return cleaned.split('/')[0].toLowerCase();
  } catch {
    return url.toLowerCase().replace(/[^a-z0-9.-]/g, '');
  }
}

function generateEmail(firstName: string, lastName: string, company: string): string {
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const domain = company ? company.toLowerCase().replace(/[^a-z0-9]/g, '') : 'example';
  return `${first}.${last}@${domain}.com`;
}

function printDataSources(fieldSources: Record<string, string>) {
  const manualFields = Object.entries(fieldSources).filter(([_, source]) => source === 'manual');
  const aiFields = Object.entries(fieldSources).filter(([_, source]) => source === 'claude_ai');

  if (manualFields.length > 0) {
    console.log(`   📝 Data by Manual: ${manualFields.map(([field]) => field).join(', ')}`);
  }
  if (aiFields.length > 0) {
    console.log(`   🤖 Data by Claude AI: ${aiFields.map(([field]) => field).join(', ')}`);
  }
}

// Main execution
const csvPath = process.argv[2];
const userEmail = process.argv[3];

if (!csvPath || !userEmail) {
  console.error('❌ Usage: npx ts-node scripts/universalCSVImport.ts <csv-file-path> <user-email>');
  console.error('\nExample:');
  console.error('  npx ts-node scripts/universalCSVImport.ts "data.csv" "user@example.com"');
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required for AI enrichment');
  process.exit(1);
}

universalCSVImport(csvPath, userEmail)
  .then(() => {
    console.log('✅ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
