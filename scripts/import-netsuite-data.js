#!/usr/bin/env node
/**
 * NetSuite Data Import Script
 *
 * Imports:
 * 1. NetSuite Users - Company Data.csv (251 companies)
 * 2. NetSuite Users - Decision Makers.csv (319 contacts)
 *
 * Features:
 * - AI-powered field mapping
 * - Automatic company-contact linking
 * - Duplicate detection
 * - Progress tracking
 * - Detailed reporting
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

// AI Field Mapping for Companies
function mapCompanyFields(headers) {
  const mapping = {};

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');

    // Company name variations
    if (normalized.match(/companyname|company|organization|business/)) {
      mapping[header] = 'name';
    }
    // Website/Domain
    else if (normalized.match(/website|domain|url|web/)) {
      mapping[header] = 'website';
    }
    // LinkedIn
    else if (normalized.match(/linkedin|linkedinurl|linkedindomain/)) {
      mapping[header] = 'linkedinUrl';
    }
    // Industry
    else if (normalized.match(/industry|sector|vertical/)) {
      mapping[header] = 'industry';
    }
    // Size
    else if (normalized.match(/size|employees|employeecount|headcount/)) {
      mapping[header] = 'size';
    }
    // Location
    else if (normalized.match(/location|address|city|country|headquarters/)) {
      mapping[header] = 'location';
    }
    // Description
    else if (normalized.match(/description|about|overview/)) {
      mapping[header] = 'description';
    }
    // Video
    else if (normalized.match(/video|videolink/)) {
      mapping[header] = 'videoLink';
    }
    // Revenue
    else if (normalized.match(/revenue|sales|turnover/)) {
      mapping[header] = 'revenue';
    }
    // Phone
    else if (normalized.match(/phone|telephone|contact/)) {
      mapping[header] = 'phone';
    }
    // Founded
    else if (normalized.match(/founded|foundedyear|established/)) {
      mapping[header] = 'foundedYear';
    }
    else {
      mapping[header] = `custom_${header}`;
    }
  });

  return mapping;
}

// AI Field Mapping for Contacts
function mapContactFields(headers) {
  const mapping = {};

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');

    // First name
    if (normalized.match(/firstname|fname|givenname/)) {
      mapping[header] = 'firstName';
    }
    // Last name
    else if (normalized.match(/lastname|lname|surname|familyname/)) {
      mapping[header] = 'lastName';
    }
    // Full name
    else if (normalized === 'name' || normalized === 'fullname') {
      mapping[header] = 'fullName';
    }
    // Email
    else if (normalized.match(/email|e-?mail|emailaddress/)) {
      mapping[header] = 'email';
    }
    // Phone
    else if (normalized.match(/phone|mobile|cell|telephone/)) {
      mapping[header] = 'phone';
    }
    // Job title
    else if (normalized.match(/title|jobtitle|position|designation/)) {
      mapping[header] = 'title';
    }
    // Company
    else if (normalized.match(/company|companyname|organization|employer/)) {
      mapping[header] = 'companyName';
    }
    // LinkedIn
    else if (normalized.match(/linkedin|linkedinurl|linkedinprofile/)) {
      mapping[header] = 'linkedinUrl';
    }
    // Status
    else if (normalized.match(/status|stage|leadstatus/)) {
      mapping[header] = 'status';
    }
    // Tags
    else if (normalized.match(/tags|labels|categories/)) {
      mapping[header] = 'tags';
    }
    else {
      mapping[header] = `custom_${header}`;
    }
  });

  return mapping;
}

// Import Companies
async function importCompanies(filePath, userId) {
  console.log('\n📦 IMPORTING COMPANIES...');
  console.log(`File: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Company CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true // Handle BOM for Excel exports
  });

  console.log(`Found ${records.length} companies in CSV`);

  if (records.length === 0) {
    throw new Error('No companies found in CSV file');
  }

  // Show headers and mapping
  const headers = Object.keys(records[0]);
  const fieldMapping = mapCompanyFields(headers);

  console.log('\n📋 Field Mapping:');
  Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
    console.log(`  ${csvField} → ${dbField}`);
  });

  const companies = [];
  const errors = [];
  let successCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      // Extract company data using mapping
      const companyData = {
        userId,
        dataSource: 'csv_import',
        importDate: new Date()
      };

      Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
        const value = record[csvField]?.trim();
        if (value && !dbField.startsWith('custom_')) {
          companyData[dbField] = value;
        }
      });

      // Ensure name exists
      if (!companyData.name) {
        errors.push({
          row: i + 2,
          error: 'Missing company name',
          data: record
        });
        continue;
      }

      // Check for duplicate
      const existing = await prisma.company.findFirst({
        where: {
          name: companyData.name,
          userId
        }
      });

      if (existing) {
        console.log(`  ⚠️  Skipping duplicate: ${companyData.name}`);
        companies.push(existing);
        continue;
      }

      // Create company
      const company = await prisma.company.create({
        data: companyData
      });

      companies.push(company);
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`  ✓ Imported ${successCount} companies...`);
      }

    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: record
      });
    }
  }

  console.log(`\n✅ Companies Import Complete:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Total companies in DB: ${companies.length}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.slice(0, 5).forEach(err => {
      console.log(`   Row ${err.row}: ${err.error}`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
  }

  return { companies, errors };
}

// Import Contacts
async function importContacts(filePath, userId, companies) {
  console.log('\n👥 IMPORTING CONTACTS...');
  console.log(`File: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Contacts CSV file not found: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });

  console.log(`Found ${records.length} contacts in CSV`);

  if (records.length === 0) {
    throw new Error('No contacts found in CSV file');
  }

  // Show headers and mapping
  const headers = Object.keys(records[0]);
  const fieldMapping = mapContactFields(headers);

  console.log('\n📋 Field Mapping:');
  Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
    console.log(`  ${csvField} → ${dbField}`);
  });

  // Create company name lookup map
  const companyMap = new Map();
  companies.forEach(company => {
    const normalizedName = company.name.toLowerCase().trim();
    companyMap.set(normalizedName, company.id);
  });

  console.log(`\n🔗 Company lookup map created: ${companyMap.size} companies`);

  const contacts = [];
  const errors = [];
  let successCount = 0;
  let linkedCount = 0;
  let unlinkedCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      // Extract contact data using mapping
      const contactData = {
        userId,
        dataSource: 'csv_import',
        status: 'LEAD'
      };

      let companyName = null;

      Object.entries(fieldMapping).forEach(([csvField, dbField]) => {
        const value = record[csvField]?.trim();

        if (!value) return;

        if (dbField === 'fullName') {
          // Split full name into first and last
          const parts = value.split(' ').filter(p => p);
          if (parts.length > 0) {
            contactData.firstName = parts[0];
            contactData.lastName = parts.slice(1).join(' ') || '';
          }
        } else if (dbField === 'companyName') {
          companyName = value;
        } else if (!dbField.startsWith('custom_')) {
          contactData[dbField] = value;
        }
      });

      // Ensure first name exists
      if (!contactData.firstName) {
        errors.push({
          row: i + 2,
          error: 'Missing first name',
          data: record
        });
        continue;
      }

      if (!contactData.lastName) {
        contactData.lastName = '';
      }

      // Link to company
      if (companyName) {
        const normalizedCompanyName = companyName.toLowerCase().trim();
        const companyId = companyMap.get(normalizedCompanyName);

        if (companyId) {
          contactData.companyId = companyId;
          linkedCount++;
        } else {
          unlinkedCount++;
          console.log(`  ⚠️  Company not found: "${companyName}" for ${contactData.firstName} ${contactData.lastName}`);
        }
      } else {
        unlinkedCount++;
      }

      // Check for duplicate
      const duplicateCheck = [];
      if (contactData.email) {
        duplicateCheck.push({ email: contactData.email, userId });
      }
      if (contactData.firstName && contactData.lastName && contactData.companyId) {
        duplicateCheck.push({
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          companyId: contactData.companyId,
          userId
        });
      }

      if (duplicateCheck.length > 0) {
        const existing = await prisma.contact.findFirst({
          where: { OR: duplicateCheck }
        });

        if (existing) {
          console.log(`  ⚠️  Skipping duplicate: ${contactData.firstName} ${contactData.lastName}`);
          continue;
        }
      }

      // Create contact
      const contact = await prisma.contact.create({
        data: contactData
      });

      contacts.push(contact);
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`  ✓ Imported ${successCount} contacts (${linkedCount} linked)...`);
      }

    } catch (error) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: record
      });
    }
  }

  console.log(`\n✅ Contacts Import Complete:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Linked to companies: ${linkedCount}`);
  console.log(`   Without company: ${unlinkedCount}`);
  console.log(`   Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.slice(0, 5).forEach(err => {
      console.log(`   Row ${err.row}: ${err.error}`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more errors`);
    }
  }

  return { contacts, errors, linkedCount, unlinkedCount };
}

// Verify Import
async function verifyImport(userId) {
  console.log('\n🔍 VERIFYING IMPORT...');

  const companyCount = await prisma.company.count({ where: { userId } });
  const contactCount = await prisma.contact.count({ where: { userId } });
  const linkedContactCount = await prisma.contact.count({
    where: { userId, companyId: { not: null } }
  });

  console.log(`\n📊 Database Status:`);
  console.log(`   Companies: ${companyCount}`);
  console.log(`   Contacts: ${contactCount}`);
  console.log(`   Linked Contacts: ${linkedContactCount}`);
  console.log(`   Unlinked Contacts: ${contactCount - linkedContactCount}`);

  // Sample data
  const sampleCompany = await prisma.company.findFirst({
    where: { userId },
    include: {
      contacts: {
        take: 3,
        select: {
          firstName: true,
          lastName: true,
          title: true,
          email: true
        }
      }
    }
  });

  if (sampleCompany) {
    console.log(`\n📋 Sample Company:`);
    console.log(`   Name: ${sampleCompany.name}`);
    console.log(`   Industry: ${sampleCompany.industry || 'N/A'}`);
    console.log(`   Location: ${sampleCompany.location || 'N/A'}`);
    console.log(`   Contacts: ${sampleCompany.contacts.length}`);

    if (sampleCompany.contacts.length > 0) {
      console.log(`\n   Sample Contacts:`);
      sampleCompany.contacts.forEach(contact => {
        console.log(`     - ${contact.firstName} ${contact.lastName} (${contact.title || 'No title'})`);
      });
    }
  }

  return {
    companyCount,
    contactCount,
    linkedContactCount,
    unlinkedCount: contactCount - linkedContactCount
  };
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  NETSUITE DATA IMPORT - AI-POWERED CSV MAPPING');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    // Get user ID from environment or first user
    let userId = process.env.USER_ID;

    if (!userId) {
      const users = await prisma.user.findMany({ take: 1 });
      if (users.length === 0) {
        throw new Error('No users found in database. Please create a user first.');
      }
      userId = users[0].id;
      console.log(`Using user ID: ${userId}\n`);
    }

    // Define file paths
    const basePath = process.env.CSV_PATH || '/Users/jeet/Documents/CRM Module';
    const companyFile = path.join(basePath, 'NetSuite Users - Company Data.csv');
    const contactFile = path.join(basePath, 'NetSuite Users - Decision Makers.csv');

    console.log(`📁 Base path: ${basePath}`);
    console.log(`📁 Company file: ${companyFile}`);
    console.log(`📁 Contact file: ${contactFile}\n`);

    // Import companies
    const companyResult = await importCompanies(companyFile, userId);

    // Import contacts
    const contactResult = await importContacts(contactFile, userId, companyResult.companies);

    // Verify import
    const stats = await verifyImport(userId);

    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  IMPORT COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n⏱️  Duration: ${duration} seconds`);
    console.log(`\n✅ Final Statistics:`);
    console.log(`   Companies: ${stats.companyCount}`);
    console.log(`   Contacts: ${stats.contactCount}`);
    console.log(`   Linked: ${stats.linkedContactCount}`);
    console.log(`   Unlinked: ${stats.unlinkedCount}`);
    console.log(`   Success Rate: ${((stats.linkedContactCount / stats.contactCount) * 100).toFixed(1)}%`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ IMPORT FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { importCompanies, importContacts, verifyImport };
