const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanyFields() {
  try {
    const company = await prisma.company.findFirst({
      where: { name: 'Carrier Global Corporation' }
    });

    console.log('=== CARRIER GLOBAL CORPORATION - ALL FIELDS ===\n');
    console.log(JSON.stringify(company, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkCompanyFields();
