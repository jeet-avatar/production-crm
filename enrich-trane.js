const { PrismaClient } = require('@prisma/client');
const { companyEnrichmentService } = require('./dist/services/companyEnrichment');

const prisma = new PrismaClient();

async function enrichTrane() {
  try {
    console.log('=== ENRICHING TRANE TECHNOLOGIES ===\n');

    const company = await prisma.company.findFirst({
      where: { name: 'Trane Technologies' }
    });

    if (!company) {
      console.log('❌ Company not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Company: ${company.name}`);
    console.log(`Website: ${company.website}`);
    console.log('\n🚀 Starting enrichment...\n');

    await prisma.company.update({
      where: { id: company.id },
      data: { enrichmentStatus: 'enriching' }
    });

    const enrichedData = await companyEnrichmentService.enrichCompany(
      company.name,
      company.website
    );

    console.log('\n✅ Enrichment successful!\n');
    console.log('AI Industry:', enrichedData.aiIndustry);
    console.log('AI Employee Range:', enrichedData.aiEmployeeRange);
    console.log('AI Company Type:', enrichedData.aiCompanyType);
    console.log('AI Keywords:', enrichedData.aiKeywords.join(', '));

    await prisma.company.update({
      where: { id: company.id },
      data: {
        ...enrichedData,
        enrichedAt: new Date(),
        enrichmentStatus: 'enriched'
      }
    });

    console.log('\n✅ Trane Technologies enriched and saved!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

enrichTrane();
