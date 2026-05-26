import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Use production database URL
const DATABASE_URL = "postgresql://crm_user:8z7y6x5w4v3u2t1s@dpg-ctgq7jm8ii6s73f5dmrg-a.oregon-postgres.render.com/crm_production?sslmode=require&connection_limit=5&pool_timeout=20&connect_timeout=60";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  console.log('🌐 Connecting to PRODUCTION database...');

  // First, get the production user ID
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  });

  if (users.length === 0) {
    console.error('❌ No users found in production database');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 Found users:');
  users.forEach(u => {
    console.log(`   - ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u.id}`);
  });

  // Use the first user (or you can select a specific one)
  const userId = users[0].id;
  console.log(`\n✅ Using user: ${users[0].email} (${userId})`);

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

  console.log('\n📝 Creating template in PRODUCTION database...');

  // Check if template exists
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: {
      userId: userId,
      name: 'NetSuite AI Automation with Tracking'
    }
  });

  let template;
  if (existingTemplate) {
    console.log('⚠️  Template already exists. Updating...');
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
    console.log('✨ Creating new template...');
    // Create new template
    template = await prisma.emailTemplate.create({
      data: {
        userId: userId,
        name: 'NetSuite AI Automation with Tracking',
        subject: 'Transform Your NetSuite Operations with AI',
        htmlContent: trackedHtml,
        textContent: textContent,
        isActive: true
      }
    });
  }

  console.log('\n✅ Email Template Deployed to PRODUCTION!');
  console.log(`   Template ID: ${template.id}`);
  console.log(`   Template Name: ${template.name}`);
  console.log(`   Database: crm_production (Render PostgreSQL)`);
  console.log('\n📊 Tracking Features:');
  console.log('   ✓ Open tracking pixel');
  console.log('   ✓ 10 CTAs with click tracking');
  console.log('   ✓ Engagement scoring');
  console.log('   ✓ Real-time analytics');
  console.log('\n🌐 View at: https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
