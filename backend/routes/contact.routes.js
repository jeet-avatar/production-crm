"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
router.post('/sales', async (req, res) => {
    console.log('📧 [CONTACT] Received sales inquiry...');
    try {
        const { firstName, lastName, email, phone, company, companySize, inquiryType, message } = req.body;
        if (!firstName || !lastName || !email || !company || !inquiryType || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['firstName', 'lastName', 'email', 'company', 'inquiryType', 'message']
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentSubmission = await prisma_1.prisma.contactSubmission.findFirst({
            where: {
                email,
                createdAt: {
                    gte: oneHourAgo
                }
            }
        });
        if (recentSubmission) {
            return res.status(429).json({
                error: 'You have already submitted a contact request recently. Please wait before submitting again.'
            });
        }
        const submission = await prisma_1.prisma.contactSubmission.create({
            data: {
                firstName,
                lastName,
                email,
                phone: phone || null,
                company,
                companySize: companySize || null,
                inquiryType,
                message,
                ipAddress,
                userAgent,
                status: 'new',
                source: 'website'
            }
        });
        console.log('✅ [CONTACT] Submission created:', submission.id);
        const inquiryTypeLabels = {
            demo: 'Request a Demo',
            pricing: 'Pricing Information',
            enterprise: 'Enterprise Sales',
            partnership: 'Partnership Opportunity',
            support: 'Technical Support',
            other: 'Other Question'
        };
        const inquiryLabel = inquiryTypeLabels[inquiryType] || inquiryType;
        try {
            const emailService = new email_service_1.EmailService();
            await emailService.sendEmail({
                from: 'BrandMonkz Sales <sales@brandmonkz.com>',
                to: [email],
                subject: 'Thank you for contacting BrandMonkz',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FF9800 0%, #FF6B9D 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Thank You for Reaching Out!</h1>
            </div>

            <div style="padding: 30px; background-color: #f9f9f9;">
              <h2 style="color: #333;">Hi ${firstName},</h2>

              <p style="color: #666; line-height: 1.6;">
                We've received your inquiry and our sales team will get back to you within 24 hours.
              </p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #FF9800; margin-top: 0;">Your Inquiry Details:</h3>
                <p style="color: #666; margin: 5px 0;"><strong>Type:</strong> ${inquiryLabel}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Company:</strong> ${company}</p>
                ${companySize ? `<p style="color: #666; margin: 5px 0;"><strong>Company Size:</strong> ${companySize} employees</p>` : ''}
                <p style="color: #666; margin: 5px 0;"><strong>Reference ID:</strong> ${submission.id}</p>
              </div>

              <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
                <p style="color: #666; margin: 0; line-height: 1.6;">
                  <strong>In the meantime:</strong><br>
                  • Explore our <a href="https://brandmonkz.com/pricing" style="color: #FF9800;">pricing plans</a><br>
                  • Learn about our <a href="https://brandmonkz.com/security" style="color: #FF9800;">security & compliance</a><br>
                  • Check out our <a href="https://brandmonkz.com/partners" style="color: #FF9800;">partner program</a>
                </p>
              </div>

              <p style="color: #666; line-height: 1.6;">
                Have urgent questions? Call us at <a href="tel:+18002726365" style="color: #FF9800;">+1 (800) BRAND-MZ</a>
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://crm.brandmonkz.com" style="background: linear-gradient(135deg, #FF9800 0%, #FF6B9D 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Start Free Trial
                </a>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Questions? Reply to this email or contact us at sales@brandmonkz.com
              </p>
            </div>

            <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
              <p>© ${new Date().getFullYear()} BrandMonkz. All rights reserved.</p>
              <p>This email was sent because you contacted our sales team.</p>
            </div>
          </div>
        `,
                text: `
Thank you for contacting BrandMonkz!

Hi ${firstName},

We've received your inquiry and our sales team will get back to you within 24 hours.

Your Inquiry Details:
- Type: ${inquiryLabel}
- Company: ${company}
${companySize ? `- Company Size: ${companySize} employees` : ''}
- Reference ID: ${submission.id}

In the meantime, explore our website:
- Pricing: https://brandmonkz.com/pricing
- Security: https://brandmonkz.com/security
- Partner Program: https://brandmonkz.com/partners

Have urgent questions? Call us at +1 (800) BRAND-MZ

Best regards,
BrandMonkz Sales Team
sales@brandmonkz.com
        `
            });
            console.log('✅ [CONTACT] Confirmation email sent to customer');
        }
        catch (emailError) {
            console.error('⚠️ [CONTACT] Failed to send confirmation email:', emailError);
        }
        try {
            const salesEmail = process.env.SALES_EMAIL || 'sales@brandmonkz.com';
            const emailService = new email_service_1.EmailService();
            await emailService.sendEmail({
                from: 'BrandMonkz CRM <noreply@brandmonkz.com>',
                to: [salesEmail],
                subject: `New Sales Inquiry: ${inquiryLabel} - ${company}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">🎯 New Sales Inquiry Received</h2>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Contact Information:</h3>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
              <p><strong>Company:</strong> ${company}</p>
              ${companySize ? `<p><strong>Company Size:</strong> ${companySize} employees</p>` : ''}
            </div>

            <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #FF9800;">Inquiry Details:</h3>
              <p><strong>Type:</strong> ${inquiryLabel}</p>
              <p><strong>Message:</strong></p>
              <div style="background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap;">
${message}
              </div>
            </div>

            <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Metadata:</h3>
              <p><strong>Submission ID:</strong> ${submission.id}</p>
              <p><strong>Submitted:</strong> ${submission.createdAt.toLocaleString()}</p>
              <p><strong>Source:</strong> Website Contact Form</p>
              ${ipAddress ? `<p><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://crm.brandmonkz.com/admin/contacts/${submission.id}" style="background: linear-gradient(135deg, #FF9800 0%, #FF6B9D 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in CRM
              </a>
            </div>

            <p style="color: #666; font-size: 12px;">
              <strong>Action Required:</strong> Please respond to this inquiry within 24 hours to maintain our service level agreement.
            </p>
          </div>
        `,
                text: `
🎯 New Sales Inquiry Received

Contact Information:
- Name: ${firstName} ${lastName}
- Email: ${email}
${phone ? `- Phone: ${phone}` : ''}
- Company: ${company}
${companySize ? `- Company Size: ${companySize} employees` : ''}

Inquiry Details:
- Type: ${inquiryLabel}
- Message:
${message}

Metadata:
- Submission ID: ${submission.id}
- Submitted: ${submission.createdAt.toLocaleString()}
- Source: Website Contact Form

Action Required: Please respond within 24 hours.

View in CRM: https://crm.brandmonkz.com/admin/contacts/${submission.id}
        `
            });
            console.log('✅ [CONTACT] Notification email sent to sales team');
        }
        catch (emailError) {
            console.error('⚠️ [CONTACT] Failed to send notification email:', emailError);
        }
        res.status(201).json({
            success: true,
            message: 'Thank you for contacting us! We\'ll be in touch within 24 hours.',
            submissionId: submission.id
        });
    }
    catch (error) {
        console.error('❌ [CONTACT] Error processing submission:', error);
        res.status(500).json({
            error: 'Failed to process contact submission',
            details: error.message || 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=contact.routes.js.map