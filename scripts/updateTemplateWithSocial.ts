import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Read the HTML template
  const htmlContent = fs.readFileSync(
    path.join(__dirname, 'redesigned_template_with_social.html'),
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

[📅 Schedule 15-Min Demo] - Email: jeetnair.in@gmail.com

Best regards,
Jithesh
AI Solutions for NetSuite

---
CONNECT WITH CRITICAL RIVER:
LinkedIn: https://www.linkedin.com/company/criticalriver/
Facebook: https://www.facebook.com/criticalriver/
Twitter/X: https://x.com/CriticalRiver
YouTube: https://www.youtube.com/channel/UCXgxr9PQQrzjwUB-9SzZ7Qg
Instagram: https://www.instagram.com/CriticalRiver/
Comparably: https://www.comparably.com/companies/criticalriver-in

---
CRITICAL RIVER
4750 Willow Road, Suite 200
Pleasanton, CA 94588

Phone: +1-844-228-5319
Email: contact@criticalriver.com

---
www.criticalriver.com

This email was sent to help you optimize your NetSuite operations.
If you'd prefer not to receive these emails, you can unsubscribe.`;

  // Update the template
  const result = await prisma.emailTemplate.updateMany({
    where: {
      name: 'NetSuite AI Automation',
      userId: 'cmgla99e20000u0yuebp3yg2p'
    },
    data: {
      htmlContent: htmlContent,
      textContent: textContent,
      updatedAt: new Date()
    }
  });

  console.log('\n✅ Email Template Updated - Critical River Branded Design!');
  console.log(`   Updated ${result.count} template(s)`);
  console.log('\n🎨 Critical River Brand Colors Applied:');
  console.log('   ✓ Primary: Deep Blue (#253f78)');
  console.log('   ✓ Accent: Vibrant Orange (#ff6801)');
  console.log('   ✓ Secondary: Dark Navy (#013e7d)');
  console.log('\n📧 Design Elements:');
  console.log('   ✓ Logo: 200px width, professional placement');
  console.log('   ✓ Header: Blue gradient with orange border accent');
  console.log('   ✓ Buttons: Orange (#ff6801) with uppercase styling');
  console.log('   ✓ Checkmarks: Orange circles with white icons');
  console.log('   ✓ Footer: Blue gradient matching header');
  console.log('\n🎥 Video & Calendar Integration:');
  console.log('   ✓ Video demo with orange CTA button');
  console.log('   ✓ Calendar booking: https://calendar.app.google/LiM5V1VPQrnGTLiV6');
  console.log('\n📱 Social & Contact:');
  console.log('   ✓ 6 social platforms + Comparably badge');
  console.log('   ✓ Contact info with orange accent links');
  console.log('   ✓ Domain: www.criticalriver.com');
  console.log('\n🌐 View at: https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch(console.error);
