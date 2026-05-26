const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSharpTemplate() {
  try {
    const ethan = await prisma.user.findFirst({
      where: { email: 'ethan@brandmonkz.com' }
    });

    if (!ethan) {
      console.error('❌ Ethan user not found');
      return;
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: ethan.id,
        name: 'BrandMonkz - Platform Invitation (Sharp)',
        subject: '🚀 Welcome to BrandMonkz - Replace 4 Tools with One Platform',
        variables: ['recipientName', 'senderName', 'companyName', 'inviteLink'],
        variableValues: {
          recipientName: '{{recipientName}}',
          senderName: '{{senderName}}',
          companyName: '{{companyName}}',
          inviteLink: '{{inviteLink}}'
        },
        isActive: true,
        isShared: false,
        htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BrandMonkz</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', sans-serif;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 20px 0;">

                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.05);">

                    <!-- Sharp Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%); padding: 0; position: relative;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding: 40px 40px 50px 40px;">
                                        <!-- Logo -->
                                        <div style="background: #ffffff; display: inline-block; padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                                            <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                                BrandMonkz
                                            </h1>
                                        </div>
                                        <p style="margin: 20px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">
                                            Your All-in-One Growth Platform
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Section -->
                    <tr>
                        <td style="padding: 50px 40px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.5px; line-height: 1.2;">
                                Hi {{recipientName}},
                            </h2>

                            <p style="margin: 0 0 24px 0; font-size: 17px; line-height: 1.6; color: #3a3a3a;">
                                <strong style="color: #0066ff;">{{senderName}}</strong> from <strong style="color: #0066ff;">{{companyName}}</strong> has invited you to join BrandMonkz - the platform that replaces HubSpot, Canva, Loom, and Vimeo with one powerful solution.
                            </p>

                            <!-- Video Placeholder - Sharp Design -->
                            <div style="margin: 36px 0; border: 2px solid #e5e5e5; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                <div style="position: relative; padding-bottom: 56.25%; background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%);">
                                    <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="position: absolute; top: 0; left: 0;">
                                        <tr>
                                            <td align="center" valign="middle">
                                                <!-- Play Button SVG -->
                                                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                                                    <circle cx="36" cy="36" r="36" fill="white" opacity="0.95"/>
                                                    <path d="M28 22L50 36L28 50V22Z" fill="#0066ff"/>
                                                </svg>
                                                <p style="margin: 12px 0 0 0; font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: 0.3px;">
                                                    PERSONALIZED VIDEO
                                                </p>
                                                <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">
                                                    Coming Soon
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            <!-- Value Proposition - Sharp Box -->
                            <div style="background: #f8f9fa; border: 1px solid #e5e5e5; border-left: 4px solid #0066ff; padding: 24px; margin: 36px 0;">
                                <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.3px;">
                                    Stop Paying for 4 Separate Tools
                                </h3>
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3a3a3a;">
                                    BrandMonkz combines everything you need into one seamless platform - at a fraction of the cost.
                                </p>
                            </div>

                            <!-- Feature Grid - Ultra Sharp -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 36px 0;">
                                <!-- Row 1 -->
                                <tr>
                                    <td width="50%" style="padding: 0 8px 16px 0; vertical-align: top;">
                                        <div style="border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; height: 100%; background: #ffffff;">
                                            <div style="font-size: 36px; line-height: 1; margin-bottom: 12px;">📊</div>
                                            <h4 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.2px;">
                                                HubSpot CRM
                                            </h4>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #666;">
                                                Full-featured CRM with automation
                                            </p>
                                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0066ff;">
                                                Save $1,200/mo
                                            </p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 0 0 16px 8px; vertical-align: top;">
                                        <div style="border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; height: 100%; background: #ffffff;">
                                            <div style="font-size: 36px; line-height: 1; margin-bottom: 12px;">🎨</div>
                                            <h4 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.2px;">
                                                Canva Pro
                                            </h4>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #666;">
                                                Email templates & design tools
                                            </p>
                                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0066ff;">
                                                Save $120/mo
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <!-- Row 2 -->
                                <tr>
                                    <td width="50%" style="padding: 0 8px 0 0; vertical-align: top;">
                                        <div style="border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; height: 100%; background: #ffffff;">
                                            <div style="font-size: 36px; line-height: 1; margin-bottom: 12px;">🎥</div>
                                            <h4 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.2px;">
                                                Loom + Vimeo
                                            </h4>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #666;">
                                                Unbranded video with tracking
                                            </p>
                                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0066ff;">
                                                Save $250/mo
                                            </p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 0 0 0 8px; vertical-align: top;">
                                        <div style="border: 2px solid #e5e5e5; border-radius: 8px; padding: 20px; height: 100%; background: #ffffff;">
                                            <div style="font-size: 36px; line-height: 1; margin-bottom: 12px;">⚡</div>
                                            <h4 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.2px;">
                                                Automation
                                            </h4>
                                            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #666;">
                                                AI-powered lead workflows
                                            </p>
                                            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #0066ff;">
                                                Save $500/mo
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- One Automation - Sharp Highlight -->
                            <div style="background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%); border-radius: 12px; padding: 32px; margin: 36px 0;">
                                <h3 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                                    The Power of ONE Automation
                                </h3>
                                <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.95);">
                                    <strong>Prospect visits your site</strong> → BrandMonkz automatically:
                                </p>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #ffffff;">1</div>
                                                    </td>
                                                    <td style="color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                        Creates enriched lead profile with AI
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #ffffff;">2</div>
                                                    </td>
                                                    <td style="color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                        Sends personalized video introduction
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #ffffff;">3</div>
                                                    </td>
                                                    <td style="color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                        Tracks opens, clicks, video views
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #ffffff;">4</div>
                                                    </td>
                                                    <td style="color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                        Scores lead based on behavior
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 12px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; color: #ffffff;">5</div>
                                                    </td>
                                                    <td style="color: rgba(255,255,255,0.95); font-size: 15px; line-height: 1.6;">
                                                        Alerts you when they're ready to buy
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 20px 0 0 0; font-size: 16px; line-height: 1.7; color: #ffffff; font-weight: 600;">
                                    All automatic. Zero manual work.
                                </p>
                            </div>

                            <!-- Smart Leads - Clean Box -->
                            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 24px; margin: 36px 0;">
                                <h3 style="margin: 0 0 12px 0; font-size: 19px; font-weight: 700; color: #0a0a0a; letter-spacing: -0.3px;">
                                    🧠 Smart Lead Intelligence
                                </h3>
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3a3a3a;">
                                    Our AI doesn't just collect leads - it <strong>understands them</strong>. Every click, view, and interaction is analyzed to tell you exactly when to reach out and what to say.
                                </p>
                            </div>

                            <!-- CTA Button - Sharp & Bold -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 48px 0 36px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{inviteLink}}" style="display: inline-block; background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 17px; font-weight: 700; letter-spacing: -0.2px; box-shadow: 0 4px 12px rgba(0, 102, 255, 0.3); text-align: center;">
                                            Get Started Now →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Savings Banner - Sharp -->
                            <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 36px 0;">
                                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #065f46; letter-spacing: -0.2px;">
                                    💰 Save $2,070+ Every Month
                                </p>
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #059669;">
                                    vs. HubSpot + Canva + Loom + Vimeo
                                </p>
                            </div>

                            <!-- Footer Note -->
                            <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #666;">
                                Questions? Reply to this email anytime.
                            </p>

                        </td>
                    </tr>

                    <!-- Clean Footer -->
                    <tr>
                        <td style="background: #f8f9fa; border-top: 1px solid #e5e5e5; padding: 32px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #0a0a0a;">
                                <span style="background: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">BrandMonkz</span>
                            </p>
                            <p style="margin: 0; font-size: 13px; color: #666;">
                                The All-in-One Platform for Modern Sales Teams
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

{{senderName}} from {{companyName}} has invited you to join BrandMonkz - the platform that replaces HubSpot, Canva, Loom, and Vimeo with one powerful solution.

STOP PAYING FOR 4 SEPARATE TOOLS

BrandMonkz combines everything you need:

📊 HubSpot CRM - Full-featured CRM with automation (Save $1,200/mo)
🎨 Canva Pro - Email templates & design tools (Save $120/mo)
🎥 Loom + Vimeo - Unbranded video with tracking (Save $250/mo)
⚡ Automation - AI-powered lead workflows (Save $500/mo)

THE POWER OF ONE AUTOMATION

Prospect visits your site → BrandMonkz automatically:
1. Creates enriched lead profile with AI
2. Sends personalized video introduction
3. Tracks opens, clicks, video views
4. Scores lead based on behavior
5. Alerts you when they're ready to buy

All automatic. Zero manual work.

SMART LEAD INTELLIGENCE

Our AI doesn't just collect leads - it understands them. Every click, view, and interaction is analyzed to tell you exactly when to reach out and what to say.

💰 SAVE $2,070+ EVERY MONTH vs. HubSpot + Canva + Loom + Vimeo

Get started: {{inviteLink}}

Questions? Reply to this email anytime.

---
BrandMonkz - The All-in-One Platform for Modern Sales Teams`
      }
    });

    console.log('\n✅ SHARP email template created successfully!');
    console.log('\n📧 Template Details:');
    console.log(`   ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Owner: ${ethan.email}`);
    console.log('\n🎨 This template features:');
    console.log('   • Sharp, crisp design with BrandMonkz blue (#0066ff → #00d4ff)');
    console.log('   • Professional logo treatment');
    console.log('   • Clean borders and spacing');
    console.log('   • High-contrast typography');
    console.log('   • Numbered automation steps');
    console.log('   • Bold savings callouts');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSharpTemplate();
