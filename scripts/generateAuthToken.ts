import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
  // Get the test user
  const user = await prisma.user.findFirst({
    where: { email: 'jithesh@example.com' }
  });

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // Generate a token
  const token = AuthUtils.generateToken(user);

  console.log('\n🔑 Authentication Token Generated:\n');
  console.log(token);
  console.log('\n💡 Add this to your .env file as:');
  console.log(`CRM_AUTH_TOKEN="${token}"`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
