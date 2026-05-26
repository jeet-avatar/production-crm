import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedConsultationTemplate() {
  try {
    console.log('🌱 Seeding Professional Consultation Email Template...');

    // Get the first user to own this template
    const firstUser = await prisma.user.findFirst();

    if (!firstUser) {
      throw new Error('No users found in database. Please create a user first.');
    }

    console.log(`📧 Creating template for user: ${firstUser.email}`);

    const template = await prisma.emailTemplate.create({
      data: {
        name: 'Professional Consultation - Ready to Use',
        subject: 'Your Success Starts Here - Free Consultation Available',
        htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Consultation Available</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Your Success Starts Here - Schedule Your Free Consultation</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f7;">
    <tr>
      <td style="padding:40px 20px;" align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:48px 40px;text-align:center;border-radius:16px 16px 0 0;">
              <h1 style="margin:0;padding:0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">Your Success Starts Here</h1>
              <p style="margin:10px 0 0;color:#ffffff;font-size:14px;font-weight:300;letter-spacing:1px;opacity:0.9;">STRATEGIC EXCELLENCE</p>
            </td>
          </tr>
          <tr>
            <td style="padding:48px 40px;">
              <p style="margin:0 0 24px;color:#1d1d1f;font-size:17px;font-weight:600;line-height:1.5;">Hi there,</p>
              <p style="margin:0 0 32px;color:#424245;font-size:16px;line-height:1.7;">We're excited to connect with you! Our team of expert consultants is ready to help transform your business challenges into opportunities. Watch our introduction video to learn how we've helped companies like yours achieve remarkable growth.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:32px 0;">
                <tr>
                  <td align="center">
                    <a href="https://calendly.com/your-company/consultation" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#ffffff;font-size:18px;font-weight:600;text-decoration:none;padding:18px 50px;border-radius:50px;border:none;letter-spacing:1px;box-shadow:0 4px 15px rgba(102, 126, 234, 0.4);">
                      SCHEDULE YOUR FREE CONSULTATION
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:32px 0 0;color:#424245;font-size:16px;line-height:1.7;">Our consultation includes a comprehensive analysis of your current operations, personalized recommendations, and a strategic roadmap tailored to your goals.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:40px;padding-top:32px;border-top:2px solid #f0f0f2;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;color:#1d1d1f;font-size:16px;font-weight:600;">Best regards,</p>
                    <p style="margin:0 0 4px;color:#1d1d1f;font-size:16px;font-weight:600;">Your Name</p>
                    <p style="margin:0 0 4px;color:#6e6e73;font-size:14px;">Founder & CEO</p>
                    <p style="margin:0;color:#6e6e73;font-size:14px;font-weight:600;">Your Company</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1d1d1f;padding:40px;text-align:center;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 8px;color:#ffffff;font-size:15px;font-weight:600;">Your Company</p>
              <p style="margin:0 0 16px;color:#a1a1a6;font-size:13px;">123 Business Street, City, State 12345</p>
              <p style="margin:0 0 16px;color:#6e6e73;font-size:11px;">
                <a href="#" style="color:#a1a1a6;text-decoration:underline;">Unsubscribe</a>
                <span style="color:#6e6e73;"> • </span>
                <a href="#" style="color:#a1a1a6;">Privacy Policy</a>
              </p>
              <p style="margin:0;color:#6e6e73;font-size:11px;">&copy; 2025 Your Company. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
        textContent: `Hi there,

We're excited to connect with you! Our team of expert consultants is ready to help transform your business challenges into opportunities.

SCHEDULE YOUR FREE CONSULTATION: https://calendly.com/your-company/consultation

Our consultation includes a comprehensive analysis of your current operations, personalized recommendations, and a strategic roadmap tailored to your goals.

Best regards,
Your Name
Founder & CEO
Your Company

Unsubscribe | Privacy Policy
© 2025 Your Company. All rights reserved.`,
        variables: [],
        isActive: true,
        userId: firstUser.id,
      },
    });

    console.log('✅ Template created successfully!');
    console.log(`   ID: ${template.id}`);
    console.log(`   Name: ${template.name}`);
    console.log(`   Owner: ${firstUser.email}`);
    console.log('');
    console.log('🎉 The template is now available in Email Templates!');
  } catch (error) {
    console.error('❌ Error seeding template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedConsultationTemplate();
