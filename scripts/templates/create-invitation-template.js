const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createInvitationTemplate() {
  try {
    // Find Ethan's user ID
    const ethan = await prisma.user.findFirst({
      where: { email: 'ethan@brandmonkz.com' }
    });

    if (!ethan) {
      console.error('❌ Ethan user not found. Please check the email address.');
      return;
    }

    console.log(`✅ Found user: ${ethan.email} (ID: ${ethan.id})`);

    // Create the beautiful invitation email template
    const template = await prisma.emailTemplate.create({
      data: {
        userId: ethan.id,
        name: 'BrandMonkz - Platform Invitation',
        subject: 'Welcome to BrandMonkz - Your All-in-One Growth Platform',
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">

    <!-- Main Container -->
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">

                <!-- Email Content Card -->
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;">

                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                                🚀 BrandMonkz
                            </h1>
                            <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                Your All-in-One Growth Platform
                            </p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">

                            <!-- Greeting -->
                            <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
                                Hi {{recipientName}},
                            </h2>

                            <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                <strong>{{senderName}}</strong> from <strong>{{companyName}}</strong> has invited you to experience the future of sales and marketing automation.
                            </p>

                            <!-- Video Placeholder -->
                            <div style="margin: 30px 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
                                <div style="position: relative; padding-bottom: 56.25%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;">
                                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style="margin-bottom: 10px;">
                                            <circle cx="40" cy="40" r="40" fill="rgba(255, 255, 255, 0.2)"/>
                                            <path d="M32 28L54 40L32 52V28Z" fill="white"/>
                                        </svg>
                                        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Personalized Video Coming Soon</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Why BrandMonkz Section -->
                            <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 8px;">
                                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 20px; font-weight: 600;">
                                    🎯 Why BrandMonkz?
                                </h3>
                                <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                                    Stop juggling multiple expensive tools. BrandMonkz replaces:
                                </p>
                            </div>

                            <!-- Features Grid -->
                            <table role="presentation" style="width: 100%; margin: 20px 0;">
                                <tr>
                                    <td style="width: 50%; padding: 15px; vertical-align: top;">
                                        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; height: 100%;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">📊</div>
                                            <h4 style="margin: 0 0 8px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                                                HubSpot's CRM
                                            </h4>
                                            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.5;">
                                                Full-featured CRM without the $1,200/mo price tag
                                            </p>
                                        </div>
                                    </td>
                                    <td style="width: 50%; padding: 15px; vertical-align: top;">
                                        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; height: 100%;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">🎨</div>
                                            <h4 style="margin: 0 0 8px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                                                Canva Pro
                                            </h4>
                                            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.5;">
                                                Built-in design tools with email templates
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="width: 50%; padding: 15px; vertical-align: top;">
                                        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; height: 100%;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">🎥</div>
                                            <h4 style="margin: 0 0 8px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                                                Loom + Vimeo
                                            </h4>
                                            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.5;">
                                                No branding. Full tracking. Unlimited storage.
                                            </p>
                                        </div>
                                    </td>
                                    <td style="width: 50%; padding: 15px; vertical-align: top;">
                                        <div style="background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; height: 100%;">
                                            <div style="font-size: 32px; margin-bottom: 10px;">⚡</div>
                                            <h4 style="margin: 0 0 8px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
                                                Marketing Automation
                                            </h4>
                                            <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.5;">
                                                AI-powered workflows that convert leads
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Power of One Automation -->
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin: 30px 0;">
                                <h3 style="margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                                    ✨ The Power of ONE Automation
                                </h3>
                                <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; opacity: 0.95;">
                                    Imagine this: A prospect visits your website → BrandMonkz automatically:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                                    <li>Creates a lead profile with AI-powered enrichment</li>
                                    <li>Sends a personalized video introduction</li>
                                    <li>Tracks every engagement (opens, clicks, video views)</li>
                                    <li>Scores the lead based on behavior</li>
                                    <li>Alerts your team when they're ready to buy</li>
                                </ul>
                                <p style="margin: 15px 0 0 0; font-size: 15px; line-height: 1.6; opacity: 0.95;">
                                    All automatically. No manual work. No juggling tools.
                                </p>
                            </div>

                            <!-- Smart Lead Management -->
                            <div style="background: #fffaf0; border-left: 4px solid #f6ad55; padding: 20px; margin: 30px 0; border-radius: 8px;">
                                <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 18px; font-weight: 600;">
                                    🧠 Smart Lead Management
                                </h3>
                                <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                                    Our AI doesn't just collect leads - it <strong>understands them</strong>. Every interaction is tracked, analyzed, and turned into actionable insights. Know exactly when to reach out, what to say, and how to close.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 40px 0 30px 0;">
                                <a href="{{inviteLink}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                                    🚀 Get Started Now
                                </a>
                            </div>

                            <!-- Savings Callout -->
                            <div style="background: #f0fdf4; border: 2px dashed #10b981; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">
                                    💰 Save $2,500+/month
                                </p>
                                <p style="margin: 0; color: #047857; font-size: 14px;">
                                    vs. buying HubSpot, Canva Pro, Loom, and Vimeo separately
                                </p>
                            </div>

                            <!-- Footer Message -->
                            <p style="margin: 20px 0 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                                Questions? Just reply to this email - we're here to help!
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
                                Powered by <strong style="color: #667eea;">BrandMonkz</strong>
                            </p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                The all-in-one platform for modern sales teams
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

{{senderName}} from {{companyName}} has invited you to join BrandMonkz - your all-in-one growth platform.

WHY BRANDMONKZ?

Stop paying for multiple tools. BrandMonkz replaces:

📊 HubSpot's CRM - Full-featured CRM without the $1,200/mo price tag
🎨 Canva Pro - Built-in design tools with email templates
🎥 Loom + Vimeo - No branding. Full tracking. Unlimited storage.
⚡ Marketing Automation - AI-powered workflows that convert leads

THE POWER OF ONE AUTOMATION

Imagine: A prospect visits your website → BrandMonkz automatically:
• Creates a lead profile with AI-powered enrichment
• Sends a personalized video introduction
• Tracks every engagement (opens, clicks, video views)
• Scores the lead based on behavior
• Alerts your team when they're ready to buy

All automatically. No manual work. No juggling tools.

SMART LEAD MANAGEMENT

Our AI doesn't just collect leads - it understands them. Every interaction is tracked, analyzed, and turned into actionable insights. Know exactly when to reach out, what to say, and how to close.

💰 SAVE $2,500+/MONTH vs. buying HubSpot, Canva Pro, Loom, and Vimeo separately

Get started: {{inviteLink}}

Questions? Just reply to this email - we're here to help!

---
Powered by BrandMonkz
The all-in-one platform for modern sales teams`
      }
    });

    console.log('\n✅ Email template created successfully!');
    console.log('\n📧 Template Details:');
    console.log(`   ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Owner: ${ethan.email}`);
    console.log(`   Variables: ${template.variables.join(', ')}`);
    console.log('\n🎨 You can now use this template in your email campaigns!');
    console.log(`   View it in the Email Templates section of your CRM dashboard.`);

  } catch (error) {
    console.error('❌ Error creating template:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInvitationTemplate();
