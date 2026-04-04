const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAppleQualityTemplate() {
  try {
    const ethan = await prisma.user.findFirst({
      where: { email: 'ethan@brandmonkz.com' }
    });

    if (!ethan) {
      console.error('❌ User not found');
      return;
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: ethan.id,
        name: 'BrandMonkz Invitation - Apple Design',
        subject: 'Join BrandMonkz - Your All-in-One Growth Platform',
        variables: ['recipientName', 'senderName', 'inviteLink'],
        variableValues: {
          recipientName: '{{recipientName}}',
          senderName: '{{senderName}}',
          inviteLink: '{{inviteLink}}'
        },
        isActive: true,
        isShared: false,
        htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join BrandMonkz</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', 'Segoe UI', system-ui, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 60px 20px;">

                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff;">

                    <!-- Clean Header with Logo -->
                    <tr>
                        <td style="padding: 0 0 48px 0; text-align: center;">
                            <svg width="200" height="56" viewBox="0 0 200 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <!-- Orange Circle -->
                                <circle cx="28" cy="28" r="24" fill="#FF6B35"/>
                                <!-- "B" inside -->
                                <text x="28" y="28" font-size="26" font-weight="600" fill="white" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">B</text>
                                <!-- Brand text -->
                                <text x="62" y="28" font-size="22" font-weight="600" fill="#1d1d1f" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">Brand</text>
                                <!-- Monkz text -->
                                <text x="119" y="28" font-size="22" font-weight="600" fill="#FF6B35" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif">Monkz</text>
                            </svg>
                        </td>
                    </tr>

                    <!-- Hero Section -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 600; color: #1d1d1f; line-height: 1.15; letter-spacing: -0.02em;">
                                Hi {{recipientName}},
                            </h1>
                            <p style="margin: 0 0 32px 0; font-size: 19px; line-height: 1.5; color: #1d1d1f; font-weight: 400;">
                                <strong style="font-weight: 600;">{{senderName}}</strong> invited you to join BrandMonkz.
                            </p>
                            
                            <!-- Video Placeholder - Clean Apple Style -->
                            <div style="margin: 0 0 48px 0; border-radius: 18px; overflow: hidden; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); position: relative;">
                                <div style="padding-bottom: 56.25%; position: relative;">
                                    <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="position: absolute; top: 0; left: 0; height: 100%;">
                                        <tr>
                                            <td align="center" valign="middle" style="height: 100%;">
                                                <svg width="68" height="68" viewBox="0 0 68 68" fill="none" style="margin-bottom: 8px;">
                                                    <circle cx="34" cy="34" r="34" fill="rgba(255,255,255,0.95)"/>
                                                    <path d="M28 22L48 34L28 46V22Z" fill="#FF6B35"/>
                                                </svg>
                                                <p style="margin: 0; font-size: 15px; font-weight: 500; color: #ffffff; letter-spacing: -0.01em;">
                                                    Watch Video
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            <!-- Value Prop -->
                            <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1d1d1f; line-height: 1.2; letter-spacing: -0.015em;">
                                Replace 4 tools with one platform
                            </h2>
                            <p style="margin: 0 0 40px 0; font-size: 17px; line-height: 1.55; color: #6e6e73; font-weight: 400;">
                                Stop juggling HubSpot, Canva, Loom, and Vimeo. BrandMonkz combines everything into one powerful, AI-driven platform.
                            </p>

                            <!-- Clean Feature List -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 48px 0;">
                                <tr>
                                    <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding-right: 16px; vertical-align: top;">
                                                    <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center;">
                                                        <span style="font-size: 20px; line-height: 40px; text-align: center;">📊</span>
                                                    </div>
                                                </td>
                                                <td style="vertical-align: top;">
                                                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                                                        Full CRM & Automation
                                                    </h3>
                                                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73; font-weight: 400;">
                                                        Replace HubSpot. Save $1,200/month.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding-right: 16px; vertical-align: top;">
                                                    <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center;">
                                                        <span style="font-size: 20px; line-height: 40px; text-align: center;">🎨</span>
                                                    </div>
                                                </td>
                                                <td style="vertical-align: top;">
                                                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                                                        Email Templates & Design
                                                    </h3>
                                                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73; font-weight: 400;">
                                                        Replace Canva Pro. Save $120/month.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding-right: 16px; vertical-align: top;">
                                                    <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center;">
                                                        <span style="font-size: 20px; line-height: 40px; text-align: center;">🎥</span>
                                                    </div>
                                                </td>
                                                <td style="vertical-align: top;">
                                                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                                                        Video Hosting & Tracking
                                                    </h3>
                                                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73; font-weight: 400;">
                                                        Replace Loom + Vimeo. Save $250/month.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 24px 0; border-top: 1px solid #d2d2d7; border-bottom: 1px solid #d2d2d7;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding-right: 16px; vertical-align: top;">
                                                    <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center;">
                                                        <span style="font-size: 20px; line-height: 40px; text-align: center;">⚡</span>
                                                    </div>
                                                </td>
                                                <td style="vertical-align: top;">
                                                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                                                        AI Lead Intelligence
                                                    </h3>
                                                    <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73; font-weight: 400;">
                                                        Automatic enrichment & scoring. Save $500/month.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Clean CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{inviteLink}}" style="display: inline-block; padding: 14px 32px; background: #FF6B35; border-radius: 12px; text-decoration: none; font-size: 17px; font-weight: 500; color: #ffffff; letter-spacing: -0.01em;">
                                            Join Now
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Savings Note -->
                            <div style="text-align: center; padding: 20px 0; background: #f5f5f7; border-radius: 12px;">
                                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1d1d1f;">
                                    Save $2,070 per month
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 13px; color: #6e6e73; font-weight: 400;">
                                    compared to separate tools
                                </p>
                            </div>

                        </td>
                    </tr>

                    <!-- Clean Footer -->
                    <tr>
                        <td style="padding: 48px 40px 60px 40px; text-align: center; border-top: 1px solid #d2d2d7;">
                            <p style="margin: 0 0 4px 0; font-size: 13px; color: #6e6e73; font-weight: 400;">
                                Questions? Reply to this email anytime.
                            </p>
                            <p style="margin: 0; font-size: 13px; color: #86868b; font-weight: 400;">
                                © BrandMonkz · Your AI-Powered Marketing CRM
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>`,
        textContent: `Hi {{recipientName}},

{{senderName}} invited you to join BrandMonkz.

REPLACE 4 TOOLS WITH ONE PLATFORM

Stop juggling HubSpot, Canva, Loom, and Vimeo. BrandMonkz combines everything into one powerful, AI-driven platform.

• Full CRM & Automation - Replace HubSpot. Save $1,200/month.
• Email Templates & Design - Replace Canva Pro. Save $120/month.
• Video Hosting & Tracking - Replace Loom + Vimeo. Save $250/month.
• AI Lead Intelligence - Automatic enrichment & scoring. Save $500/month.

SAVE $2,070 PER MONTH compared to separate tools

Join Now: {{inviteLink}}

Questions? Reply to this email anytime.

© BrandMonkz · Your AI-Powered Marketing CRM`
      }
    });

    console.log('\n✅ Apple-quality email template created!');
    console.log('\n📧 Template Details:');
    console.log(`   ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Owner: ${ethan.email}`);
    console.log('\n🍎 Apple Design Quality:');
    console.log('   • SF Pro Text font system');
    console.log('   • Perfect letter spacing (-0.02em headings, -0.01em body)');
    console.log('   • Clean borders (1px #d2d2d7)');
    console.log('   • Minimal color palette (#1d1d1f, #6e6e73, #86868b)');
    console.log('   • 12px border radius on buttons');
    console.log('   • Clean "Join Now" CTA');
    console.log('   • Apple-style feature list with dividers');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAppleQualityTemplate();
