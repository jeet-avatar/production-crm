"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
router.get('/programs', async (req, res) => {
    console.log('🤝 [PARTNERS] Fetching active partner programs...');
    try {
        const programs = await prisma_1.prisma.partnerProgram.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                commissionRate: true,
                minPayment: true,
                description: true,
                benefits: true,
                requirements: true,
            },
        });
        console.log(`🤝 [PARTNERS] Found ${programs.length} active programs`);
        res.json({ programs });
    }
    catch (error) {
        console.error('❌ [PARTNERS] Error fetching programs:', error);
        res.status(500).json({
            error: 'Failed to fetch partner programs',
            details: error.message || 'Unknown error',
        });
    }
});
router.post('/apply', async (req, res) => {
    console.log('🤝 [PARTNERS] New partner application received');
    try {
        const { programId, firstName, lastName, email, phone, company, website, businessType, customersCount, industry, yearsInBusiness, message, } = req.body;
        if (!programId || !firstName || !lastName || !email || !businessType) {
            console.log('❌ [PARTNERS] Missing required fields');
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['programId', 'firstName', 'lastName', 'email', 'businessType'],
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ [PARTNERS] Invalid email format:', email);
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const program = await prisma_1.prisma.partnerProgram.findUnique({
            where: { id: programId },
        });
        if (!program) {
            console.log('❌ [PARTNERS] Invalid program ID:', programId);
            return res.status(400).json({ error: 'Invalid partner program' });
        }
        if (!program.isActive) {
            console.log('❌ [PARTNERS] Program is not active:', programId);
            return res.status(400).json({ error: 'This partner program is not currently accepting applications' });
        }
        const existingApplication = await prisma_1.prisma.partnerApplication.findFirst({
            where: {
                email,
                programId,
            },
        });
        if (existingApplication) {
            console.log('⚠️ [PARTNERS] Duplicate application detected:', email, programId);
            return res.status(409).json({
                error: 'Application already exists',
                message: 'You have already applied for this program. We will review your application and get back to you soon.',
            });
        }
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const userAgent = req.headers['user-agent'];
        const application = await prisma_1.prisma.partnerApplication.create({
            data: {
                programId,
                firstName,
                lastName,
                email,
                phone: phone || null,
                company: company || null,
                website: website || null,
                businessType,
                customersCount: customersCount || null,
                industry: industry || null,
                yearsInBusiness: yearsInBusiness || null,
                message: message || null,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                status: 'pending',
            },
            include: {
                program: true,
            },
        });
        console.log('✅ [PARTNERS] Application created:', application.id);
        try {
            const emailService = new email_service_1.EmailService();
            await emailService.sendEmail({
                from: 'BrandMonkz Partners <partners@brandmonkz.com>',
                to: [email],
                subject: `BrandMonkz ${program.name} Application Received`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #FF9800 0%, #FF6B9D 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">BrandMonkz Partner Program</h1>
            </div>

            <div style="padding: 30px; background-color: #f9f9f9;">
              <h2 style="color: #333;">Thank you for your interest!</h2>

              <p style="color: #666; line-height: 1.6;">
                Hi ${firstName},
              </p>

              <p style="color: #666; line-height: 1.6;">
                We've received your application for the <strong>${program.name}</strong> program.
                Our team will review your application and get back to you within 2-3 business days.
              </p>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #FF9800; margin-top: 0;">Application Details:</h3>
                <p style="color: #666; margin: 5px 0;"><strong>Program:</strong> ${program.name}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                ${company ? `<p style="color: #666; margin: 5px 0;"><strong>Company:</strong> ${company}</p>` : ''}
                <p style="color: #666; margin: 5px 0;"><strong>Business Type:</strong> ${businessType}</p>
                <p style="color: #666; margin: 5px 0;"><strong>Application ID:</strong> ${application.id}</p>
              </div>

              <p style="color: #666; line-height: 1.6;">
                In the meantime, feel free to explore our website to learn more about BrandMonkz
                and how we can help you grow your business.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://brandmonkz.com" style="background: linear-gradient(135deg, #FF9800 0%, #FF6B9D 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Visit BrandMonkz
                </a>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                If you have any questions, please contact us at partners@brandmonkz.com
              </p>
            </div>

            <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
              <p>© ${new Date().getFullYear()} BrandMonkz. All rights reserved.</p>
              <p>This email was sent because you applied for our partner program.</p>
            </div>
          </div>
        `,
                text: `
Thank you for applying to the BrandMonkz ${program.name} program!

Hi ${firstName},

We've received your application and our team will review it within 2-3 business days.

Application Details:
- Program: ${program.name}
- Name: ${firstName} ${lastName}
- Email: ${email}
${company ? `- Company: ${company}` : ''}
- Business Type: ${businessType}
- Application ID: ${application.id}

We'll be in touch soon!

BrandMonkz Team
partners@brandmonkz.com
        `,
            });
            console.log('✅ [PARTNERS] Confirmation email sent to applicant');
        }
        catch (emailError) {
            console.error('⚠️ [PARTNERS] Failed to send confirmation email:', emailError);
        }
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'support@brandmonkz.com';
            const emailService = new email_service_1.EmailService();
            await emailService.sendEmail({
                from: 'BrandMonkz Partners <partners@brandmonkz.com>',
                to: [adminEmail],
                subject: `New Partner Application: ${program.name}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9800;">New Partner Application Received</h2>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Program Details:</h3>
              <p><strong>Program:</strong> ${program.name}</p>
              <p><strong>Application ID:</strong> ${application.id}</p>
              <p><strong>Applied:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Applicant Information:</h3>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              ${website ? `<p><strong>Website:</strong> <a href="${website}" target="_blank">${website}</a></p>` : ''}
              <p><strong>Business Type:</strong> ${businessType}</p>
              ${customersCount ? `<p><strong>Customer Count:</strong> ${customersCount}</p>` : ''}
              ${industry ? `<p><strong>Industry:</strong> ${industry}</p>` : ''}
              ${yearsInBusiness ? `<p><strong>Years in Business:</strong> ${yearsInBusiness}</p>` : ''}
            </div>

            ${message ? `
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            ` : ''}

            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Request Metadata:</h3>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>User Agent:</strong> ${userAgent}</p>
            </div>

            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/admin/partners" style="background: #FF9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Review Application
              </a>
            </p>
          </div>
        `,
                text: `
New Partner Application Received

Program: ${program.name}
Application ID: ${application.id}

Applicant Information:
- Name: ${firstName} ${lastName}
- Email: ${email}
${phone ? `- Phone: ${phone}` : ''}
${company ? `- Company: ${company}` : ''}
${website ? `- Website: ${website}` : ''}
- Business Type: ${businessType}
${customersCount ? `- Customer Count: ${customersCount}` : ''}
${industry ? `- Industry: ${industry}` : ''}
${yearsInBusiness ? `- Years in Business: ${yearsInBusiness}` : ''}

${message ? `Message:\n${message}\n` : ''}

Request Metadata:
- IP: ${ipAddress}
- User Agent: ${userAgent}

Review at: ${process.env.FRONTEND_URL || 'https://brandmonkz.com'}/admin/partners
        `,
            });
            console.log('✅ [PARTNERS] Admin notification email sent');
        }
        catch (emailError) {
            console.error('⚠️ [PARTNERS] Failed to send admin notification email:', emailError);
        }
        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: application.id,
        });
    }
    catch (error) {
        console.error('❌ [PARTNERS] Error creating application:', error);
        res.status(500).json({
            error: 'Failed to submit application',
            details: error.message || 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=partners.routes.js.map