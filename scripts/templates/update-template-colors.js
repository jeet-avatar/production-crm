const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateColors() {
  try {
    // Find the Apple Design template
    const template = await prisma.emailTemplate.findFirst({
      where: { name: 'BrandMonkz Invitation - Apple Design' },
    });

    if (!template) {
      console.error('❌ Template not found');
      return;
    }

    console.log('Found template:', template.name);
    console.log('Current ID:', template.id);
    console.log('');

    // Updated darker orange-to-rose gradient colors
    // Original: #FF6B35 → #F43F5E
    // Darker:   #E85A2A → #D91D42
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join BrandMonkz</title>
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 24px !important; }
      .mobile-text { font-size: 15px !important; }
      .mobile-heading { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif; background-color: #f5f5f7; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">

          <!-- Header with Darker Orange-Rose Gradient -->
          <tr>
            <td style="padding: 48px 40px 32px 40px; text-align: center; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- BrandMonkz Logo -->
                    <div style="display: inline-block; background: #ffffff; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <div style="width: 42px; height: 42px; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%); border-radius: 10px; display: inline-block; text-align: center; line-height: 42px;">
                              <span style="color: #ffffff; font-size: 24px; font-weight: 700;">B</span>
                            </div>
                          </td>
                          <td style="padding-left: 14px; vertical-align: middle;">
                            <span style="font-size: 26px; font-weight: 700; color: #1C1C1E; letter-spacing: -0.02em;">Brand</span><span style="font-size: 26px; font-weight: 700; color: #E85A2A; letter-spacing: -0.02em;">Monkz</span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 48px 40px;">

              <!-- Greeting -->
              <h1 class="mobile-heading" style="margin: 0 0 16px 0; font-size: 32px; font-weight: 600; color: #1d1d1f; line-height: 1.15; letter-spacing: -0.02em;">
                Hi {{recipientName}},
              </h1>

              <!-- Introduction -->
              <p class="mobile-text" style="margin: 0 0 24px 0; font-size: 17px; line-height: 1.6; color: #1d1d1f; letter-spacing: -0.01em;">
                {{senderName}} has invited you to join <strong style="color: #E85A2A;">BrandMonkz</strong> — your all-in-one AI-powered marketing platform that replaces HubSpot, Canva, Loom, and Vimeo.
              </p>

              <!-- Feature Highlights -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">

                <!-- Feature 1 -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="56" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 44px; height: 44px; border-radius: 11px; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 44px;">
                            <span style="font-size: 22px;">🚀</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <h3 style="margin: 0 0 8px 0; font-size: 19px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                            Smart CRM & Automation
                          </h3>
                          <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73;">
                            Manage contacts, deals, and automate workflows with AI-powered intelligence.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 2 -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="56" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 44px; height: 44px; border-radius: 11px; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 44px;">
                            <span style="font-size: 22px;">📊</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <h3 style="margin: 0 0 8px 0; font-size: 19px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                            AI Lead Intelligence
                          </h3>
                          <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73;">
                            Enrich leads with company data, social profiles, and AI-powered insights.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 3 -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7; border-bottom: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="56" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 44px; height: 44px; border-radius: 11px; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 44px;">
                            <span style="font-size: 22px;">✉️</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <h3 style="margin: 0 0 8px 0; font-size: 19px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                            Smart Email Campaigns
                          </h3>
                          <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73;">
                            Design, send, and track beautiful email campaigns with real-time analytics.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 40px 0 32px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{inviteLink}}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #E85A2A 0%, #D91D42 100%); border-radius: 12px; text-decoration: none; font-size: 17px; font-weight: 600; color: #ffffff; letter-spacing: -0.01em; box-shadow: 0 4px 14px rgba(232, 90, 42, 0.35); transition: all 0.2s ease;">
                      Join Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary Info -->
              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6; color: #6e6e73; text-align: center;">
                Questions? Reply to this email or visit our <a href="https://brandmonkz.com/help" style="color: #E85A2A; text-decoration: none; font-weight: 500;">Help Center</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f5f5f7; border-top: 1px solid #d2d2d7;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #86868b;">
                      © 2025 BrandMonkz. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #86868b;">
                      <a href="https://brandmonkz.com/privacy" style="color: #86868b; text-decoration: none;">Privacy</a> ·
                      <a href="https://brandmonkz.com/terms" style="color: #86868b; text-decoration: none;">Terms</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

    const textContent = `
Hi {{recipientName}},

{{senderName}} has invited you to join BrandMonkz — your all-in-one AI-powered marketing platform.

What you get with BrandMonkz:

🚀 Smart CRM & Automation
Manage contacts, deals, and automate workflows with AI-powered intelligence.

📊 AI Lead Intelligence
Enrich leads with company data, social profiles, and AI-powered insights.

✉️ Smart Email Campaigns
Design, send, and track beautiful email campaigns with real-time analytics.

Join Now: {{inviteLink}}

Questions? Visit https://brandmonkz.com/help

© 2025 BrandMonkz. All rights reserved.
    `.trim();

    // Update the template
    await prisma.emailTemplate.update({
      where: { id: template.id },
      data: {
        htmlContent,
        textContent,
      },
    });

    console.log('✅ Template updated with darker orange-rose gradient!');
    console.log('');
    console.log('🎨 Color Changes:');
    console.log('   Original Orange: #FF6B35 → New: #E85A2A (darker)');
    console.log('   Original Rose:   #F43F5E → New: #D91D42 (darker)');
    console.log('');
    console.log('📧 Updated Elements:');
    console.log('   • Header gradient background');
    console.log('   • Logo icon background');
    console.log('   • "Monkz" text color');
    console.log('   • "BrandMonkz" text highlight');
    console.log('   • Feature icon backgrounds (3 items)');
    console.log('   • "Join Now" button gradient');
    console.log('   • Help Center link color');
    console.log('');
    console.log('Template ID:', template.id);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateTemplateColors();
