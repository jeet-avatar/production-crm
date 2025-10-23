import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllData() {
  console.log('🗑️  Starting deletion of all companies and contacts...\n');

  try {
    // Step 1: Get counts before deletion
    const contactCount = await prisma.contact.count();
    const companyCount = await prisma.company.count();
    const dealCount = await prisma.deal.count();
    const campaignCompanyCount = await prisma.campaignCompany.count();

    console.log('📊 Current database state:');
    console.log(`   - Contacts: ${contactCount}`);
    console.log(`   - Companies: ${companyCount}`);
    console.log(`   - Deals: ${dealCount}`);
    console.log(`   - Campaign-Company Relations: ${campaignCompanyCount}\n`);

    if (contactCount === 0 && companyCount === 0) {
      console.log('✅ Database is already empty. Nothing to delete.');
      return;
    }

    // Step 2: Delete in correct order (respecting foreign key constraints)
    console.log('🔄 Deleting data in correct order...\n');

    // Delete deals (references Company and Contact)
    console.log('[1/4] Deleting deals...');
    const deletedDeals = await prisma.deal.deleteMany({});
    console.log(`   ✓ Deleted ${deletedDeals.count} deals\n`);

    // Delete campaign-company relationships (references Company)
    console.log('[2/4] Deleting campaign-company relationships...');
    const deletedCampaignCompanies = await prisma.campaignCompany.deleteMany({});
    console.log(`   ✓ Deleted ${deletedCampaignCompanies.count} campaign-company relationships\n`);

    // Delete contacts (references Company)
    console.log('[3/4] Deleting all contacts...');
    const deletedContacts = await prisma.contact.deleteMany({});
    console.log(`   ✓ Deleted ${deletedContacts.count} contacts\n`);

    // Delete companies (no dependencies left)
    console.log('[4/4] Deleting all companies...');
    const deletedCompanies = await prisma.company.deleteMany({});
    console.log(`   ✓ Deleted ${deletedCompanies.count} companies\n`);

    // Step 3: Verify deletion
    const finalContactCount = await prisma.contact.count();
    const finalCompanyCount = await prisma.company.count();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ DELETION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📊 Final database state:`);
    console.log(`   - Contacts: ${finalContactCount}`);
    console.log(`   - Companies: ${finalCompanyCount}\n`);

    if (finalContactCount === 0 && finalCompanyCount === 0) {
      console.log('✅ All companies and contacts successfully deleted!');
      console.log('   You can now import fresh data via CSV.');
    } else {
      console.warn('⚠️  Warning: Some records may remain. Please check manually.');
    }

  } catch (error: any) {
    console.error('❌ ERROR during deletion:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteAllData()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
