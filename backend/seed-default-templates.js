#!/usr/bin/env node

/**
 * Seed Default Email Templates for All Existing Users
 *
 * This script creates the default "Critical River - Video Campaign (Ready to Use)"
 * template for all users who don't already have it.
 *
 * Usage:
 *   node seed-default-templates.js
 *
 * Or with DATABASE_URL override:
 *   DATABASE_URL="postgresql://user:pass@host:5432/db" node seed-default-templates.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_TEMPLATE = {
  name: 'Critical River - Video Campaign (Ready to Use)',
  subject: '{{headline}} - Watch Our Latest Video',
  templateType: 'video_campaign',
  fromEmail: 'hello@criticalriver.com',
  fromName: 'Critical River',
  isActive: true,
  variables: [
    'subject',
    'previewText',
    'logoUrl',
    'headline',
    'firstName',
    'bodyContent',
    'videoUrl',
    'videoThumbnailUrl',
    'videoTitle',
    'addToFeedUrl',
    'senderName',
    'senderTitle',
    'companyAddress',
    'companyCity',
    'companyState',
    'companyZip',
    'contactEmail',
    'contactPhone',
    'linkedInUrl',
    'twitterUrl',
    'facebookUrl',
    'youtubeUrl',
    'unsubscribeUrl',
    'preferencesUrl',
    'privacyPolicyUrl',
    'trackingPixelUrl',
    'currentYear',
  ],
  htmlContent: '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:linear-gradient(to right,#F97316,#FB7185);padding:30px 40px;text-align:center;border-radius:8px 8px 0 0}.header img{height:60px;max-width:200px}.header h1{margin:20px 0 0;color:#000;font-size:28px;font-weight:bold}.content{padding:40px;color:#1f2937;line-height:1.6}.greeting{font-size:18px;font-weight:600;margin-bottom:20px;color:#111827}.body-text{font-size:16px;color:#374151;margin-bottom:30px}.video-section{background:linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%);border-radius:12px;padding:20px;margin:30px 0;border:2px solid #f59e0b;text-align:center}.video-section a{text-decoration:none}.video-thumbnail{width:100%;border-radius:8px;margin-bottom:15px}.video-title{margin:15px 0 5px;color:#1f2937;font-size:18px;font-weight:bold}.video-subtitle{color:#6b7280;font-size:14px}.cta-container{text-align:center;margin:30px 0}.cta-button{display:inline-block;background:linear-gradient(to right,#F97316,#FB7185);color:#000;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid #000}.cta-button-secondary{display:inline-block;background:#fff;color:#F97316;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid #F97316}.signature{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px}.signature-name{font-weight:600;color:#111827;font-size:16px}.footer{background-color:#1f2937;color:#9ca3af;padding:30px 40px;text-align:center;font-size:13px;line-height:1.6;border-radius:0 0 8px 8px}.footer a{color:#F97316;text-decoration:underline;font-weight:600}@media screen and (max-width:600px){.container{width:100%!important}.header{padding:20px!important}.header h1{font-size:24px!important}.content{padding:20px!important}.cta-button,.cta-button-secondary{display:block!important;width:100%!important;margin:10px 0!important}.footer{padding:20px!important}}</style></head><body><div style="display:none;max-height:0;overflow:hidden;">{{previewText}}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;padding:40px 0"><tr><td align="center"><table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td class="header"><img src="{{logoUrl}}" alt="Critical River Logo"><h1>{{headline}}</h1></td></tr><tr><td class="content"><div class="greeting">Hi {{firstName}},</div><div class="body-text">{{bodyContent}}</div><div class="video-section"><a href="{{videoUrl}}" target="_blank"><img src="{{videoThumbnailUrl}}" alt="Watch Video" class="video-thumbnail"><h3 class="video-title">{{videoTitle}}</h3><p class="video-subtitle">▶ Click to watch the video</p></a></div><div class="cta-container"><a href="{{addToFeedUrl}}" class="cta-button" target="_blank">📰 Add to Daily Feed</a><br><a href="{{videoUrl}}" class="cta-button-secondary" target="_blank">▶ Watch Video</a></div><div class="signature"><div class="signature-name">{{senderName}}</div><div>{{senderTitle}}</div><div style="margin-top:10px">Critical River</div></div></td></tr><tr><td class="footer"><div style="margin-bottom:20px"><strong>Critical River</strong><br>{{companyAddress}}<br>{{companyCity}}, {{companyState}} {{companyZip}}<br><a href="mailto:{{contactEmail}}">{{contactEmail}}</a> | {{contactPhone}}</div><div style="margin:20px 0"><a href="{{linkedInUrl}}" target="_blank">LinkedIn</a> | <a href="{{twitterUrl}}" target="_blank">Twitter</a> | <a href="{{facebookUrl}}" target="_blank">Facebook</a> | <a href="{{youtubeUrl}}" target="_blank">YouTube</a></div><div style="margin:20px 0"><a href="{{unsubscribeUrl}}" target="_blank">Unsubscribe</a> | <a href="{{preferencesUrl}}" target="_blank">Email Preferences</a> | <a href="{{privacyPolicyUrl}}" target="_blank">Privacy Policy</a></div><div style="margin-top:20px;font-size:12px;color:#6b7280">&copy; {{currentYear}} Critical River. All rights reserved.</div><img src="{{trackingPixelUrl}}" alt="" width="1" height="1" style="display:none"></td></tr></table></td></tr></table></body></html>',
  textContent: '{{headline}}\n\nHi {{firstName}},\n\n{{bodyContent}}\n\nWatch Video: {{videoUrl}}\nVideo Title: {{videoTitle}}\n\n📰 Add to Daily Feed: {{addToFeedUrl}}\n▶ Watch Video: {{videoUrl}}\n\n---\n{{senderName}}\n{{senderTitle}}\nCritical River\n\n{{companyAddress}}\n{{companyCity}}, {{companyState}} {{companyZip}}\n{{contactEmail}} | {{contactPhone}}\n\nUnsubscribe: {{unsubscribeUrl}}\nPrivacy Policy: {{privacyPolicyUrl}}\n\n© {{currentYear}} Critical River. All rights reserved.'
};

async function seedDefaultTemplates() {
  console.log('🌱 Starting default template seeding...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    console.log(`📊 Found ${users.length} user(s) in database\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Nothing to seed.');
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if user already has this template
        const existingTemplate = await prisma.emailTemplate.findFirst({
          where: {
            userId: user.id,
            name: DEFAULT_TEMPLATE.name,
          },
        });

        if (existingTemplate) {
          console.log(`⏭️  Skipped ${user.email} (already has template)`);
          skipped++;
          continue;
        }

        // Create the template
        await prisma.emailTemplate.create({
          data: {
            ...DEFAULT_TEMPLATE,
            userId: user.id,
          },
        });

        console.log(`✅ Created template for ${user.email}`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating template for ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Created:  ${created} template(s)`);
    console.log(`⏭️  Skipped:  ${skipped} user(s) (already had template)`);
    console.log(`❌ Errors:   ${errors} error(s)`);
    console.log(`📊 Total:    ${users.length} user(s) processed`);
    console.log('='.repeat(60) + '\n');

    if (created > 0) {
      console.log('🎉 Default email templates successfully seeded!');
      console.log('\n💡 All users now have the "Critical River - Video Campaign (Ready to Use)" template.');
      console.log('   Users can customize the text and add their videos while keeping the professional design.\n');
    }
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDefaultTemplates()
  .then(() => {
    console.log('✨ Seeding complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
