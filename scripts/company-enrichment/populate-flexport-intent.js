// Quick script to populate intent signals for Flexport
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const companyId = 'cmh6r5vx000wllc862l087r0t'; // Flexport

    console.log('🎯 Populating intent signals for Flexport...');

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        intent: 'Scaling logistics operations and improving supply chain efficiency',
        hiringInfo: 'Expanding engineering and operations teams globally',
        jobPostings: 'Senior Software Engineer, Operations Manager, Data Analyst',
        aiRecentNews: 'Announced strategic partnership with major e-commerce platforms',
        techStack: 'Kubernetes, Python, React, PostgreSQL, AWS'
      },
      select: { id: true, name: true, intent: true }
    });

    console.log('✅ Intent signals populated successfully!');
    console.log(`   Company: ${updated.name}`);
    console.log(`   Intent: ${updated.intent}`);
    console.log(`\n🔗 Test URL: https://brandmonkz.com/companies/${updated.id}`);
    console.log('\n📱 Instructions:');
    console.log('   1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. Go to the URL above');
    console.log('   3. You will see the purple Intent Signals Card');
    console.log('   4. Click "Create Personalized Video Campaign"');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
