const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanies() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        website: true,
        enrichmentStatus: true,
        aiDescription: true,
        aiIndustry: true,
        aiEmployeeRange: true,
        enrichedAt: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    console.log('=== COMPANIES ENRICHMENT STATUS ===\n');
    companies.forEach(c => {
      console.log(`Name: ${c.name}`);
      console.log(`Website: ${c.website || 'No website'}`);
      console.log(`Status: ${c.enrichmentStatus || 'pending'}`);
      console.log(`AI Industry: ${c.aiIndustry || 'Not enriched'}`);
      console.log(`AI Employee Range: ${c.aiEmployeeRange || 'Not enriched'}`);
      console.log(`Enriched At: ${c.enrichedAt || 'Never'}`);
      console.log('---');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCompanies();
