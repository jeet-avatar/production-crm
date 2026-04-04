// Test Contact Email Enrichment for 5 Companies
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContactEnrichment() {
  try {
    console.log('🔍 Finding 5 companies to test contact enrichment...\n');

    // Find 5 companies that haven't been contact-enriched yet
    const companies = await prisma.company.findMany({
      where: {
        contactsEnriched: false,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        contactsEnriched: true,
        contactsEnrichedAt: true,
      },
      take: 5,
    });

    if (companies.length === 0) {
      console.log('❌ No companies found that need contact enrichment');
      console.log('   All companies may already be enriched.');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found ${companies.length} companies for testing:\n`);

    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   User ID: ${company.userId}`);
      console.log(`   Contacts Enriched: ${company.contactsEnriched}`);
      console.log('');
    });

    console.log('\n📋 TEST PLAN:');
    console.log('='.repeat(60));
    console.log('For each company above, you need to:');
    console.log('1. Get a valid JWT token for the user who owns the company');
    console.log('2. Call: POST /api/enrichment/companies/{id}/enrich-contacts');
    console.log('3. Verify contacts are created with email addresses');
    console.log('='.repeat(60));

    // Count current contacts for these companies
    console.log('\n📊 Current Contact Count (BEFORE enrichment):');
    for (const company of companies) {
      const contactCount = await prisma.contact.count({
        where: {
          companyId: company.id,
          email: { not: null },
        },
      });
      console.log(`   ${company.name}: ${contactCount} contacts with emails`);
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testContactEnrichment();
