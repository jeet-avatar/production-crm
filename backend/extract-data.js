const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function extractData() {
  try {
    console.log('🔍 Extracting LinkedIn and Email data...\n');

    // Get all contacts with emails
    const contactsWithEmails = await prisma.contact.findMany({
      where: {
        email: {
          not: null
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        phone: true,
        company: {
          select: {
            name: true,
            linkedin: true,
            website: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📧 Contacts with Email Addresses: ${contactsWithEmails.length}`);
    console.log('─'.repeat(80));
    contactsWithEmails.forEach(contact => {
      console.log(`${contact.firstName} ${contact.lastName} | ${contact.email}`);
      if (contact.title) {
        console.log(`  Title: ${contact.title}`);
      }
      if (contact.phone) {
        console.log(`  Phone: ${contact.phone}`);
      }
      if (contact.company) {
        console.log(`  Company: ${contact.company.name}`);
        if (contact.company.linkedin) {
          console.log(`  Company LinkedIn: ${contact.company.linkedin}`);
        }
      }
      console.log('');
    });
    console.log('\n');

    // Get all contacts (with company LinkedIn)
    const contactsWithCompanyLinkedIn = await prisma.contact.findMany({
      where: {
        company: {
          linkedin: {
            not: null
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        company: {
          select: {
            name: true,
            linkedin: true,
            website: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    console.log(`🔗 Contacts whose Companies have LinkedIn: ${contactsWithCompanyLinkedIn.length}`);
    console.log('─'.repeat(80));
    contactsWithCompanyLinkedIn.forEach(contact => {
      console.log(`${contact.firstName} ${contact.lastName}`);
      if (contact.email) {
        console.log(`  Email: ${contact.email}`);
      }
      if (contact.title) {
        console.log(`  Title: ${contact.title}`);
      }
      console.log(`  Company: ${contact.company.name}`);
      console.log(`  Company LinkedIn: ${contact.company.linkedin}`);
      console.log('');
    });
    console.log('\n');

    // Get companies with LinkedIn
    const companiesWithLinkedIn = await prisma.company.findMany({
      where: {
        linkedin: {
          not: null
        }
      },
      select: {
        name: true,
        linkedin: true,
        website: true,
        _count: {
          select: {
            contacts: true
          }
        }
      }
    });

    console.log(`🏢 Companies with LinkedIn Profiles: ${companiesWithLinkedIn.length}`);
    console.log('─'.repeat(80));
    companiesWithLinkedIn.forEach(company => {
      console.log(`${company.name} | ${company.linkedin}`);
      console.log(`  Contacts: ${company._count.contacts}`);
      if (company.website) {
        console.log(`  Website: ${company.website}`);
      }
    });
    console.log('\n');

    // Get all contacts (total count)
    const totalContacts = await prisma.contact.count();
    const totalCompanies = await prisma.company.count();

    console.log('📊 Summary Statistics');
    console.log('─'.repeat(80));
    console.log(`Total Contacts: ${totalContacts}`);
    console.log(`Total Companies: ${totalCompanies}`);
    console.log(`Contacts with Email: ${contactsWithEmails.length} (${((contactsWithEmails.length/totalContacts)*100).toFixed(1)}%)`);
    console.log(`Contacts with Company LinkedIn: ${contactsWithCompanyLinkedIn.length} (${((contactsWithCompanyLinkedIn.length/totalContacts)*100).toFixed(1)}%)`);
    console.log(`Companies with LinkedIn: ${companiesWithLinkedIn.length} (${((companiesWithLinkedIn.length/totalCompanies)*100).toFixed(1)}%)`);
    console.log('\n');

    // Export to JSON
    const exportData = {
      contactsWithEmails: contactsWithEmails.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        title: c.title,
        phone: c.phone,
        company: c.company?.name,
        companyLinkedIn: c.company?.linkedin,
        companyWebsite: c.company?.website
      })),
      contactsWithCompanyLinkedIn: contactsWithCompanyLinkedIn.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        title: c.title,
        company: c.company?.name,
        companyLinkedIn: c.company?.linkedin,
        companyWebsite: c.company?.website
      })),
      companiesWithLinkedIn: companiesWithLinkedIn.map(c => ({
        name: c.name,
        linkedin: c.linkedin,
        website: c.website,
        contactCount: c._count.contacts
      })),
      summary: {
        totalContacts,
        totalCompanies,
        contactsWithEmail: contactsWithEmails.length,
        contactsWithCompanyLinkedIn: contactsWithCompanyLinkedIn.length,
        companiesWithLinkedIn: companiesWithLinkedIn.length
      }
    };

    console.log('💾 Exporting data to data-export.json...');
    require('fs').writeFileSync('data-export.json', JSON.stringify(exportData, null, 2));
    console.log('✅ Export complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

extractData();
