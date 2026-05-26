import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all companies with their industry and size
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      industry: true,
      size: true,
      description: true,
      _count: {
        select: {
          contacts: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  console.log('\n📊 Companies in Database:\n');
  console.log(`Total companies: ${companies.length}\n`);

  companies.forEach((company, idx) => {
    console.log(`${idx + 1}. ${company.name}`);
    console.log(`   Industry: ${company.industry || 'Not set'}`);
    console.log(`   Size: ${company.size || 'Not set'}`);
    console.log(`   Contacts: ${company._count.contacts}`);
    console.log(`   Description: ${company.description ? company.description.substring(0, 100) + '...' : 'None'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
