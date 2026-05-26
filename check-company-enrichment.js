const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkCompanyEnrichment() {
  console.log("🔍 Checking Company Enrichment Button Visibility\n");

  // Get all companies and check which ones show the AI Enrich button
  const companies = await prisma.company.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      website: true,
      enrichmentStatus: true,
      enriched: true,
      dataSource: true
    },
    take: 10,
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log("=".repeat(80));
  console.log("Recent Companies and AI Enrich Button Visibility:");
  console.log("=".repeat(80));

  companies.forEach((company, idx) => {
    const hasWebsite = !!company.website;
    const isNotEnriching = company.enrichmentStatus !== 'enriching';
    const willShowButton = hasWebsite && isNotEnriching;

    console.log(`\n${idx + 1}. ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Website: ${company.website || '❌ NO WEBSITE'}`);
    console.log(`   Enrichment Status: ${company.enrichmentStatus || 'null'}`);
    console.log(`   Enriched: ${company.enriched ? 'Yes' : 'No'}`);
    console.log(`   Data Source: ${company.dataSource}`);
    console.log(`   AI Enrich Button: ${willShowButton ? '✅ VISIBLE' : '❌ HIDDEN'}`);

    if (!hasWebsite) {
      console.log(`   ⚠️  Reason: No website URL - Add website to enable AI Enrich`);
    }
    if (company.enrichmentStatus === 'enriching') {
      console.log(`   ⚠️  Reason: Currently enriching - Wait for completion`);
    }
  });

  console.log("\n" + "=".repeat(80));

  // Count companies without websites
  const totalCompanies = await prisma.company.count({ where: { isActive: true } });
  const companiesWithWebsite = await prisma.company.count({
    where: { isActive: true, NOT: { website: null } }
  });
  const companiesWithoutWebsite = totalCompanies - companiesWithWebsite;

  console.log("\n📊 Summary:");
  console.log(`   Total Companies: ${totalCompanies}`);
  console.log(`   With Website (can use AI Enrich): ${companiesWithWebsite}`);
  console.log(`   Without Website (button hidden): ${companiesWithoutWebsite}`);
  console.log("=".repeat(80));

  await prisma.$disconnect();
}

checkCompanyEnrichment().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
