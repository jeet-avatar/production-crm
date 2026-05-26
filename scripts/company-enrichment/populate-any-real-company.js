// Find and populate intent signals for any real company
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find a real company (not demo) without intent signals
    const companies = await prisma.company.findMany({
      where: {
        AND: [
          { NOT: { name: { contains: 'DEMO' } } },
          { OR: [{ intent: null }, { intent: '' }] }
        ]
      },
      take: 5,
      select: { id: true, name: true, industry: true, website: true }
    });

    if (companies.length === 0) {
      console.log('❌ No companies found without intent signals');
      console.log('All your companies already have intent data!');
      await prisma.$disconnect();
      return;
    }

    console.log('📋 Found companies without intent signals:');
    companies.forEach((c, i) => {
      console.log(`   ${i+1}. ${c.name} (${c.industry || 'Unknown industry'})`);
    });

    const company = companies[0];
    console.log(`\n🎯 Populating intent signals for: ${company.name}`);

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        intent: 'Scaling operations and improving market presence with data-driven strategies',
        hiringInfo: 'Expanding engineering, sales, and operations teams',
        jobPostings: 'Senior Software Engineer, Account Executive, Product Manager, Data Analyst',
        aiRecentNews: 'Company announced strategic partnerships and expansion into new markets',
        techStack: 'AWS, React, Node.js, PostgreSQL, Docker, Kubernetes'
      },
      select: { id: true, name: true }
    });

    console.log('✅ Intent signals populated successfully!');
    console.log(`\n🔗 Test URL: https://brandmonkz.com/companies/${updated.id}`);
    console.log('\n📱 Instructions:');
    console.log('   1. HARD REFRESH your browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. Go to the URL above');
    console.log('   3. You will see the purple Intent Signals Card appear');
    console.log('   4. Click "Create Personalized Video Campaign" button');
    console.log('   5. Modal will open with company pre-selected');
    console.log('   6. Select your uploaded 29-second video');
    console.log('   7. Generate personalized script and complete campaign');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
