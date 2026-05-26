import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../src/utils/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🏗️  Creating Test Company and Contact for NetSuite Outreach Script...\n');

  // First, get or create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'jithesh@example.com' }
  });

  if (!user) {
    console.log('Creating test user: jithesh@example.com');
    const passwordHash = await AuthUtils.hashPassword('TestPass123!');
    user = await prisma.user.create({
      data: {
        email: 'jithesh@example.com',
        passwordHash,
        firstName: 'Jithesh',
        lastName: 'Kumar',
        role: 'ADMIN',
        teamRole: 'OWNER',
        isActive: true,
      }
    });
    console.log('✅ User created');
  } else {
    console.log('✅ User already exists');
  }

  // Create test company
  const companyData = {
    name: 'TechFlow Solutions',
    industry: 'SaaS',
    size: '201-500',
    domain: 'techflowsolutions.com',
    description: 'Leading provider of cloud-based ERP solutions. Currently using NetSuite for financial management but struggling with manual processes in month-end close and revenue recognition. Looking to automate workflows and improve reporting capabilities.',
    revenue: '$15M-$50M',
    country: 'United States',
    city: 'San Francisco',
    state: 'CA',
    userId: user.id,
  };

  let company = await prisma.company.findFirst({
    where: { name: companyData.name, userId: user.id }
  });

  if (!company) {
    console.log('\nCreating test company: TechFlow Solutions');
    company = await prisma.company.create({
      data: companyData
    });
    console.log('✅ Company created');
  } else {
    console.log('\n✅ Company already exists');
  }

  // Create test contact (CFO)
  const contactData = {
    firstName: 'Sarah',
    lastName: 'Martinez',
    email: 'sarah.martinez@techflowsolutions.com',
    title: 'Chief Financial Officer',
    phone: '+1-415-555-0123',
    companyId: company.id,
    userId: user.id,
  };

  let contact = await prisma.contact.findFirst({
    where: {
      email: contactData.email,
      userId: user.id
    }
  });

  if (!contact) {
    console.log('Creating test contact: Sarah Martinez (CFO)');
    contact = await prisma.contact.create({
      data: contactData
    });
    console.log('✅ Contact created');
  } else {
    console.log('✅ Contact already exists');
  }

  console.log('\n📋 Test Data Summary:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Company: ${company.name}`);
  console.log(`Industry: ${company.industry}`);
  console.log(`Size: ${company.size}`);
  console.log(`Description: ${company.description}`);
  console.log('');
  console.log(`Contact: ${contact.firstName} ${contact.lastName}`);
  console.log(`Title: ${contact.title}`);
  console.log(`Email: ${contact.email}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n✅ Test data ready! You can now run: npm run test:netsuite-outreach\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
