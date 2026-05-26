import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Get the booking link from command line argument
  const bookingLink = process.argv[2];

  if (!bookingLink) {
    console.log('\n❌ Error: Please provide your Google Calendar booking link');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/updateCalendarLink.ts "YOUR_GOOGLE_CALENDAR_LINK"');
    console.log('\nExample:');
    console.log('  npx tsx scripts/updateCalendarLink.ts "https://calendar.google.com/calendar/appointments/schedules/AcZssZ..."');
    console.log('\n📖 See GOOGLE_CALENDAR_SETUP_INSTRUCTIONS.md for help creating your booking page\n');
    process.exit(1);
  }

  // Validate it's a Google Calendar link
  if (!bookingLink.includes('calendar.google.com') && !bookingLink.includes('calendar.app.google')) {
    console.log('\n❌ Error: This doesn\'t look like a Google Calendar link');
    console.log('Expected format: https://calendar.google.com/calendar/... or https://calendar.app.google/...');
    process.exit(1);
  }

  console.log('\n📅 Updating Calendar Booking Link...\n');
  console.log(`New booking link: ${bookingLink}`);

  // Read the HTML template
  let htmlContent = fs.readFileSync(
    path.join(__dirname, 'redesigned_template_with_social.html'),
    'utf-8'
  );

  // Replace the placeholder with actual booking link
  htmlContent = htmlContent.replace(
    'https://calendar.google.com/calendar/appointments/schedules/YOUR_BOOKING_PAGE_ID_HERE',
    bookingLink
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

[📅 Schedule 15-Min Demo] - Book directly: ${bookingLink}
⏰ See 10 available time slots • Pick your preferred time • Instant confirmation

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
This email was sent to help you optimize your NetSuite operations.
If you'd prefer not to receive these emails, you can unsubscribe.`;

  // Update the template in database
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

  console.log('\n✅ Email Template Updated with Calendar Booking Link!');
  console.log(`   Updated ${result.count} template(s)`);
  console.log('\n📅 Calendar Integration:');
  console.log('   ✓ Google Calendar Appointment Schedule connected');
  console.log('   ✓ Recipients can see available time slots');
  console.log('   ✓ 12-minute booking duration');
  console.log('   ✓ Up to 10 time slots visible');
  console.log('   ✓ Instant booking confirmation');
  console.log('   ✓ Automatic Google Meet links');
  console.log('\n🎯 How It Works:');
  console.log('   1. Recipient clicks "Schedule 15-Min Demo"');
  console.log('   2. Opens your Google Calendar booking page');
  console.log('   3. Shows your available 12-minute time slots');
  console.log('   4. They select a time and enter their info');
  console.log('   5. Booking confirmed instantly');
  console.log('   6. Both parties receive calendar invite + Meet link');
  console.log('\n🌐 View at: https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
