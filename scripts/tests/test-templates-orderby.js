// Test the templates query with orderBy clause
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Testing templates query with orderBy...');

    const where = { isSystem: true };

    console.log('\n1️⃣ Testing with orderBy clause:');
    const templates = await prisma.videoTemplate.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    console.log(`✅ Found ${templates.length} templates with orderBy`);

    console.log('\n2️⃣ Testing JSON response format:');
    const response = { templates };
    const jsonString = JSON.stringify(response);
    console.log(`✅ Serialized response: ${jsonString.length} characters`);

    console.log('\n3️⃣ Sample template data:');
    if (templates.length > 0) {
      const sample = templates[0];
      console.log('First template:', {
        id: sample.id,
        name: sample.name,
        isSystem: sample.isSystem,
        isFavorite: sample.isFavorite,
        usageCount: sample.usageCount
      });
    }

    console.log('\n✅ All tests passed');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
