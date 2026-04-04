"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    try {
        console.log('[EMAIL FOOTER] GET / - req.user:', req.user);
        console.log('[EMAIL FOOTER] GET / - req.user?.id:', req.user?.id);
        const userId = req.user?.id;
        if (!userId) {
            console.log('[EMAIL FOOTER] GET / - No userId, returning 401');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log('[EMAIL FOOTER] GET / - userId found:', userId);
        let footerConfig = await prisma_1.prisma.emailFooterConfig.findFirst({
            where: {
                userId,
                isActive: true
            },
            orderBy: {
                isDefault: 'desc'
            }
        });
        if (!footerConfig) {
            footerConfig = await prisma_1.prisma.emailFooterConfig.create({
                data: {
                    userId,
                    companyName: 'BrandMonkz',
                    missionStatement: 'Empowering businesses with AI-powered marketing tools that simplify growth, automate workflows, and drive results — all in one unified platform.',
                    supportEmail: 'support@brandmonkz.com',
                    supportPhone: '+1 (800) BRAND-MZ',
                    address: '123 Innovation Drive, San Francisco, CA 94102',
                    website: 'https://brandmonkz.com',
                    linkedinUrl: 'https://linkedin.com/company/brandmonkz',
                    twitterUrl: 'https://twitter.com/brandmonkz',
                    facebookUrl: 'https://facebook.com/brandmonkz',
                    instagramUrl: 'https://instagram.com/brandmonkz',
                    youtubeUrl: 'https://youtube.com/@brandmonkz',
                    privacyPolicyUrl: 'https://brandmonkz.com/privacy',
                    termsOfServiceUrl: 'https://brandmonkz.com/terms',
                    gdprUrl: 'https://brandmonkz.com/gdpr',
                    cookiePolicyUrl: 'https://brandmonkz.com/cookies',
                    dpaUrl: 'https://brandmonkz.com/dpa',
                    productLinks: {
                        'Features': 'https://brandmonkz.com/features',
                        'Pricing': 'https://brandmonkz.com/pricing',
                        'Integrations': 'https://brandmonkz.com/integrations',
                        'Roadmap': 'https://brandmonkz.com/roadmap'
                    },
                    resourceLinks: {
                        'Blog': 'https://brandmonkz.com/blog',
                        'Help Center': 'https://brandmonkz.com/help',
                        'API Docs': 'https://brandmonkz.com/api-docs',
                        'Templates': 'https://brandmonkz.com/templates'
                    },
                    companyLinks: {
                        'About Us': 'https://brandmonkz.com/about',
                        'Careers': 'https://brandmonkz.com/careers',
                        'Contact Us': 'https://brandmonkz.com/contact',
                        'Partners': 'https://brandmonkz.com/partners'
                    },
                    primaryColor: '#FB923C',
                    secondaryColor: '#F43F5E',
                    isDefault: true,
                    isActive: true
                }
            });
        }
        res.json(footerConfig);
    }
    catch (error) {
        console.error('Error fetching footer config:', error);
        res.status(500).json({ error: 'Failed to fetch footer configuration' });
    }
});
router.get('/all', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const configs = await prisma_1.prisma.emailFooterConfig.findMany({
            where: {
                userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(configs);
    }
    catch (error) {
        console.error('Error fetching footer configs:', error);
        res.status(500).json({ error: 'Failed to fetch footer configurations' });
    }
});
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const footerConfig = await prisma_1.prisma.emailFooterConfig.create({
            data: {
                userId,
                ...req.body
            }
        });
        res.status(201).json(footerConfig);
    }
    catch (error) {
        console.error('Error creating footer config:', error);
        res.status(500).json({ error: 'Failed to create footer configuration' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const existing = await prisma_1.prisma.emailFooterConfig.findUnique({
            where: { id }
        });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ error: 'Footer configuration not found' });
        }
        const updated = await prisma_1.prisma.emailFooterConfig.update({
            where: { id },
            data: req.body
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating footer config:', error);
        res.status(500).json({ error: 'Failed to update footer configuration' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const existing = await prisma_1.prisma.emailFooterConfig.findUnique({
            where: { id }
        });
        if (!existing || existing.userId !== userId) {
            return res.status(404).json({ error: 'Footer configuration not found' });
        }
        await prisma_1.prisma.emailFooterConfig.delete({
            where: { id }
        });
        res.json({ message: 'Footer configuration deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting footer config:', error);
        res.status(500).json({ error: 'Failed to delete footer configuration' });
    }
});
router.get('/render', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const footerConfig = await prisma_1.prisma.emailFooterConfig.findFirst({
            where: {
                userId,
                isActive: true
            },
            orderBy: {
                isDefault: 'desc'
            }
        });
        if (!footerConfig) {
            return res.status(404).json({ error: 'No footer configuration found' });
        }
        const footerHTML = generateFooterHTML(footerConfig);
        res.json({ html: footerHTML });
    }
    catch (error) {
        console.error('Error rendering footer:', error);
        res.status(500).json({ error: 'Failed to render footer' });
    }
});
function generateFooterHTML(config) {
    const { companyName, missionStatement, supportEmail, supportPhone, address, linkedinUrl, twitterUrl, facebookUrl, instagramUrl, youtubeUrl, privacyPolicyUrl, termsOfServiceUrl, gdprUrl, cookiePolicyUrl, dpaUrl, productLinks, resourceLinks, companyLinks, showSocialMedia, showMission, showQuickLinks, showContactInfo, showLegalLinks, showGdprNotice, primaryColor, secondaryColor } = config;
    let html = '';
    if (showSocialMedia && (linkedinUrl || twitterUrl || facebookUrl || instagramUrl || youtubeUrl)) {
        html += `
    <tr>
      <td style="padding: 32px 40px 24px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                Connect with us
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>`;
        if (linkedinUrl) {
            html += `
                  <td style="padding: 0 12px;">
                    <a href="${linkedinUrl}" style="display: inline-block; text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0077B5 0%, #00A0DC 100%); border-radius: 8px; text-align: center; line-height: 40px;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">in</span>
                      </div>
                    </a>
                  </td>`;
        }
        if (twitterUrl) {
            html += `
                  <td style="padding: 0 12px;">
                    <a href="${twitterUrl}" style="display: inline-block; text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%); border-radius: 8px; text-align: center; line-height: 40px;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">𝕏</span>
                      </div>
                    </a>
                  </td>`;
        }
        if (facebookUrl) {
            html += `
                  <td style="padding: 0 12px;">
                    <a href="${facebookUrl}" style="display: inline-block; text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #1877F2 0%, #0d65d9 100%); border-radius: 8px; text-align: center; line-height: 40px;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">f</span>
                      </div>
                    </a>
                  </td>`;
        }
        if (instagramUrl) {
            html += `
                  <td style="padding: 0 12px;">
                    <a href="${instagramUrl}" style="display: inline-block; text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #E1306C 0%, #F77737 50%, #FCAF45 100%); border-radius: 8px; text-align: center; line-height: 40px;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">📷</span>
                      </div>
                    </a>
                  </td>`;
        }
        if (youtubeUrl) {
            html += `
                  <td style="padding: 0 12px;">
                    <a href="${youtubeUrl}" style="display: inline-block; text-decoration: none;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #FF0000 0%, #CC0000 100%); border-radius: 8px; text-align: center; line-height: 40px;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 700;">▶</span>
                      </div>
                    </a>
                  </td>`;
        }
        html += `
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    if (showMission && missionStatement) {
        html += `
    <tr>
      <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.01em;">
                Our Mission
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6e6e73; text-align: center; max-width: 480px; margin: 0 auto;">
                ${missionStatement}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    if (showQuickLinks && (productLinks || resourceLinks || companyLinks)) {
        html += `
    <tr>
      <td style="padding: 24px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #1d1d1f;">
                Quick Links
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>`;
        if (productLinks) {
            html += `
                  <td valign="top" width="33%" style="padding: 8px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #6e6e73;">Product</p>`;
            Object.entries(productLinks).forEach(([label, url]) => {
                html += `<p style="margin: 0 0 4px 0;"><a href="${url}" style="font-size: 13px; color: ${primaryColor}; text-decoration: none;">${label}</a></p>`;
            });
            html += `</td>`;
        }
        if (resourceLinks) {
            html += `
                  <td valign="top" width="33%" style="padding: 8px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #6e6e73;">Resources</p>`;
            Object.entries(resourceLinks).forEach(([label, url]) => {
                html += `<p style="margin: 0 0 4px 0;"><a href="${url}" style="font-size: 13px; color: ${primaryColor}; text-decoration: none;">${label}</a></p>`;
            });
            html += `</td>`;
        }
        if (companyLinks) {
            html += `
                  <td valign="top" width="33%" style="padding: 8px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #6e6e73;">Company</p>`;
            Object.entries(companyLinks).forEach(([label, url]) => {
                html += `<p style="margin: 0 0 4px 0;"><a href="${url}" style="font-size: 13px; color: ${primaryColor}; text-decoration: none;">${label}</a></p>`;
            });
            html += `</td>`;
        }
        html += `
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    if (showContactInfo && (supportEmail || supportPhone || address)) {
        html += `
    <tr>
      <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1d1d1f;">
                Get in Touch
              </p>`;
        if (supportEmail) {
            html += `
              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #6e6e73;">
                📧 <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">${supportEmail}</a>
              </p>`;
        }
        if (supportPhone) {
            html += `
              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #6e6e73;">
                📞 <a href="tel:${supportPhone.replace(/[^0-9+]/g, '')}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">${supportPhone}</a>
              </p>`;
        }
        if (address) {
            html += `
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6e6e73;">
                🏢 ${address}
              </p>`;
        }
        html += `
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    if (showLegalLinks && (privacyPolicyUrl || termsOfServiceUrl || gdprUrl || cookiePolicyUrl || dpaUrl)) {
        html += `
    <tr>
      <td style="padding: 24px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.6; color: #86868b;">`;
        const links = [];
        if (privacyPolicyUrl)
            links.push(`<a href="${privacyPolicyUrl}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Privacy Policy</a>`);
        if (termsOfServiceUrl)
            links.push(`<a href="${termsOfServiceUrl}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Terms of Service</a>`);
        if (gdprUrl)
            links.push(`<a href="${gdprUrl}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">GDPR</a>`);
        if (cookiePolicyUrl)
            links.push(`<a href="${cookiePolicyUrl}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Cookie Policy</a>`);
        if (dpaUrl)
            links.push(`<a href="${dpaUrl}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">DPA</a>`);
        html += links.join(' · ');
        html += `
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    if (showGdprNotice) {
        html += `
    <tr>
      <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.6; color: #6e6e73; text-align: center;">
                You're receiving this email because you were invited to ${companyName}. We respect your privacy and comply with GDPR regulations.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #6e6e73; text-align: center;">
                <a href="{{unsubscribeLink}}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Unsubscribe</a> ·
                <a href="{{preferencesLink}}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Email Preferences</a> ·
                <a href="{{dataRequestLink}}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">Request My Data</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    }
    html += `
    <tr>
      <td style="padding: 24px 40px; background-color: #ffffff; border-top: 1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #86868b; text-align: center;">
                © ${new Date().getFullYear()} ${companyName}, Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #86868b; text-align: center;">
                ${companyName} is a registered trademark. Made with ❤️
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
    return html;
}
exports.default = router;
//# sourceMappingURL=emailFooter.js.map