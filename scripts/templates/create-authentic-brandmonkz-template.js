const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAuthenticTemplate() {
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
        name: 'BrandMonkz Invitation - Official Branding',
        subject: '🚀 Join BrandMonkz - Replace 4 Tools with One AI-Powered Platform',
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
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 40px 20px;">

                <!-- Main Email Card -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;">

                    <!-- Header with Authentic BrandMonkz Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 50%, #EF4444 100%); padding: 50px 40px; text-align: center;">
                            <!-- BrandMonkz Logo SVG -->
                            <svg width="220" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px;">
                                <!-- Orange Circle -->
                                <circle cx="30" cy="30" r="24" fill="#FFFFFF"/>

                                <!-- "B" in Circle -->
                                <text x="30" y="30" font-size="28" font-weight="bold" fill="#FF6B35" text-anchor="middle" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
                                    B
                                </text>

                                <!-- "Brand" text -->
                                <text x="66" y="30" font-size="24" font-weight="700" fill="#FFFFFF" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif">
                                    Brand
                                </text>

                                <!-- "Monkz" text -->
                                <text x="137" y="30" font-size="24" font-weight="700" fill="#FFFFFF" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" style="opacity: 0.95;">
                                    Monkz
                                </text>
                            </svg>
                            <p style="margin: 0; color: rgba(255,255,255,0.95); font-size: 17px; font-weight: 600; letter-spacing: 0.3px;">
                                Your AI-Powered Marketing CRM
                            </p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 50px 40px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700; color: #1C1C1E; letter-spacing: -0.5px;">
                                Hi {{recipientName}},
                            </h2>

                            <p style="margin: 0 0 24px 0; font-size: 17px; line-height: 1.6; color: #3C3C43;">
                                <strong style="color: #FF6B35;">{{senderName}}</strong> from <strong style="color: #FF6B35;">{{companyName}}</strong> has invited you to join BrandMonkz - the platform that replaces HubSpot, Canva, Loom, and Vimeo with one AI-powered solution.
                            </p>

                            <!-- Video Placeholder with BrandMonkz Style -->
                            <div style="margin: 36px 0; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(255,107,53,0.15); border: 3px solid #FF6B35;">
                                <div style="position: relative; padding-bottom: 56.25%; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%);">
                                    <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" border="0" style="position: absolute; top: 0; left: 0;">
                                        <tr>
                                            <td align="center" valign="middle">
                                                <!-- Play Button -->
                                                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style="margin-bottom: 12px;">
                                                    <circle cx="40" cy="40" r="40" fill="rgba(255,255,255,0.95)"/>
                                                    <circle cx="40" cy="40" r="36" fill="#FF6B35"/>
                                                    <path d="M34 28L54 40L34 52V28Z" fill="white"/>
                                                </svg>
                                                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">
                                                    PERSONALIZED VIDEO
                                                </p>
                                                <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">
                                                    Coming Soon
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                            <!-- Value Prop Box -->
                            <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-left: 5px solid #FF6B35; border-radius: 12px; padding: 28px; margin: 36px 0;">
                                <h3 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #1C1C1E; letter-spacing: -0.3px;">
                                    Stop Paying for 4 Separate Tools
                                </h3>
                                <p style="margin: 0; font-size: 17px; line-height: 1.6; color: #3C3C43;">
                                    BrandMonkz combines everything into one powerful platform - at a fraction of the cost.
                                </p>
                            </div>

                            <!-- Feature Cards with BrandMonkz Colors -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 36px 0;">
                                <tr>
                                    <td width="50%" style="padding: 0 10px 20px 0; vertical-align: top;">
                                        <div style="border: 2px solid #FFE4E6; border-radius: 16px; padding: 24px; height: 100%; background: linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%);">
                                            <div style="font-size: 40px; line-height: 1; margin-bottom: 14px;">📊</div>
                                            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #1C1C1E;">
                                                HubSpot CRM
                                            </h4>
                                            <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #3C3C43;">
                                                Full CRM with automation
                                            </p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FF6B35;">
                                                💰 Save $1,200/mo
                                            </p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 0 0 20px 10px; vertical-align: top;">
                                        <div style="border: 2px solid #FFE4E6; border-radius: 16px; padding: 24px; height: 100%; background: linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%);">
                                            <div style="font-size: 40px; line-height: 1; margin-bottom: 14px;">🎨</div>
                                            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #1C1C1E;">
                                                Canva Pro
                                            </h4>
                                            <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #3C3C43;">
                                                Email templates & design
                                            </p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FF6B35;">
                                                💰 Save $120/mo
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td width="50%" style="padding: 0 10px 0 0; vertical-align: top;">
                                        <div style="border: 2px solid #FFE4E6; border-radius: 16px; padding: 24px; height: 100%; background: linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%);">
                                            <div style="font-size: 40px; line-height: 1; margin-bottom: 14px;">🎥</div>
                                            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #1C1C1E;">
                                                Loom + Vimeo
                                            </h4>
                                            <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #3C3C43;">
                                                Unbranded video tracking
                                            </p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FF6B35;">
                                                💰 Save $250/mo
                                            </p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 0 0 0 10px; vertical-align: top;">
                                        <div style="border: 2px solid #FFE4E6; border-radius: 16px; padding: 24px; height: 100%; background: linear-gradient(135deg, #FFF1F2 0%, #FFFFFF 100%);">
                                            <div style="font-size: 40px; line-height: 1; margin-bottom: 14px;">⚡</div>
                                            <h4 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #1C1C1E;">
                                                AI Automation
                                            </h4>
                                            <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #3C3C43;">
                                                Smart lead workflows
                                            </p>
                                            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #FF6B35;">
                                                💰 Save $500/mo
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- ONE Automation - BrandMonkz Gradient -->
                            <div style="background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 50%, #EF4444 100%); border-radius: 16px; padding: 36px; margin: 40px 0; box-shadow: 0 8px 24px rgba(255,107,53,0.3);">
                                <h3 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                                    The Power of ONE Automation
                                </h3>
                                <p style="margin: 0 0 20px 0; font-size: 17px; line-height: 1.7; color: rgba(255,255,255,0.95);">
                                    <strong>Prospect visits your site</strong> → BrandMonkz automatically:
                                </p>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 14px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.25); border-radius: 6px; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700; color: #ffffff;">1</div>
                                                    </td>
                                                    <td style="color: #ffffff; font-size: 16px; line-height: 1.7;">
                                                        Creates enriched lead profile with AI
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 14px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.25); border-radius: 6px; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700; color: #ffffff;">2</div>
                                                    </td>
                                                    <td style="color: #ffffff; font-size: 16px; line-height: 1.7;">
                                                        Sends personalized video introduction
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 14px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.25); border-radius: 6px; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700; color: #ffffff;">3</div>
                                                    </td>
                                                    <td style="color: #ffffff; font-size: 16px; line-height: 1.7;">
                                                        Tracks opens, clicks, video views
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 14px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.25); border-radius: 6px; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700; color: #ffffff;">4</div>
                                                    </td>
                                                    <td style="color: #ffffff; font-size: 16px; line-height: 1.7;">
                                                        Scores lead based on behavior
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td style="padding-right: 14px; vertical-align: top;">
                                                        <div style="background: rgba(255,255,255,0.25); border-radius: 6px; width: 28px; height: 28px; text-align: center; line-height: 28px; font-size: 14px; font-weight: 700; color: #ffffff;">5</div>
                                                    </td>
                                                    <td style="color: #ffffff; font-size: 16px; line-height: 1.7;">
                                                        Alerts you when they're ready to buy
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 24px 0 0 0; font-size: 18px; line-height: 1.6; color: #ffffff; font-weight: 700;">
                                    All automatic. Zero manual work. 🚀
                                </p>
                            </div>

                            <!-- Smart Leads Box -->
                            <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border: 3px solid #F59E0B; border-radius: 16px; padding: 28px; margin: 36px 0;">
                                <h3 style="margin: 0 0 14px 0; font-size: 21px; font-weight: 700; color: #1C1C1E;">
                                    🧠 Smart Lead Intelligence
                                </h3>
                                <p style="margin: 0; font-size: 17px; line-height: 1.6; color: #3C3C43;">
                                    Our AI doesn't just collect leads - it <strong>understands them</strong>. Every click, view, and interaction is analyzed to tell you exactly when to reach out and what to say.
                                </p>
                            </div>

                            <!-- CTA Button - BrandMonkz Orange -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 48px 0 40px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{inviteLink}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); color: #ffffff; text-decoration: none; padding: 20px 50px; border-radius: 12px; font-size: 19px; font-weight: 700; letter-spacing: -0.2px; box-shadow: 0 6px 20px rgba(255,107,53,0.4);">
                                            Get Started Now →
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Savings Banner -->
                            <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border: 3px solid #10B981; border-radius: 12px; padding: 24px; text-align: center; margin: 36px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #065F46; letter-spacing: -0.3px;">
                                    💰 Save $2,070+ Every Month
                                </p>
                                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #059669;">
                                    vs. HubSpot + Canva + Loom + Vimeo
                                </p>
                            </div>

                            <!-- Footer Note -->
                            <p style="margin: 28px 0 0 0; font-size: 16px; line-height: 1.6; color: #6B7280;">
                                Questions? Reply to this email anytime - we're here to help!
                            </p>

                        </td>
                    </tr>

                    <!-- Footer with BrandMonkz Branding -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-top: 3px solid #FF6B35; padding: 36px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
                                <span style="color: #1C1C1E;">Brand</span><span style="color: #FF6B35;">Monkz</span>
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #6B7280; font-weight: 500;">
                                Your AI-Powered Marketing CRM
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

{{senderName}} from {{companyName}} has invited you to join BrandMonkz - the platform that replaces HubSpot, Canva, Loom, and Vimeo with one AI-powered solution.

STOP PAYING FOR 4 SEPARATE TOOLS

📊 HubSpot CRM - Full CRM with automation (Save $1,200/mo)
🎨 Canva Pro - Email templates & design (Save $120/mo)
🎥 Loom + Vimeo - Unbranded video tracking (Save $250/mo)
⚡ AI Automation - Smart lead workflows (Save $500/mo)

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

Questions? Reply to this email anytime - we're here to help!

---
BrandMonkz - Your AI-Powered Marketing CRM`
      }
    });

    console.log('\n✅ AUTHENTIC BrandMonkz email template created!');
    console.log('\n📧 Template Details:');
    console.log(`   ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Owner: ${ethan.email}`);
    console.log('\n🎨 Authentic BrandMonkz Branding:');
    console.log('   • Official Orange (#FF6B35) to Rose (#F43F5E) gradient');
    console.log('   • Exact logo from login page (circle + Brand/Monkz)');
    console.log('   • Matching color scheme throughout');
    console.log('   • Professional rounded design');
    console.log('   • BrandMonkz personality and voice');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAuthenticTemplate();
