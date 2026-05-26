import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.emailTemplate.findMany({
    where: {
      userId: 'cmgla99e20000u0yuebp3yg2p'
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true
    }
  });

  console.log('Found templates:');
  templates.forEach((t: any) => {
    console.log(`  - Name: "${t.name}"`);
    console.log(`    ID: ${t.id}`);
    console.log(`    Created: ${t.createdAt}`);
    console.log(`    Updated: ${t.updatedAt}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
