const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const contacts = await prisma.contact.findMany({ include: { company: true } });
    const companies = await prisma.company.findMany();
    const users = await prisma.user.findMany();
    
    console.log('\n📊 DATABASE STATUS:\n');
    console.log(`Users: ${users.length}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log(`Companies: ${companies.length}`);
    
    if (contacts.length > 0) {
      console.log('\n📋 CONTACTS FOUND:');
      contacts.forEach(c => {
        console.log(`  - ${c.firstName} ${c.lastName} (${c.email}) - Company: ${c.company?.name || 'None'}`);
      });
    }
    
    if (companies.length > 0) {
      console.log('\n🏢 COMPANIES FOUND:');
      companies.forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
