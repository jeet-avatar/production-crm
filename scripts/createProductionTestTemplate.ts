import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking for users in production database...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true },
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  if (users.length === 0) {
    console.log('❌ No users found in database');
    process.exit(1);
  }

  console.log(`Found ${users.length} users:`);
  users.forEach((u, idx) => {
    console.log(`  ${idx + 1}. ${u.email} (${u.firstName} ${u.lastName}) - ID: ${u.id}`);
  });

  // Use the first user
  const user = users[0];
  console.log(`\n📝 Creating template for: ${user.email}\n`);

  // Create email template with name "Test with AI"
  const template = await prisma.emailTemplate.create({
    data: {
      name: 'Test with AI',
      subject: '{{firstName}}, Transform Your NetSuite with AI Automation',
      textContent: `Hi {{firstName}},

I noticed {{companyName}} is using NetSuite for financial management. I wanted to reach out because we've developed AI-powered automation specifically for NetSuite that's helping companies like yours reduce month-end close time by 40-50%.

Our solution handles:
• Automated invoice processing & reconciliation
• AI-powered revenue recognition
• Real-time financial dashboards
• Automated journal entries

I've created a quick 60-second video showing exactly how this works for companies in your industry.

Would you be open to a brief 15-minute call to discuss how we can help {{companyName}}?

Best regards,
Jithesh
AI Solutions for NetSuite`,
      htmlContent: `<p>Hi {{firstName}},</p>

<p>I noticed {{companyName}} is using NetSuite for financial management. I wanted to reach out because we've developed AI-powered automation specifically for NetSuite that's helping companies like yours reduce month-end close time by 40-50%.</p>

<p>Our solution handles:</p>
<ul>
<li>Automated invoice processing & reconciliation</li>
<li>AI-powered revenue recognition</li>
<li>Real-time financial dashboards</li>
<li>Automated journal entries</li>
</ul>

<p>I've created a quick 60-second video showing exactly how this works for companies in your industry.</p>

<p>Would you be open to a brief 15-minute call to discuss how we can help {{companyName}}?</p>

<p>Best regards,<br>
Jithesh<br>
AI Solutions for NetSuite</p>`,
      userId: user.id,
      isActive: true
    }
  });

  console.log('✅ Email Template Created!\n');
  console.log('Template Details:');
  console.log('  ID:', template.id);
  console.log('  Name:', template.name);
  console.log('  Subject:', template.subject);
  console.log('  User:', user.email);
  console.log('  Active:', template.isActive);
  console.log('\n📧 Template should now be visible in the UI at:');
  console.log('   https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch(console.error);
