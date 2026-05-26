const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompanies() {
  try {
    const userId = 'cmglfhzs20000e339tvf74m0h'; // jeet user

    console.log('Testing company query with user isolation...');

    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        userId: userId,
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 5,
    });

    console.log(`✅ Found ${companies.length} companies`);
    console.log(JSON.stringify(companies, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCompanies();
