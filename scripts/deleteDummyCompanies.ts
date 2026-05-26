// @ts-nocheck
/**
 * Delete Dummy/Test Companies Script
 *
 * Deletes test companies and contacts that were created for testing purposes.
 * Keeps only real companies from CSV imports.
 *
 * Usage: npx ts-node scripts/deleteDummyCompanies.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of dummy/test company names to delete
const DUMMY_COMPANIES = [
  'Acme Corp',
  'Acme Corporation',
  'TechStart Inc',
  'Global Corp',
  'HealthPlus',
  'FinTech Solutions',
];

async function deleteDummyCompanies() {
  console.log('🗑️  Deleting Dummy/Test Companies and Contacts\n');

  let totalCompaniesDeleted = 0;
  let totalContactsDeleted = 0;

  for (const companyName of DUMMY_COMPANIES) {
    console.log(`\nProcessing: ${companyName}`);
    console.log('─'.repeat(60));

    try {
      // Find the company
      const company = await prisma.company.findFirst({
        where: { name: companyName },
        include: {
          contacts: true,
          _count: {
            select: {
              contacts: true,
              deals: true,
            },
          },
        },
      });

      if (!company) {
        console.log('   ⚠ Not found in database - skipping');
        continue;
      }

      console.log(`   📊 Found company:`);
      console.log(`      ID: ${company.id}`);
      console.log(`      Contacts: ${company._count.contacts}`);
      console.log(`      Deals: ${company._count.deals}`);

      // Delete associated contacts first
      if (company.contacts.length > 0) {
        console.log(`\n   🗑️  Deleting ${company.contacts.length} contacts...`);
        for (const contact of company.contacts) {
          console.log(`      - ${contact.firstName} ${contact.lastName} (${contact.email})`);
        }

        const deletedContacts = await prisma.contact.deleteMany({
          where: { companyId: company.id },
        });

        totalContactsDeleted += deletedContacts.count;
        console.log(`   ✓ Deleted ${deletedContacts.count} contacts`);
      }

      // Delete the company
      await prisma.company.delete({
        where: { id: company.id },
      });

      totalCompaniesDeleted++;
      console.log(`   ✓ Deleted company: ${companyName}`);

    } catch (err) {
      console.error(`   ✗ Error deleting ${companyName}: ${err.message}`);
    }
  }

  console.log('\n\n' + '═'.repeat(60));
  console.log('✨ Cleanup Completed!\n');
  console.log('📊 Summary:');
  console.log(`   Dummy Companies Deleted: ${totalCompaniesDeleted}`);
  console.log(`   Dummy Contacts Deleted: ${totalContactsDeleted}`);
  console.log('\n   ✅ Only real companies from CSV files remain');
  console.log('═'.repeat(60) + '\n');
}

// Main execution
deleteDummyCompanies()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
