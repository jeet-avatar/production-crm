const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearInvalidLinkedInUrls() {
  console.log('🧹 Clearing invalid LinkedIn URLs from database...\n');

  // First, show what we're about to clear
  const invalidUrls = await prisma.company.findMany({
    where: {
      OR: [
        { linkedin: { contains: 'linkedin.com/in/' } }, // Personal profiles
        {
          AND: [
            { linkedin: { not: null } },
            { linkedin: { not: { contains: 'linkedin.com/company/' } } }
          ]
        }
      ]
    },
    select: { id: true, name: true, linkedin: true }
  });

  console.log(`Found ${invalidUrls.length} companies with invalid LinkedIn URLs\n`);

  if (invalidUrls.length === 0) {
    console.log('✅ No invalid URLs to clear!');
    await prisma.$disconnect();
    return;
  }

  // Show a sample
  console.log('Sample of URLs to be cleared:');
  invalidUrls.slice(0, 10).forEach(c => {
    console.log(`   - ${c.name}: ${c.linkedin}`);
  });
  if (invalidUrls.length > 10) {
    console.log(`   ... and ${invalidUrls.length - 10} more`);
  }
  console.log('');

  // Perform the update
  console.log('⚙️  Executing update...');
  const result = await prisma.company.updateMany({
    where: {
      OR: [
        { linkedin: { contains: 'linkedin.com/in/' } },
        {
          AND: [
            { linkedin: { not: null } },
            { linkedin: { not: { contains: 'linkedin.com/company/' } } }
          ]
        }
      ]
    },
    data: {
      linkedin: null
    }
  });

  console.log(`✅ Successfully cleared ${result.count} invalid LinkedIn URLs\n`);

  // Verify what's left
  const remaining = await prisma.company.findMany({
    where: {
      linkedin: { not: null }
    },
    select: { id: true, name: true, linkedin: true }
  });

  console.log('📊 Remaining valid LinkedIn URLs:');
  if (remaining.length === 0) {
    console.log('   (none - all URLs were invalid)');
  } else {
    remaining.forEach(c => {
      console.log(`   ✅ ${c.name}: ${c.linkedin}`);
    });
  }
  console.log('');

  // Summary
  const stats = await prisma.company.groupBy({
    by: ['linkedin'],
    _count: true
  });

  const withLinkedIn = await prisma.company.count({
    where: { linkedin: { not: null } }
  });

  const withoutLinkedIn = await prisma.company.count({
    where: { linkedin: null }
  });

  const total = await prisma.company.count();

  console.log('📈 Final Statistics:');
  console.log(`   Total companies: ${total}`);
  console.log(`   With valid LinkedIn URLs: ${withLinkedIn}`);
  console.log(`   Without LinkedIn URLs: ${withoutLinkedIn}`);
  console.log('');
  console.log('✅ Cleanup complete! You can now add correct company LinkedIn URLs.');

  await prisma.$disconnect();
}

clearInvalidLinkedInUrls().catch(console.error);
