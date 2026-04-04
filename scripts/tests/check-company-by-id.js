const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompany() {
  try {
    const companyId = 'cmgmxdqib00jlls8o3rm1xt8v';

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        website: true,
        aiIndustry: true,
        aiEmployeeRange: true,
        aiDescription: true,
        enrichmentStatus: true,
        enrichedAt: true,
        userId: true
      }
    });

    if (!company) {
      console.log(`❌ Company with ID ${companyId} not found`);
    } else {
      console.log('=== COMPANY DETAILS ===\n');
      console.log(`Name: ${company.name}`);
      console.log(`Website: ${company.website || 'No website'}`);
      console.log(`AI Industry: ${company.aiIndustry || 'Not enriched'}`);
      console.log(`AI Employee Range: ${company.aiEmployeeRange || 'Not enriched'}`);
      console.log(`Enrichment Status: ${company.enrichmentStatus || 'pending'}`);
      console.log(`Enriched At: ${company.enrichedAt || 'Never'}`);
      console.log(`User ID: ${company.userId}`);

      if (company.aiDescription) {
        console.log(`\nAI Description: ${company.aiDescription.substring(0, 100)}...`);
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCompany();
