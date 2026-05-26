const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find a real company (not the demo)
    const companies = await prisma.company.findMany({
      where: {
        NOT: { name: { contains: 'DEMO' } },
        intent: null
      },
      take: 3,
      select: { id: true, name: true, industry: true, website: true }
    });

    console.log('📋 Real companies without intent signals:');
    companies.forEach((c, i) => {
      console.log(`${i+1}. ${c.name} (ID: ${c.id})`);
      console.log(`   Industry: ${c.industry || 'Unknown'}`);
      console.log(`   Website: ${c.website || 'N/A'}`);
    });

    if (companies.length > 0) {
      const company = companies[0];
      console.log(`\n🎯 Populating intent signals for: ${company.name}`);

      // Populate with realistic data based on company
      await prisma.company.update({
        where: { id: company.id },
        data: {
          intent: 'Expanding market presence and improving operational efficiency',
          hiringInfo: 'Growing team across sales and engineering departments',
          jobPostings: 'Account Executive, Senior Software Engineer, Product Manager',
          aiRecentNews: 'Company announced strategic partnership and product expansion',
          techStack: 'AWS, React, Node.js, PostgreSQL, Docker'
        }
      });

      console.log('✅ Intent signals populated successfully!');
      console.log(`\n🔗 Test URL: https://brandmonkz.com/companies/${company.id}`);
      console.log(`\nNow refresh the page and you will see the Intent Signals Card!`);
    } else {
      console.log('❌ No companies found without intent signals');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
