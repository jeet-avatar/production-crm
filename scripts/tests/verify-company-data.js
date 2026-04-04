const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
  try {
    const company = await prisma.company.findFirst({
      where: { name: 'Carrier Global Corporation' },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        employeeCount: true,
        location: true,
        // AI fields
        aiDescription: true,
        aiIndustry: true,
        aiKeywords: true,
        aiCompanyType: true,
        aiTechStack: true,
        aiRecentNews: true,
        aiEmployeeRange: true,
        aiRevenue: true,
        aiFoundedYear: true,
        enrichmentStatus: true,
        enrichedAt: true
      }
    });

    console.log('=== CARRIER GLOBAL - WHAT THE FRONTEND SHOULD SEE ===\n');
    console.log(JSON.stringify(company, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

verifyData();
