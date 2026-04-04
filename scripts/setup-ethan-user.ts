import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Setting up Ethan as the exclusive owner...\n');

  // 1. Create or find Ethan's user account
  let ethan = await prisma.user.findUnique({
    where: { email: 'ethan@brandmonkz.com' }
  });

  if (!ethan) {
    console.log('📝 Creating Ethan user account...');
    const hashedPassword = await bcrypt.hash('BrandMonkz2024!', 10);

    ethan = await prisma.user.create({
      data: {
        email: 'ethan@brandmonkz.com',
        passwordHash: hashedPassword,
        firstName: 'Ethan',
        lastName: 'BrandMonkz',
        role: 'ADMIN',
        teamRole: 'OWNER'
      }
    });
    console.log(`✅ Created Ethan: ${ethan.id}\n`);
  } else {
    console.log(`✅ Ethan already exists: ${ethan.id}\n`);
  }

  // 2. Transfer the template to Ethan
  console.log('📧 Transferring email template to Ethan...');
  const template = await prisma.emailTemplate.updateMany({
    where: {
      name: 'NetSuite AI Automation with Tracking'
    },
    data: {
      userId: ethan.id,
      updatedAt: new Date()
    }
  });
  console.log(`✅ Transferred ${template.count} template(s) to Ethan\n`);

  // 3. Transfer all campaigns to Ethan
  console.log('📊 Transferring all campaigns to Ethan...');
  const campaigns = await prisma.campaign.updateMany({
    data: {
      userId: ethan.id,
      updatedAt: new Date()
    }
  });
  console.log(`✅ Transferred ${campaigns.count} campaign(s) to Ethan\n`);

  // 4. Verify ownership
  console.log('🔍 Verifying ownership...\n');

  const ethanTemplates = await prisma.emailTemplate.count({
    where: { userId: ethan.id }
  });

  const ethanCampaigns = await prisma.campaign.count({
    where: { userId: ethan.id }
  });

  const othersTemplates = await prisma.emailTemplate.count({
    where: { userId: { not: ethan.id } }
  });

  const othersCampaigns = await prisma.campaign.count({
    where: { userId: { not: ethan.id } }
  });

  console.log('📊 Ownership Summary:');
  console.log(`   Ethan's templates: ${ethanTemplates}`);
  console.log(`   Ethan's campaigns: ${ethanCampaigns}`);
  console.log(`   Others' templates: ${othersTemplates}`);
  console.log(`   Others' campaigns: ${othersCampaigns}\n`);

  console.log('✅ Setup Complete!\n');
  console.log('👤 Ethan Login Details:');
  console.log(`   Email: ethan@brandmonkz.com`);
  console.log(`   Password: BrandMonkz2024!`);
  console.log(`   Role: ADMIN`);
  console.log(`   User ID: ${ethan.id}\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
