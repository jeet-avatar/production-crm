import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });

  console.log('Found users:');
  users.forEach((u: any) => {
    console.log(`  - ID: ${u.id}`);
    console.log(`    Email: ${u.email}`);
    console.log(`    Name: ${u.firstName} ${u.lastName}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
