const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMismatches() {
  try {
    // Get all companies with dataSource csv_import
    const companies = await prisma.company.findMany({
      where: {
        dataSource: 'csv_import'
      },
      select: {
        id: true,
        name: true,
        domain: true,
        website: true,
        industry: true,
        description: true,
        linkedin: true
      },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    console.log('Total CSV imported companies:', companies.length);
    console.log('\n=== Checking for Name/Domain Mismatches ===\n');

    let mismatchCount = 0;

    companies.forEach(company => {
      // Check if company name appears in domain/website
      const nameParts = company.name.toLowerCase().split(/[\s\-_]+/).filter(p => p.length > 2);
      const domain = (company.domain || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const website = (company.website || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check for mismatch
      const nameInDomain = nameParts.some(part =>
        part.length > 3 && (domain.includes(part) || website.includes(part))
      );

      if (!nameInDomain && domain) {
        mismatchCount++;
        console.log(`❌ MISMATCH #${mismatchCount}: ${company.name}`);
        console.log(`   Domain: ${company.domain}`);
        console.log(`   Website: ${company.website}`);
        console.log(`   Industry: ${company.industry}`);
        if (company.description) {
          console.log(`   Description: ${company.description.substring(0, 120)}...`);
        }
        console.log('');
      }
    });

    console.log(`\nTotal mismatches found: ${mismatchCount} out of ${companies.length} companies`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

findMismatches();
