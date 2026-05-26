#!/usr/bin/env node
/**
 * Contact Management Script
 *
 * Usage:
 *   node scripts/manage-contacts.js list-companies
 *   node scripts/manage-contacts.js view-company "Company Name"
 *   node scripts/manage-contacts.js delete-contacts-by-company "Company Name"
 *   node scripts/manage-contacts.js delete-duplicates
 *   node scripts/manage-contacts.js stats
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listCompanies() {
  console.log('\n=== ALL COMPANIES ===\n');

  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: { contacts: true }
      }
    },
    orderBy: {
      contacts: {
        _count: 'desc'
      }
    }
  });

  companies.forEach((company, index) => {
    console.log(`${index + 1}. ${company.name}`);
    console.log(`   Contacts: ${company._count.contacts}`);
    console.log(`   Domain: ${company.domain || 'N/A'}`);
    console.log(`   Created: ${company.createdAt.toLocaleDateString()}`);
    console.log(`   Data Source: ${company.dataSource || 'manual'}`);
    console.log(`   ID: ${company.id}`);
    console.log('');
  });

  console.log(`Total Companies: ${companies.length}\n`);
}

async function viewCompany(companyName) {
  console.log(`\n=== VIEWING COMPANY: ${companyName} ===\n`);

  const company = await prisma.company.findFirst({
    where: {
      name: {
        contains: companyName,
        mode: 'insensitive'
      }
    },
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  });

  if (!company) {
    console.log(`❌ Company "${companyName}" not found\n`);
    return;
  }

  console.log('Company Details:');
  console.log(`- Name: ${company.name}`);
  console.log(`- Domain: ${company.domain || 'N/A'}`);
  console.log(`- Industry: ${company.industry || 'N/A'}`);
  console.log(`- Size: ${company.size || 'N/A'}`);
  console.log(`- Location: ${company.location || 'N/A'}`);
  console.log(`- Website: ${company.website || 'N/A'}`);
  console.log(`- Total Contacts: ${company._count.contacts}`);
  console.log(`- Created: ${company.createdAt}`);
  console.log(`- Data Source: ${company.dataSource || 'manual'}`);
  console.log('\n');

  // Get sample contacts
  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      title: true,
      status: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('Sample Contacts (first 10):');
  contacts.forEach((contact, index) => {
    console.log(`${index + 1}. ${contact.firstName} ${contact.lastName}`);
    console.log(`   Email: ${contact.email || 'N/A'}`);
    console.log(`   Phone: ${contact.phone || 'N/A'}`);
    console.log(`   Title: ${contact.title || 'N/A'}`);
    console.log(`   Status: ${contact.status}`);
    console.log(`   Created: ${contact.createdAt.toLocaleDateString()}`);
    console.log('');
  });

  if (company._count.contacts > 10) {
    console.log(`... and ${company._count.contacts - 10} more contacts\n`);
  }
}

async function deleteContactsByCompany(companyName, confirm = false) {
  console.log(`\n=== DELETE CONTACTS FOR: ${companyName} ===\n`);

  const company = await prisma.company.findFirst({
    where: {
      name: {
        contains: companyName,
        mode: 'insensitive'
      }
    },
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  });

  if (!company) {
    console.log(`❌ Company "${companyName}" not found\n`);
    return;
  }

  console.log(`Found: ${company.name}`);
  console.log(`Total Contacts: ${company._count.contacts}\n`);

  if (!confirm) {
    console.log('⚠️  DRY RUN MODE (use --confirm to actually delete)\n');
    console.log('This would delete all contacts for this company.');
    console.log(`\nTo confirm deletion, run:`);
    console.log(`node scripts/manage-contacts.js delete-contacts-by-company "${companyName}" --confirm\n`);
    return;
  }

  console.log('🗑️  DELETING CONTACTS...\n');

  const deleted = await prisma.contact.deleteMany({
    where: { companyId: company.id }
  });

  console.log(`✅ Deleted ${deleted.count} contacts\n`);

  // Ask if we should delete the company too
  console.log('Company still exists (empty). To delete the company, run:');
  console.log(`node scripts/manage-contacts.js delete-company "${company.id}"\n`);
}

async function deleteDuplicates() {
  console.log('\n=== FINDING DUPLICATE CONTACTS ===\n');

  // Find duplicate emails
  const duplicateEmails = await prisma.$queryRaw`
    SELECT email, "userId", COUNT(*) as count
    FROM "Contact"
    WHERE email IS NOT NULL
    GROUP BY email, "userId"
    HAVING COUNT(*) > 1
  `;

  if (duplicateEmails.length === 0) {
    console.log('✅ No duplicate emails found\n');
  } else {
    console.log(`Found ${duplicateEmails.length} duplicate emails:\n`);

    for (const dup of duplicateEmails) {
      console.log(`Email: ${dup.email} (${dup.count} times)`);

      const contacts = await prisma.contact.findMany({
        where: {
          email: dup.email,
          userId: dup.userId
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log('  Keeping oldest:');
      console.log(`    ID: ${contacts[0].id}, Created: ${contacts[0].createdAt}`);
      console.log('  Removing:');

      for (let i = 1; i < contacts.length; i++) {
        console.log(`    ID: ${contacts[i].id}, Created: ${contacts[i].createdAt}`);
      }
      console.log('');
    }
  }
}

async function getStats() {
  console.log('\n=== DATABASE STATISTICS ===\n');

  const totalContacts = await prisma.contact.count();
  const totalCompanies = await prisma.company.count();
  const totalUsers = await prisma.user.count();

  console.log(`Total Contacts: ${totalContacts}`);
  console.log(`Total Companies: ${totalCompanies}`);
  console.log(`Total Users: ${totalUsers}`);
  console.log('');

  // Contacts by status
  const byStatus = await prisma.contact.groupBy({
    by: ['status'],
    _count: true
  });

  console.log('Contacts by Status:');
  byStatus.forEach(s => {
    console.log(`  ${s.status}: ${s._count}`);
  });
  console.log('');

  // Contacts by data source
  const bySource = await prisma.contact.groupBy({
    by: ['dataSource'],
    _count: true
  });

  console.log('Contacts by Data Source:');
  bySource.forEach(s => {
    console.log(`  ${s.dataSource || 'manual'}: ${s._count}`);
  });
  console.log('');

  // Top companies
  const topCompanies = await prisma.company.findMany({
    include: {
      _count: {
        select: { contacts: true }
      }
    },
    orderBy: {
      contacts: {
        _count: 'desc'
      }
    },
    take: 10
  });

  console.log('Top 10 Companies by Contact Count:');
  topCompanies.forEach((company, index) => {
    console.log(`  ${index + 1}. ${company.name} - ${company._count.contacts} contacts`);
  });
  console.log('');
}

async function deleteCompany(companyId, confirm = false) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: { contacts: true }
      }
    }
  });

  if (!company) {
    console.log(`❌ Company with ID "${companyId}" not found\n`);
    return;
  }

  if (company._count.contacts > 0) {
    console.log(`⚠️  Cannot delete company "${company.name}" - it has ${company._count.contacts} contacts`);
    console.log('Delete contacts first using: delete-contacts-by-company\n');
    return;
  }

  if (!confirm) {
    console.log(`⚠️  DRY RUN MODE\n`);
    console.log(`This would delete company: ${company.name}`);
    console.log(`\nTo confirm, run:`);
    console.log(`node scripts/manage-contacts.js delete-company "${companyId}" --confirm\n`);
    return;
  }

  await prisma.company.delete({
    where: { id: companyId }
  });

  console.log(`✅ Deleted company: ${company.name}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  const confirm = args.includes('--confirm');

  try {
    switch (command) {
      case 'list-companies':
        await listCompanies();
        break;

      case 'view-company':
        if (!param) {
          console.log('Usage: node scripts/manage-contacts.js view-company "Company Name"');
          break;
        }
        await viewCompany(param);
        break;

      case 'delete-contacts-by-company':
        if (!param) {
          console.log('Usage: node scripts/manage-contacts.js delete-contacts-by-company "Company Name" [--confirm]');
          break;
        }
        await deleteContactsByCompany(param, confirm);
        break;

      case 'delete-company':
        if (!param) {
          console.log('Usage: node scripts/manage-contacts.js delete-company "company-id" [--confirm]');
          break;
        }
        await deleteCompany(param, confirm);
        break;

      case 'delete-duplicates':
        await deleteDuplicates();
        break;

      case 'stats':
        await getStats();
        break;

      default:
        console.log('\nContact Management Script\n');
        console.log('Available commands:');
        console.log('  list-companies                           - List all companies with contact counts');
        console.log('  view-company "Company Name"              - View company details and contacts');
        console.log('  delete-contacts-by-company "Name"        - Delete all contacts for a company');
        console.log('  delete-company "company-id"              - Delete an empty company');
        console.log('  delete-duplicates                        - Find and show duplicate contacts');
        console.log('  stats                                    - Show database statistics');
        console.log('\nUse --confirm flag to actually execute deletions\n');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
