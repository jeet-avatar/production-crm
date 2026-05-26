// Test the templates query directly to see the exact error
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Testing templates query...');

    // Test without userId first (public templates)
    console.log('\n1️⃣ Testing system templates only:');
    const systemTemplates = await prisma.videoTemplate.findMany({
      where: { isSystem: true },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    console.log(`✅ Found ${systemTemplates.length} system templates`);

    // Test with userId
    console.log('\n2️⃣ Testing with OR condition (like the endpoint):');
    const allTemplates = await prisma.videoTemplate.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId: null } // Test with null first
        ]
      },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    console.log(`✅ Found ${allTemplates.length} templates with OR condition`);

    // Test response serialization
    console.log('\n3️⃣ Testing JSON serialization:');
    const jsonResponse = JSON.stringify({ templates: allTemplates });
    console.log(`✅ Serialized ${jsonResponse.length} characters`);

    console.log('\n✅ All tests passed - query structure is correct');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
