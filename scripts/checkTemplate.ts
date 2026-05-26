import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.emailTemplate.findUnique({
    where: { id: 'cmh6zjse500017qcbc6bafcye' }
  });

  if (template) {
    console.log('\n✅ Email Template Found!\n');
    console.log('Name:', template.name);
    console.log('Subject:', template.subject);
    console.log('\nText Content:');
    console.log('═'.repeat(60));
    console.log(template.textContent);
    console.log('═'.repeat(60));
    console.log('\nHTML Content:');
    console.log('═'.repeat(60));
    console.log(template.htmlContent);
    console.log('═'.repeat(60));
  } else {
    console.log('❌ Template not found');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
