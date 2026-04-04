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

  // Add tracking pixel before </body>
  const trackingPixel = `
    <!-- Open Tracking Pixel -->
    <img src="https://brandmonkz.com/api/tracking/open/{{emailLogId}}"
         width="1" height="1"
         style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden"
         alt=""
         aria-hidden="true" />
  `;

  let trackedHtml = htmlContent.replace('</body>', trackingPixel + '\n</body>');

  // Define URL tracking wrapper
  const createTrackedLink = (originalUrl: string, ctaName: string) => {
    const encodedUrl = encodeURIComponent(originalUrl);
    return `https://brandmonkz.com/api/tracking/click/{{emailLogId}}?url=${encodedUrl}&cta=${ctaName}`;
  };

  // Track Video Demo Link
  trackedHtml = trackedHtml.replace(
    'href="https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4"',
    `href="${createTrackedLink('https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4', 'watch_video')}"`
  );

  // Track Calendar Link
  trackedHtml = trackedHtml.replace(
    'href="https://calendar.app.google/LiM5V1VPQrnGTLiV6"',
    `href="${createTrackedLink('https://calendar.app.google/LiM5V1VPQrnGTLiV6', 'schedule_demo')}"`
  );

  // Track Social Media Links
  trackedHtml = trackedHtml.replace(
    'href="https://www.linkedin.com/company/criticalriver/"',
    `href="${createTrackedLink('https://www.linkedin.com/company/criticalriver/', 'social_linkedin')}"`
  );

  trackedHtml = trackedHtml.replace(
    'href="https://www.facebook.com/criticalriver/"',
    `href="${createTrackedLink('https://www.facebook.com/criticalriver/', 'social_facebook')}"`
  );

  trackedHtml = trackedHtml.replace(
    'href="https://x.com/CriticalRiver"',
    `href="${createTrackedLink('https://x.com/CriticalRiver', 'social_twitter')}"`
  );

  trackedHtml = trackedHtml.replace(
    'href="https://www.youtube.com/channel/UCXgxr9PQQrzjwUB-9SzZ7Qg"',
    `href="${createTrackedLink('https://www.youtube.com/channel/UCXgxr9PQQrzjwUB-9SzZ7Qg', 'social_youtube')}"`
  );

  trackedHtml = trackedHtml.replace(
    'href="https://www.instagram.com/CriticalRiver/"',
    `href="${createTrackedLink('https://www.instagram.com/CriticalRiver/', 'social_instagram')}"`
  );

  trackedHtml = trackedHtml.replace(
    'href="https://www.comparably.com/companies/criticalriver-in?utm_source=widgets&utm_medium=cfc&utm_campaign=star_rating"',
    `href="${createTrackedLink('https://www.comparably.com/companies/criticalriver-in?utm_source=widgets&utm_medium=cfc&utm_campaign=star_rating', 'social_comparably')}"`
  );

  // Track Contact Links
  trackedHtml = trackedHtml.replace(
    /href="mailto:contact@criticalriver\.com"/g,
    `href="${createTrackedLink('mailto:contact@criticalriver.com', 'contact_email')}"`
  );

  // Track Website Link
  trackedHtml = trackedHtml.replace(
    'href="https://www.criticalriver.com"',
    `href="${createTrackedLink('https://www.criticalriver.com', 'website')}"`
  );

  // Create text content with tracking URLs
  const videoUrl = encodeURIComponent('https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4');
  const calendarUrl = encodeURIComponent('https://calendar.app.google/LiM5V1VPQrnGTLiV6');
  const websiteUrl = encodeURIComponent('https://www.criticalriver.com');

  const textContent = `Hi {{firstName}},

I noticed {{companyName}} is using NetSuite for financial management. We've helped companies like yours reduce month-end close time by 40-50% with AI-powered automation built specifically for NetSuite.

🎥 SEE IT IN ACTION
[Watch Demo Video]
https://brandmonkz.com/api/tracking/click/{{emailLogId}}?url=${videoUrl}&cta=watch_video

WHAT YOU'LL GET:
✓ Automated Invoice Processing & Reconciliation
✓ AI-Powered Revenue Recognition
✓ Real-Time Financial Dashboards
✓ Automated Journal Entries

[📅 Schedule 15-Min Demo]
https://brandmonkz.com/api/tracking/click/{{emailLogId}}?url=${calendarUrl}&cta=schedule_demo

Best regards,
Jithesh
AI Solutions for NetSuite

---
CRITICAL RIVER
www.criticalriver.com
https://brandmonkz.com/api/tracking/click/{{emailLogId}}?url=${websiteUrl}&cta=website

4750 Willow Road, Suite 200
Pleasanton, CA 94588
Phone: +1-844-228-5319
Email: contact@criticalriver.com

Unsubscribe: https://brandmonkz.com/unsubscribe?email={{email}}&campaignId={{campaignId}}`;

  // Check if template exists
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: {
      userId: 'cmh6zfbq40000ktn1f28gn7jj',
      name: 'NetSuite AI Automation with Tracking'
    }
  });

  let template;
  if (existingTemplate) {
    // Update existing template
    template = await prisma.emailTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        htmlContent: trackedHtml,
        textContent: textContent,
        subject: 'Transform Your NetSuite Operations with AI',
        updatedAt: new Date()
      }
    });
  } else {
    // Create new template
    template = await prisma.emailTemplate.create({
      data: {
        userId: 'cmh6zfbq40000ktn1f28gn7jj',
        name: 'NetSuite AI Automation with Tracking',
        subject: 'Transform Your NetSuite Operations with AI',
        htmlContent: trackedHtml,
        textContent: textContent,
        isActive: true
      }
    });
  }

  console.log('\n✅ Email Template Created/Updated with Comprehensive Tracking!');
  console.log(`   Template ID: ${template.id}`);
  console.log(`   Template Name: ${template.name}`);
  console.log('\n📊 Tracking Features Added:');
  console.log('   ✓ Open tracking pixel (invisible 1x1 image)');
  console.log('   ✓ Video demo click tracking (CTA: watch_video)');
  console.log('   ✓ Calendar booking click tracking (CTA: schedule_demo)');
  console.log('   ✓ LinkedIn click tracking (CTA: social_linkedin)');
  console.log('   ✓ Facebook click tracking (CTA: social_facebook)');
  console.log('   ✓ Twitter/X click tracking (CTA: social_twitter)');
  console.log('   ✓ YouTube click tracking (CTA: social_youtube)');
  console.log('   ✓ Instagram click tracking (CTA: social_instagram)');
  console.log('   ✓ Comparably click tracking (CTA: social_comparably)');
  console.log('   ✓ Email contact click tracking (CTA: contact_email)');
  console.log('   ✓ Website click tracking (CTA: website)');
  console.log('\n📈 Metrics You Can Now Track:');
  console.log('   • Total opens & unique opens');
  console.log('   • First/last opened timestamps');
  console.log('   • Time to open (from send)');
  console.log('   • Total clicks & unique clicks per CTA');
  console.log('   • Which CTA performs best');
  console.log('   • Click-through rate by CTA');
  console.log('   • Engagement score (0-100)');
  console.log('   • IP address & user agent');
  console.log('   • Device type & email client (parsed)');
  console.log('\n🎯 Analytics Available:');
  console.log('   • Campaign overview dashboard');
  console.log('   • Engagement leaderboard');
  console.log('   • CTA performance comparison');
  console.log('   • Time-based open/click charts');
  console.log('   • Lead scoring (hot/warm/cold)');
  console.log('\n🌐 View analytics at: https://brandmonkz.com/campaigns\n');

  // Save tracked HTML to file for reference
  fs.writeFileSync(
    path.join(__dirname, 'redesigned_template_with_tracking.html'),
    trackedHtml
  );
  console.log('💾 Tracked template saved to: scripts/redesigned_template_with_tracking.html\n');

  await prisma.$disconnect();
}

main().catch(console.error);
