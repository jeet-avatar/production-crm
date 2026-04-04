// Script to check SlingSports contacts and companies
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlingSportsData() {
  try {
    console.log('\n=== CHECKING SLINGSPORTS DATA ===\n');

    // Find SlingSports company
    const slingSportsCompany = await prisma.company.findFirst({
      where: {
        name: {
          contains: 'SlingSports',
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    });

    if (slingSportsCompany) {
      console.log('SlingSports Company Found:');
      console.log('- ID:', slingSportsCompany.id);
      console.log('- Name:', slingSportsCompany.name);
      console.log('- Domain:', slingSportsCompany.domain);
      console.log('- Contact Count:', slingSportsCompany._count.contacts);
      console.log('- Created:', slingSportsCompany.createdAt);
      console.log('- Data Source:', slingSportsCompany.dataSource);
      console.log('\n');

      // Get all contacts for this company
      const contacts = await prisma.contact.findMany({
        where: { companyId: slingSportsCompany.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: {
            select: {
              name: true
            }
          },
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      console.log('Sample Contacts (first 10):');
      contacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} - ${contact.email || 'No email'}`);
        console.log(`   Company: ${contact.company?.name || 'No company'}`);
        console.log(`   Created: ${contact.createdAt}`);
      });
      console.log('\n');

      // Check if there are contacts with different company names
      const allCompanies = await prisma.company.findMany({
        where: {
          userId: slingSportsCompany.userId
        },
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
        take: 20
      });

      console.log('All Companies for this User:');
      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} - ${company._count.contacts} contacts`);
        console.log(`   Domain: ${company.domain}`);
        console.log(`   Data Source: ${company.dataSource}`);
      });
      console.log('\n');

      // Check for potential duplicates
      const duplicateEmails = await prisma.$queryRaw`
        SELECT email, COUNT(*) as count
        FROM "Contact"
        WHERE "companyId" = ${slingSportsCompany.id}
        AND email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
      `;

      if (duplicateEmails.length > 0) {
        console.log('⚠️  DUPLICATE EMAILS FOUND:');
        duplicateEmails.forEach(dup => {
          console.log(`   ${dup.email} - ${dup.count} times`);
        });
      } else {
        console.log('✅ No duplicate emails found');
      }
      console.log('\n');

    } else {
      console.log('❌ No SlingSports company found');

      // Check all companies
      const allCompanies = await prisma.company.findMany({
        take: 20,
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

      console.log('Top 20 Companies by Contact Count:');
      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} - ${company._count.contacts} contacts`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlingSportsData();
