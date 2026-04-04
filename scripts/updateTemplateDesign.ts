import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Read the HTML template
  const htmlContent = fs.readFileSync(
    path.join(__dirname, 'redesigned_template.html'),
    'utf-8'
  );

  const textContent = `Hi {{firstName}},

I noticed {{companyName}} is using NetSuite for financial management. We've helped companies like yours reduce month-end close time by 40-50% with AI-powered automation built specifically for NetSuite.

🎥 SEE IT IN ACTION
I created a 60-second video showing exactly how this works for companies in your industry.
[Watch Demo Video]

WHAT YOU'LL GET:

✓ Automated Invoice Processing & Reconciliation
  Save 20+ hours per month on manual data entry

✓ AI-Powered Revenue Recognition
  Perfect accuracy for complex subscription models

✓ Real-Time Financial Dashboards
  Make data-driven decisions instantly

✓ Automated Journal Entries
  Eliminate errors and reduce close time

READY TO TRANSFORM {{companyName}}'S FINANCIAL OPERATIONS?

Let's schedule a quick 15-minute call. I'll show you the exact time and cost savings you can expect—no pressure, just insights.

[📅 Schedule 15-Min Demo]

Best regards,
Jithesh
AI Solutions for NetSuite

---
This email was sent to help you optimize your NetSuite operations.
If you'd prefer not to receive these emails, you can unsubscribe.`;

  // Update the template
  const result = await prisma.emailTemplate.updateMany({
    where: {
      name: 'Test with AI',
      userId: 'cmgla99e20000u0yuebp3yg2p'
    },
    data: {
      htmlContent: htmlContent,
      textContent: textContent,
      updatedAt: new Date()
    }
  });

  console.log('\n✅ Email Template Updated!');
  console.log(`   Updated ${result.count} template(s)`);
  console.log('\n📧 Changes:');
  console.log('   - Modern gradient header (orange-rose brand colors)');
  console.log('   - Video CTA with prominent button');
  console.log('   - Improved benefit list with icons and descriptions');
  console.log('   - Enhanced visual hierarchy');
  console.log('   - Mobile-responsive design');
  console.log('   - Professional footer');
  console.log('\n🌐 View at: https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch(console.error);
