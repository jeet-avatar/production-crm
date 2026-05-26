const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBrandMonkzTemplate() {
  try {
    // Find the super admin user (Ethan)
    const ethan = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (!ethan) {
      console.error('Super admin user not found');
      process.exit(1);
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join BrandMonkz</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'SF Pro Text', sans-serif; background-color: #f5f5f7; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">

          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- BrandMonkz Logo -->
                    <div style="display: inline-block; background: #ffffff; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <div style="width: 36px; height: 36px; background: #FF6B35; border-radius: 8px; display: inline-block; vertical-align: middle; text-align: center; line-height: 36px;">
                              <span style="color: #ffffff; font-size: 20px; font-weight: 700;">B</span>
                            </div>
                          </td>
                          <td style="padding-left: 12px;">
                            <span style="font-size: 24px; font-weight: 700; color: #1C1C1E; letter-spacing: -0.02em;">Brand</span><span style="font-size: 24px; font-weight: 700; color: #FF6B35; letter-spacing: -0.02em;">Monkz</span>
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
            <td style="padding: 48px 40px;">

              <!-- Greeting -->
              <h1 style="margin: 0 0 16px 0; font-size: 32px; font-weight: 600; color: #1d1d1f; line-height: 1.15; letter-spacing: -0.02em;">
                Hi {{recipientName}},
              </h1>

              <!-- Introduction -->
              <p style="margin: 0 0 24px 0; font-size: 17px; line-height: 1.6; color: #1d1d1f; letter-spacing: -0.01em;">
                {{senderName}} has invited you to join <strong>BrandMonkz</strong> — your all-in-one AI-powered marketing platform that replaces HubSpot, Canva, Loom, and Vimeo.
              </p>

              <!-- Feature Highlights -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 32px 0;">

                <!-- Feature 1: CRM & Automation -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="48" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px;">🚀</span>
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

                <!-- Feature 2: Video & Design -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="48" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px;">🎨</span>
                          </div>
                        </td>
                        <td style="vertical-align: top;">
                          <h3 style="margin: 0 0 8px 0; font-size: 19px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                            Video & Design Studio
                          </h3>
                          <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #6e6e73;">
                            Create stunning videos and graphics without Canva, Loom, or Vimeo.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Feature 3: Lead Intelligence -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="48" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px;">📊</span>
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

                <!-- Feature 4: Email Campaigns -->
                <tr>
                  <td style="padding: 24px 0; border-top: 1px solid #d2d2d7; border-bottom: 1px solid #d2d2d7;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="48" style="vertical-align: top; padding-right: 16px;">
                          <div style="width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); display: flex; align-items: center; justify-content: center; text-align: center; line-height: 40px;">
                            <span style="font-size: 20px;">✉️</span>
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
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{inviteLink}}" style="height:52px;v-text-anchor:middle;width:200px;" arcsize="23%" strokecolor="#FF6B35" fillcolor="#FF6B35">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:17px;font-weight:500;">Join Now</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{{inviteLink}}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #FF6B35 0%, #F43F5E 100%); border-radius: 12px; text-decoration: none; font-size: 17px; font-weight: 600; color: #ffffff; letter-spacing: -0.01em; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3); transition: transform 0.2s ease;">
                      Join Now
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Secondary Info -->
              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6; color: #6e6e73; text-align: center;">
                Questions? Reply to this email or visit our <a href="https://brandmonkz.com" style="color: #FF6B35; text-decoration: none; font-weight: 500;">Help Center</a>
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
                      <a href="https://brandmonkz.com/privacy" style="color: #86868b; text-decoration: none;">Privacy Policy</a> ·
                      <a href="https://brandmonkz.com/terms" style="color: #86868b; text-decoration: none;">Terms of Service</a> ·
                      <a href="{{unsubscribeLink}}" style="color: #86868b; text-decoration: none;">Unsubscribe</a>
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
</html>
    `.trim();

    const textContent = `
Hi {{recipientName}},

{{senderName}} has invited you to join BrandMonkz — your all-in-one AI-powered marketing platform.

What you get with BrandMonkz:

🚀 Smart CRM & Automation
Manage contacts, deals, and automate workflows with AI-powered intelligence.

🎨 Video & Design Studio
Create stunning videos and graphics without Canva, Loom, or Vimeo.

📊 AI Lead Intelligence
Enrich leads with company data, social profiles, and AI-powered insights.

✉️ Smart Email Campaigns
Design, send, and track beautiful email campaigns with real-time analytics.

Join Now: {{inviteLink}}

Questions? Reply to this email or visit https://brandmonkz.com

© 2025 BrandMonkz. All rights reserved.
Privacy Policy: https://brandmonkz.com/privacy
Unsubscribe: {{unsubscribeLink}}
    `.trim();

    // Create the template
    const template = await prisma.emailTemplate.create({
      data: {
        userId: ethan.id,
        name: 'BrandMonkz Team Invitation',
        subject: 'Join {{senderName}} on BrandMonkz',
        htmlContent: htmlContent,
        textContent: textContent,
        variables: ['recipientName', 'senderName', 'inviteLink', 'unsubscribeLink'],
        isActive: true,
      },
    });

    console.log('✅ BrandMonkz email template created successfully!');
    console.log('');
    console.log('Template Details:');
    console.log('- ID:', template.id);
    console.log('- Name:', template.name);
    console.log('- Subject:', template.subject);
    console.log('- Variables:', template.variables);
    console.log('');
    console.log('🎨 Features:');
    console.log('  • Apple-quality design with SF Pro fonts');
    console.log('  • BrandMonkz orange gradient (#FF6B35 → #F43F5E)');
    console.log('  • Prominent "Join Now" button with gradient');
    console.log('  • 4 feature highlights with icons');
    console.log('  • Responsive design for all email clients');
    console.log('  • MSO-compatible for Outlook');
    console.log('');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating template:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createBrandMonkzTemplate();
