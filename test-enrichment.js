const { PrismaClient } = require('@prisma/client');
const { companyEnrichmentService } = require('./dist/services/companyEnrichment');

const prisma = new PrismaClient();

async function testEnrichment() {
  try {
    console.log('=== TESTING AI ENRICHMENT ===\n');

    // Get Carrier Global
    const company = await prisma.company.findFirst({
      where: { name: 'Carrier Global Corporation' }
    });

    if (!company) {
      console.log('❌ Company not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`Company: ${company.name}`);
    console.log(`Website: ${company.website}`);
    console.log('\n🚀 Starting enrichment...\n');

    // Set status to enriching
    await prisma.company.update({
      where: { id: company.id },
      data: { enrichmentStatus: 'enriching' }
    });

    try {
      // Enrich the company
      const enrichedData = await companyEnrichmentService.enrichCompany(
        company.name,
        company.website
      );

      console.log('\n✅ Enrichment successful!\n');
      console.log('Enriched Data:');
      console.log(JSON.stringify(enrichedData, null, 2));

      // Update the company with enriched data
      await prisma.company.update({
        where: { id: company.id },
        data: {
          ...enrichedData,
          enrichedAt: new Date(),
          enrichmentStatus: 'enriched'
        }
      });

      console.log('\n✅ Company updated in database!');

      // Verify the update
      const updated = await prisma.company.findUnique({
        where: { id: company.id },
        select: {
          name: true,
          aiDescription: true,
          aiIndustry: true,
          aiCompanyType: true,
          aiEmployeeRange: true,
          aiRevenue: true,
          aiKeywords: true,
          aiTechStack: true,
          enrichmentStatus: true,
          enrichedAt: true
        }
      });

      console.log('\n=== VERIFICATION ===');
      console.log(JSON.stringify(updated, null, 2));

    } catch (enrichError) {
      console.error('❌ Enrichment failed:', enrichError.message);
      await prisma.company.update({
        where: { id: company.id },
        data: { enrichmentStatus: 'failed' }
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testEnrichment();
