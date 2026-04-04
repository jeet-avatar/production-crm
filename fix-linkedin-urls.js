const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLinkedInUrls() {
  try {
    console.log('🔧 Fixing LinkedIn URL field mapping...\n');

    // Get all companies with LinkedIn URLs in website field
    const companies = await prisma.company.findMany({
      where: {
        website: {
          contains: 'linkedin.com'
        }
      },
      select: {
        id: true,
        name: true,
        website: true,
        linkedin: true
      }
    });

    console.log(`Found ${companies.length} companies with LinkedIn URLs in website field\n`);

    let updated = 0;
    for (const company of companies) {
      console.log(`Processing: ${company.name}`);
      console.log(`  Current website: ${company.website}`);
      console.log(`  Current linkedin: ${company.linkedin || 'NULL'}`);

      // Update: move website to linkedin, clear website
      await prisma.company.update({
        where: { id: company.id },
        data: {
          linkedin: company.website,
          website: null
        }
      });

      console.log(`  ✅ Moved to linkedin field\n`);
      updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} companies!`);
    console.log('\nSummary:');
    console.log(`- LinkedIn URLs moved from 'website' to 'linkedin' field`);
    console.log(`- Website field cleared (ready for actual company websites)`);
    console.log(`- Companies now have proper LinkedIn profile URLs`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixLinkedInUrls();
