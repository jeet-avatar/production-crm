const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTestData() {
  try {
    // Get a user
    const user = await prisma.user.findFirst();
    console.log('=== USER ===');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);

    // Get Carrier Global
    const company = await prisma.company.findFirst({
      where: {
        name: 'Carrier Global Corporation',
        userId: user.id
      }
    });

    console.log('\n=== COMPANY ===');
    console.log(`Name: ${company.name}`);
    console.log(`ID: ${company.id}`);
    console.log(`Website: ${company.website}`);
    console.log(`AI Industry: ${company.aiIndustry}`);
    console.log(`AI Employee Range: ${company.aiEmployeeRange}`);
    console.log(`Enrichment Status: ${company.enrichmentStatus}`);

    console.log('\n=== TEST CURL COMMAND ===');
    console.log('You need to login first to get a token. Use this company ID:');
    console.log(`Company ID: ${company.id}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

getTestData();
