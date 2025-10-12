const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeData() {
  try {
    console.log('🔍 Analyzing Current Data...\n');

    // Sample contacts
    const sampleContacts = await prisma.contact.findMany({
      take: 10,
      include: {
        company: true
      }
    });

    console.log('📋 Sample Contacts (First 10):');
    console.log('─'.repeat(80));
    sampleContacts.forEach((c, i) => {
      console.log(`${i+1}. ${c.firstName} ${c.lastName}`);
      console.log(`   Email: ${c.email || 'NO EMAIL'}`);
      console.log(`   Phone: ${c.phone || 'NO PHONE'}`);
      console.log(`   Title: ${c.title || 'NO TITLE'}`);
      console.log(`   Company: ${c.company?.name || 'NO COMPANY'}`);
      console.log(`   Company Website: ${c.company?.website || 'NO WEBSITE'}`);
      console.log('');
    });

    // Sample companies
    const sampleCompanies = await prisma.company.findMany({
      take: 10,
      select: {
        name: true,
        website: true,
        linkedin: true,
        domain: true,
        industry: true,
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    console.log('\n🏢 Sample Companies (First 10):');
    console.log('─'.repeat(80));
    sampleCompanies.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} (${c._count.contacts} contacts)`);
      console.log(`   Website: ${c.website || 'NO WEBSITE'}`);
      console.log(`   LinkedIn: ${c.linkedin || 'NO LINKEDIN'}`);
      console.log(`   Domain: ${c.domain || 'NO DOMAIN'}`);
      console.log(`   Industry: ${c.industry || 'NO INDUSTRY'}`);
      console.log('');
    });

    // Data completeness analysis
    const totalContacts = await prisma.contact.count();
    const contactsWithEmail = await prisma.contact.count({ where: { email: { not: null } } });
    const contactsWithPhone = await prisma.contact.count({ where: { phone: { not: null } } });
    const contactsWithTitle = await prisma.contact.count({ where: { title: { not: null } } });
    const contactsWithCompany = await prisma.contact.count({ where: { companyId: { not: null } } });

    const totalCompanies = await prisma.company.count();
    const companiesWithWebsite = await prisma.company.count({ where: { website: { not: null } } });
    const companiesWithLinkedIn = await prisma.company.count({ where: { linkedin: { not: null } } });
    const companiesWithDomain = await prisma.company.count({ where: { domain: { not: null } } });
    const companiesWithIndustry = await prisma.company.count({ where: { industry: { not: null } } });

    console.log('\n📊 Data Completeness Report:');
    console.log('─'.repeat(80));
    console.log('\n📇 CONTACTS:');
    console.log(`Total: ${totalContacts}`);
    console.log(`With Email: ${contactsWithEmail} (${((contactsWithEmail/totalContacts)*100).toFixed(1)}%)`);
    console.log(`With Phone: ${contactsWithPhone} (${((contactsWithPhone/totalContacts)*100).toFixed(1)}%)`);
    console.log(`With Title: ${contactsWithTitle} (${((contactsWithTitle/totalContacts)*100).toFixed(1)}%)`);
    console.log(`With Company: ${contactsWithCompany} (${((contactsWithCompany/totalContacts)*100).toFixed(1)}%)`);
    console.log(`Missing Email: ${totalContacts - contactsWithEmail}`);

    console.log('\n🏢 COMPANIES:');
    console.log(`Total: ${totalCompanies}`);
    console.log(`With Website: ${companiesWithWebsite} (${((companiesWithWebsite/totalCompanies)*100).toFixed(1)}%)`);
    console.log(`With LinkedIn: ${companiesWithLinkedIn} (${((companiesWithLinkedIn/totalCompanies)*100).toFixed(1)}%)`);
    console.log(`With Domain: ${companiesWithDomain} (${((companiesWithDomain/totalCompanies)*100).toFixed(1)}%)`);
    console.log(`With Industry: ${companiesWithIndustry} (${((companiesWithIndustry/totalCompanies)*100).toFixed(1)}%)`);

    // Check what's in website field
    const companiesWithWebsiteData = await prisma.company.findMany({
      where: {
        website: {
          not: null
        }
      },
      select: {
        name: true,
        website: true
      },
      take: 20
    });

    console.log('\n🌐 Companies with Website Data (First 20):');
    console.log('─'.repeat(80));
    companiesWithWebsiteData.forEach((c, i) => {
      console.log(`${i+1}. ${c.name}`);
      console.log(`   ${c.website}`);
    });

    // Export report
    const report = {
      contactsSample: sampleContacts.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        title: c.title,
        company: c.company?.name,
        companyWebsite: c.company?.website
      })),
      companiesSample: sampleCompanies,
      statistics: {
        contacts: {
          total: totalContacts,
          withEmail: contactsWithEmail,
          withPhone: contactsWithPhone,
          withTitle: contactsWithTitle,
          withCompany: contactsWithCompany,
          missingEmail: totalContacts - contactsWithEmail
        },
        companies: {
          total: totalCompanies,
          withWebsite: companiesWithWebsite,
          withLinkedIn: companiesWithLinkedIn,
          withDomain: companiesWithDomain,
          withIndustry: companiesWithIndustry
        }
      },
      companiesWithWebsites: companiesWithWebsiteData
    };

    require('fs').writeFileSync('data-analysis-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Report exported to data-analysis-report.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeData();
