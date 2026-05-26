const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndClean() {
  try {
    console.log('\n🔍 CHECKING SANDBOX DATABASE...\n');

    const contacts = await prisma.contact.findMany({ include: { company: true } });
    const companies = await prisma.company.findMany();
    const users = await prisma.user.findMany();

    console.log('📊 DATABASE STATUS:');
    console.log(`Users: ${users.length}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log(`Companies: ${companies.length}`);

    if (contacts.length > 0) {
      console.log('\n📋 CONTACTS FOUND:');
      contacts.slice(0, 10).forEach(c => {
        const companyName = c.company ? c.company.name : 'None';
        console.log(`  - ${c.firstName} ${c.lastName} (${c.email}) - Company: ${companyName}`);
      });
      if (contacts.length > 10) {
        console.log(`  ... and ${contacts.length - 10} more`);
      }
    }

    if (companies.length > 0) {
      console.log('\n🏢 COMPANIES FOUND:');
      companies.slice(0, 10).forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
      });
      if (companies.length > 10) {
        console.log(`  ... and ${companies.length - 10} more`);
      }
    }

    // Ask if user wants to delete
    if (contacts.length > 0 || companies.length > 0) {
      console.log('\n🗑️  DELETING ALL DATA...\n');

      // Delete contacts first
      const deletedContacts = await prisma.contact.deleteMany({});
      console.log(`✅ Deleted ${deletedContacts.count} contacts`);

      // Delete companies
      const deletedCompanies = await prisma.company.deleteMany({});
      console.log(`✅ Deleted ${deletedCompanies.count} companies`);

      // Delete other data
      const deletedCampaigns = await prisma.campaign.deleteMany({});
      console.log(`✅ Deleted ${deletedCampaigns.count} campaigns`);

      const deletedTags = await prisma.tag.deleteMany({});
      console.log(`✅ Deleted ${deletedTags.count} tags`);

      console.log('\n✅ SANDBOX DATABASE CLEAN!');
    } else {
      console.log('\n✅ DATABASE ALREADY CLEAN - NO DATA TO DELETE');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndClean();
