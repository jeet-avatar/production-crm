#!/usr/bin/env node
/**
 * Display all enriched company data with contacts
 * Usage: node display-all-enriched-data.js [company-name-filter]
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function displayAllEnrichedData() {
  try {
    const companyFilter = process.argv[2];

    console.log('\n📊 ENRICHED COMPANY DATA REPORT');
    console.log('═'.repeat(120));
    console.log();

    // Get all enriched companies with their contacts
    const companies = await prisma.company.findMany({
      where: {
        enriched: true,
        ...(companyFilter ? {
          name: {
            contains: companyFilter,
            mode: 'insensitive'
          }
        } : {})
      },
      include: {
        contacts: {
          where: {
            isActive: true,
            source: 'AI_ENRICHMENT'
          },
          orderBy: {
            title: 'asc'
          }
        },
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        enrichedAt: 'desc'
      }
    });

    if (companies.length === 0) {
      console.log('❌ No enriched companies found.');
      if (companyFilter) {
        console.log(`   Try without filter or check spelling: "${companyFilter}"`);
      }
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found ${companies.length} enriched ${companies.length === 1 ? 'company' : 'companies'}`);
    console.log();

    for (const company of companies) {
      const aiContacts = company.contacts.filter(c => c.source === 'AI_ENRICHMENT');

      console.log('┌' + '─'.repeat(118) + '┐');
      console.log(`│ 🏢 ${company.name.toUpperCase().padEnd(115)} │`);
      console.log('├' + '─'.repeat(118) + '┤');
      console.log(`│ Website: ${(company.website || 'N/A').padEnd(105)} │`);
      console.log(`│ Industry: ${(company.industry || 'N/A').padEnd(104)} │`);
      console.log(`│ Location: ${(company.location || 'N/A').padEnd(104)} │`);
      console.log(`│ Employees: ${(company.employeeCount || 'N/A').padEnd(103)} │`);
      console.log(`│ Enriched: ${(company.enrichedAt ? company.enrichedAt.toISOString().split('T')[0] : 'N/A').padEnd(104)} │`);
      console.log(`│ Total Contacts: ${company._count.contacts.toString().padEnd(100)} │`);
      console.log(`│ AI Extracted: ${aiContacts.length.toString().padEnd(102)} │`);
      console.log('└' + '─'.repeat(118) + '┘');

      if (aiContacts.length > 0) {
        console.log();
        console.log('👥 EXTRACTED CONTACTS:');
        console.log('─'.repeat(120));
        console.log(
          '  NAME'.padEnd(30) +
          'TITLE'.padEnd(35) +
          'EMAIL'.padEnd(35) +
          'PHONE'.padEnd(20)
        );
        console.log('─'.repeat(120));

        aiContacts.forEach((contact, index) => {
          const name = `${contact.firstName} ${contact.lastName}`;
          const title = contact.title || contact.role || 'N/A';
          const email = contact.email || 'N/A';
          const phone = contact.phone || 'N/A';
          const linkedin = contact.linkedin;

          console.log(
            `  ${name.substring(0, 28).padEnd(30)}` +
            `${title.substring(0, 33).padEnd(35)}` +
            `${email.substring(0, 33).padEnd(35)}` +
            `${phone.substring(0, 18).padEnd(20)}`
          );

          if (linkedin) {
            console.log(`    🔗 LinkedIn: ${linkedin}`);
          }
        });

        console.log('─'.repeat(120));
      } else {
        console.log('   ℹ️  No AI-extracted contacts found for this company');
      }

      console.log();
      console.log();
    }

    // Summary statistics
    const totalAIContacts = companies.reduce((sum, c) =>
      sum + c.contacts.filter(contact => contact.source === 'AI_ENRICHMENT').length, 0
    );
    const totalContacts = companies.reduce((sum, c) => sum + c._count.contacts, 0);

    console.log('═'.repeat(120));
    console.log('📈 SUMMARY STATISTICS:');
    console.log('─'.repeat(120));
    console.log(`   Total Enriched Companies: ${companies.length}`);
    console.log(`   Total Contacts: ${totalContacts}`);
    console.log(`   AI Extracted Contacts: ${totalAIContacts}`);
    console.log(`   Average Contacts per Company: ${(totalContacts / companies.length).toFixed(1)}`);
    console.log(`   Average AI Extracted per Company: ${(totalAIContacts / companies.length).toFixed(1)}`);
    console.log('═'.repeat(120));
    console.log();

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the script
displayAllEnrichedData();
