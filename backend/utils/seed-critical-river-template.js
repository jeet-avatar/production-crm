"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const CRITICAL_RIVER_TEMPLATE = {
    name: 'Critical River - Video Campaign with Feed CTA',
    subject: '{{headline}} - Watch Our Latest Video',
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{subject}}</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; }
            .mobile-padding { padding: 10px 20px !important; }
            .mobile-hidden { display: none !important; }
            .button { width: 100% !important; }
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden;">{{previewText}}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
        <tr><td style="padding: 20px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr><td style="background: linear-gradient(to right, #F97316, #FB7185); padding: 30px 40px; text-align: center; border-radius: 8px 8px 0 0;">
                    <img src="{{logoUrl}}" alt="Critical River Logo" style="display: block; margin: 0 auto; height: 60px; max-width: 200px;">
                    <h1 style="margin: 20px 0 0; color: #000000; font-size: 28px; font-weight: bold;">{{headline}}</h1>
                </td></tr>
                <tr><td class="mobile-padding" style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 18px;">Hi {{firstName}},</p>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">{{bodyContent}}</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                        <tr><td style="background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%); border-radius: 12px; padding: 20px; border: 2px solid #f59e0b;">
                            <a href="{{videoUrl}}" target="_blank" style="display: block; text-decoration: none;">
                                <img src="{{videoThumbnailUrl}}" alt="Watch Video" style="width: 100%; border-radius: 8px; display: block;">
                                <h3 style="margin: 15px 0 5px; color: #1f2937; font-size: 18px; font-weight: bold; text-align: center;">{{videoTitle}}</h3>
                                <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">Click to watch now</p>
                            </a>
                        </td></tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                        <tr><td style="text-align: center;">
                            <a href="{{addToFeedUrl}}" target="_blank" class="button" style="display: inline-block; background: linear-gradient(to right, #F97316, #FB7185); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 8px; border: 2px solid #000000; margin-bottom: 15px;">📰 Add to Daily Feed</a><br>
                            <a href="{{videoUrl}}" target="_blank" class="button" style="display: inline-block; background-color: #ffffff; color: #F97316; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 8px; border: 2px solid #F97316;">▶ Watch Video</a>
                        </td></tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                        <tr><td>
                            <p style="margin: 0 0 10px; color: #1f2937; font-size: 16px; font-weight: 600;">Best regards,<br>{{senderName}}</p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">{{senderTitle}}<br>Critical River</p>
                        </td></tr>
                    </table>
                </td></tr>
                <tr><td style="background-color: #1f2937; padding: 30px 40px; border-radius: 0 0 8px 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                        <tr><td style="text-align: center;">
                            <p style="margin: 0 0 15px; color: #9ca3af; font-size: 14px; font-weight: 600;">Connect with us</p>
                        </td></tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr><td style="text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                            <p style="margin: 0 0 10px;"><strong>Critical River</strong><br>{{companyAddress}}<br>{{companyCity}}, {{companyState}} {{companyZip}}</p>
                            <p style="margin: 10px 0;">📧 <a href="mailto:{{contactEmail}}" style="color: #F97316; text-decoration: none;">{{contactEmail}}</a></p>
                        </td></tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr><td style="border-top: 1px solid #374151;"></td></tr>
                    </table>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr><td style="text-align: center; color: #6b7280; font-size: 11px; line-height: 1.6;">
                            <p style="margin: 0 0 10px;">You're receiving this email because you subscribed to our mailing list.</p>
                            <p style="margin: 0;">
                                <a href="{{unsubscribeUrl}}" style="color: #F97316; text-decoration: underline; font-weight: 600;">Unsubscribe</a>
                                &nbsp;|&nbsp;
                                <a href="{{privacyPolicyUrl}}" style="color: #F97316; text-decoration: none;">Privacy Policy</a>
                            </p>
                            <p style="margin: 10px 0 0; color: #4b5563;">© {{currentYear}} Critical River. All rights reserved.</p>
                        </td></tr>
                    </table>
                </td></tr>
            </table>
        </td></tr>
    </table>
    <img src="{{trackingPixelUrl}}" width="1" height="1" alt="" style="display:block;" />
</body>
</html>`,
    textContent: `Hi {{firstName}},

{{bodyContent}}

Watch our video: {{videoUrl}}

Add to your daily feed: {{addToFeedUrl}}

Best regards,
{{senderName}}
{{senderTitle}}
Critical River

{{companyAddress}}
{{companyCity}}, {{companyState}} {{companyZip}}
{{contactEmail}}

Unsubscribe: {{unsubscribeUrl}}

© {{currentYear}} Critical River. All rights reserved.`,
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
        'currentYear'
    ],
    isActive: true
};
async function seedCriticalRiverTemplate() {
    try {
        console.log('🌱 Seeding Critical River email template...\n');
        const users = await app_1.prisma.user.findMany({
            select: {
                id: true,
                email: true
            }
        });
        if (users.length === 0) {
            console.log('❌ No users found in database. Please create a user first.');
            return;
        }
        console.log(`📊 Found ${users.length} user(s)\n`);
        let createdCount = 0;
        let skippedCount = 0;
        for (const user of users) {
            const existingTemplate = await app_1.prisma.emailTemplate.findFirst({
                where: {
                    userId: user.id,
                    name: CRITICAL_RIVER_TEMPLATE.name
                }
            });
            if (existingTemplate) {
                console.log(`⏭️  Skipped user: ${user.email} (template already exists)`);
                skippedCount++;
                continue;
            }
            await app_1.prisma.emailTemplate.create({
                data: {
                    ...CRITICAL_RIVER_TEMPLATE,
                    userId: user.id
                }
            });
            console.log(`✅ Created template for user: ${user.email}`);
            createdCount++;
        }
        console.log('\n📊 Summary:');
        console.log(`   ✅ Templates created: ${createdCount}`);
        console.log(`   ⏭️  Templates skipped: ${skippedCount}`);
        console.log(`   📧 Total users: ${users.length}`);
        console.log('\n✨ Seeding complete!');
    }
    catch (error) {
        console.error('❌ Error seeding template:', error);
        throw error;
    }
    finally {
        await app_1.prisma.$disconnect();
    }
}
seedCriticalRiverTemplate()
    .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=seed-critical-river-template.js.map