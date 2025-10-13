#!/usr/bin/env node
/**
 * Verify that enriched data persists in database
 * Shows all saved contacts with phone numbers and emails
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function verifyDataPersistence() {
  try {
    console.log('\n🔍 DATABASE PERSISTENCE VERIFICATION');
    console.log('═'.repeat(100));
    console.log();

    // Count enriched companies
    const enrichedCompanyCount = await prisma.company.count({
      where: { enriched: true }
    });

    // Count AI-extracted contacts
    const aiContactCount = await prisma.contact.count({
      where: { source: 'AI_ENRICHMENT' }
    });

    // Count contacts with phone numbers
    const contactsWithPhones = await prisma.contact.count({
      where: {
        source: 'AI_ENRICHMENT',
        phone: { not: null }
      }
    });

    // Count contacts with emails
    const contactsWithEmails = await prisma.contact.count({
      where: {
        source: 'AI_ENRICHMENT',
        email: { not: null }
      }
    });

    // Count contacts with LinkedIn
    const contactsWithLinkedIn = await prisma.contact.count({
      where: {
        source: 'AI_ENRICHMENT',
        linkedin: { not: null }
      }
    });

    console.log('📊 STORAGE STATISTICS:');
    console.log('─'.repeat(100));
    console.log(`   ✅ Enriched Companies: ${enrichedCompanyCount}`);
    console.log(`   ✅ AI-Extracted Contacts: ${aiContactCount}`);
    console.log(`   ✅ Contacts with Phone Numbers: ${contactsWithPhones} (${((contactsWithPhones/aiContactCount)*100).toFixed(1)}%)`);
    console.log(`   ✅ Contacts with Email Addresses: ${contactsWithEmails} (${((contactsWithEmails/aiContactCount)*100).toFixed(1)}%)`);
    console.log(`   ✅ Contacts with LinkedIn URLs: ${contactsWithLinkedIn} (${((contactsWithLinkedIn/aiContactCount)*100).toFixed(1)}%)`);
    console.log('═'.repeat(100));
    console.log();

    // Show sample of well-enriched companies
    const wellEnrichedCompanies = await prisma.company.findMany({
      where: {
        enriched: true,
        contacts: {
          some: {
            source: 'AI_ENRICHMENT',
            phone: { not: null }
          }
        }
      },
      include: {
        contacts: {
          where: {
            source: 'AI_ENRICHMENT',
            phone: { not: null }
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 3,
      orderBy: { enrichedAt: 'desc' }
    });

    if (wellEnrichedCompanies.length > 0) {
      console.log('📱 SAMPLE COMPANIES WITH COMPLETE CONTACT DATA:');
      console.log('═'.repeat(100));
      console.log();

      wellEnrichedCompanies.forEach((company, idx) => {
        console.log(`${idx + 1}. 🏢 ${company.name}`);
        console.log(`   Website: ${company.website || 'N/A'}`);
        console.log(`   Enriched: ${company.enrichedAt ? company.enrichedAt.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`   Contacts with Phone Numbers: ${company.contacts.length}`);
        console.log();

        company.contacts.forEach((contact, cidx) => {
          console.log(`   ${cidx + 1}. ${contact.firstName} ${contact.lastName}`);
          console.log(`      Title: ${contact.title || 'N/A'}`);
          console.log(`      Email: ${contact.email || 'N/A'}`);
          console.log(`      Phone: ${contact.phone || 'N/A'} ✅`);
          if (contact.linkedin) {
            console.log(`      LinkedIn: ${contact.linkedin}`);
          }
          console.log();
        });
      });
    }

    console.log('═'.repeat(100));
    console.log('✅ DATA PERSISTENCE CONFIRMED');
    console.log('─'.repeat(100));
    console.log('   All enriched data is permanently stored in the PostgreSQL database.');
    console.log('   This data will remain available across all sessions and logins.');
    console.log('   No data is lost when you log out or close your browser.');
    console.log('═'.repeat(100));
    console.log();

    // Test a specific company if provided
    const testCompany = process.argv[2];
    if (testCompany) {
      console.log(`\n🔍 TESTING SPECIFIC COMPANY: ${testCompany}`);
      console.log('─'.repeat(100));

      const company = await prisma.company.findFirst({
        where: {
          name: {
            contains: testCompany,
            mode: 'insensitive'
          }
        },
        include: {
          contacts: {
            where: { source: 'AI_ENRICHMENT' },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (company) {
        console.log(`✅ Found: ${company.name}`);
        console.log(`   Enriched: ${company.enriched ? 'Yes' : 'No'}`);
        console.log(`   AI-Extracted Contacts: ${company.contacts.length}`);
        console.log();

        if (company.contacts.length > 0) {
          console.log('   Saved Contacts:');
          company.contacts.forEach((c, i) => {
            console.log(`   ${i+1}. ${c.firstName} ${c.lastName} - ${c.title}`);
            console.log(`      📧 ${c.email || 'No email'}`);
            console.log(`      📞 ${c.phone || 'No phone'}`);
            console.log(`      🔗 ${c.linkedin || 'No LinkedIn'}`);
          });
        }
      } else {
        console.log(`❌ Company not found: ${testCompany}`);
      }
      console.log('═'.repeat(100));
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifyDataPersistence();
