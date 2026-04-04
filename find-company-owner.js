const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOwner() {
  try {
    const company = await prisma.company.findFirst({
      where: { name: 'Carrier Global Corporation' },
      include: { user: true }
    });

    console.log('=== CARRIER GLOBAL OWNER ===');
    console.log(`Company ID: ${company.id}`);
    console.log(`Company Name: ${company.name}`);
    console.log(`Website: ${company.website}`);
    console.log(`User ID: ${company.userId}`);
    console.log(`User Email: ${company.user.email}`);
    console.log(`AI Industry: ${company.aiIndustry}`);
    console.log(`AI Employee Range: ${company.aiEmployeeRange}`);
    console.log(`Enrichment Status: ${company.enrichmentStatus}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

findOwner();
