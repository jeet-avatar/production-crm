const puppeteer = require('puppeteer');
const path = require('path');

const steps = [
  { emoji: '🔑', title: 'Login & Enter', desc: 'Sign in at app.brandmonkz.com with your email', bullets: ['Go to app.brandmonkz.com', 'Enter your email and password', 'Click "Login"', "You're in!"] },
  { emoji: '📧', title: 'Setup Email Server', desc: 'Connect your Gmail or SMTP so emails actually land', bullets: ['Go to Settings → Email', 'Choose Gmail OAuth or SMTP', 'Test the connection', 'Green check = ready'] },
  { emoji: '📣', title: 'Go To Campaigns', desc: 'Click "Campaigns" in the left menu', bullets: ['Look for "Campaigns" in the sidebar', 'Click it', "You'll see all past campaigns", 'Top-right = "New Campaign"'] },
  { emoji: '✏️', title: 'Create Campaign', desc: 'Hit "New Campaign", give it a name and subject line', bullets: ['Click "New Campaign"', 'Enter campaign name', 'Write your subject line', 'Choose campaign type'] },
  { emoji: '🤖', title: 'Write With AI', desc: 'Click "AI Write" — describe your goal in one sentence', bullets: ['Click the "AI Write" button', 'Describe your goal in 1 sentence', 'AI drafts the email for you', 'Edit or use as-is'] },
  { emoji: '👥', title: 'Add Your Contacts', desc: 'Pick a contact group or paste a list of emails', bullets: ['Click "Add Contacts"', 'Choose a saved group OR paste emails', 'Preview recipient count', 'Confirm the list'] },
  { emoji: '🚀', title: 'Review & Launch', desc: 'Check preview, hit Send — your campaign is live', bullets: ['Click "Preview" to see the final email', 'Check your subject line', 'Hit "Send Now" or schedule it', 'Confirm launch'] },
  { emoji: '📊', title: 'Track Your Results', desc: 'Watch opens, clicks, and replies roll in', bullets: ['Go to Campaign → Results', 'See open rate, click rate, replies', 'Export CSV if needed', 'Adjust your next campaign'] },
];

function buildHtml() {
  const dark = '#1A1A2E';
  const orange = '#FF6B35';
  const indigo = '#4F46E5';
  const gray = '#B0B0C3';
  const white = '#FFFFFF';

  const pageStyle = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${dark}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${white}; }
    .page { width: 794px; min-height: 1123px; padding: 60px 56px; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .page:last-child { page-break-after: auto; }
    @page { size: A4; margin: 0; }
  `;

  // Page 1 — Cover
  const coverPage = `
    <div class="page" style="background:${dark}; text-align:center;">
      <div style="font-size:72px; font-weight:900; color:${orange}; letter-spacing:-2px; margin-bottom:16px;">BrandMonkz</div>
      <div style="font-size:36px; font-weight:600; color:${white}; margin-bottom:24px;">Email Campaign Tutorial</div>
      <div style="width:80px; height:4px; background:${orange}; border-radius:2px; margin:0 auto 32px;"></div>
      <div style="font-size:18px; color:${gray}; margin-bottom:12px;">A step-by-step guide to launching your first campaign</div>
      <div style="font-size:16px; color:${gray}; margin-bottom:48px;">2026 Edition</div>
      <div style="font-size:22px; color:${white}; font-style:italic;">"Smart Email Marketing for Growing Businesses"</div>
    </div>
  `;

  // Pages 2-9 — One per step
  const stepPages = steps.map((s, i) => {
    const bulletsHtml = s.bullets.map(b => `
      <li style="padding:6px 0; font-size:16px; color:${white}; list-style:none; padding-left:0; display:flex; align-items:center; gap:10px;">
        <span style="width:8px; height:8px; border-radius:50%; background:${orange}; flex-shrink:0; display:inline-block;"></span>
        ${b}
      </li>
    `).join('');

    return `
      <div class="page" style="background:${dark};">
        <div style="position:relative; width:100%; max-width:620px; text-align:center;">
          <div style="display:inline-block; background:${orange}; color:${white}; font-size:14px; font-weight:600; padding:6px 16px; border-radius:20px; margin-bottom:32px; letter-spacing:1px;">
            STEP ${i + 1} OF 8
          </div>
          <div style="font-size:120px; line-height:1; margin-bottom:28px;">${s.emoji}</div>
          <div style="font-size:42px; font-weight:800; color:${white}; margin-bottom:16px;">${s.title}</div>
          <div style="font-size:18px; color:${gray}; margin-bottom:36px; line-height:1.5;">${s.desc}</div>
          <ul style="text-align:left; margin:0 auto 40px; max-width:500px; padding:0;">
            ${bulletsHtml}
          </ul>
          <div style="width:100%; max-width:500px; margin:0 auto; height:200px; border:2px dashed ${orange}; border-radius:12px; display:flex; align-items:center; justify-content:center; color:${gray}; font-size:15px; font-style:italic;">
            [ Screenshot goes here ]
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Page 10 — Pricing + Email preview
  const pricingPage = `
    <div class="page" style="background:${dark}; align-items:flex-start; justify-content:flex-start;">
      <div style="font-size:32px; font-weight:800; color:${white}; margin-bottom:32px; text-align:center; width:100%;">Transparent Pricing + Email Preview</div>
      <div style="display:flex; gap:24px; width:100%; margin-bottom:36px;">
        <!-- Contract -->
        <div style="flex:1; background:rgba(255,107,53,0.08); border-top:4px solid ${orange}; border-radius:12px; padding:28px 24px;">
          <div style="font-size:16px; font-weight:700; color:${orange}; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px;">Contract Placements</div>
          <div style="font-size:48px; font-weight:900; color:${orange}; margin-bottom:8px;">$2/hr</div>
          <div style="font-size:13px; color:${gray}; margin-bottom:16px;">flat fee on top of candidate rate</div>
          <ul style="padding:0; list-style:none;">
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; No percentage markups</li>
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; Scales with your team</li>
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; Transparent monthly billing</li>
          </ul>
        </div>
        <!-- Full-time -->
        <div style="flex:1; background:rgba(79,70,229,0.1); border-top:4px solid ${indigo}; border-radius:12px; padding:28px 24px;">
          <div style="font-size:16px; font-weight:700; color:${indigo}; text-transform:uppercase; letter-spacing:1px; margin-bottom:16px;">Full-Time Placements</div>
          <div style="font-size:48px; font-weight:900; color:${indigo}; margin-bottom:8px;">15%</div>
          <div style="font-size:13px; color:${gray}; margin-bottom:16px;">of first-year salary (industry avg 20–25%)</div>
          <ul style="padding:0; list-style:none;">
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; One-time fee only</li>
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; 90-day replacement guarantee</li>
            <li style="font-size:14px; color:${white}; padding:4px 0;">&#10003; No hidden fees</li>
          </ul>
        </div>
      </div>
      <!-- Email preview snippet -->
      <div style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:24px;">
        <div style="font-size:14px; color:${orange}; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; font-weight:600;">Email Template Preview</div>
        <div style="font-size:13px; color:${gray}; margin-bottom:6px;"><strong style="color:${white};">Subject:</strong> We Place the Right Talent. You Pay Only When It Works.</div>
        <div style="font-size:13px; color:${gray}; margin-bottom:14px;"><strong style="color:${white};">From:</strong> Rajesh Kumar at TechCloudPro &lt;rajesh@techcloudpro.com&gt;</div>
        <div style="font-size:14px; color:${white}; line-height:1.6; border-left:3px solid ${orange}; padding-left:14px;">
          Hi [First Name],<br><br>
          Finding the right tech talent shouldn't cost you a fortune — or your sanity. Most staffing firms charge 15–20% markup on contractor rates and 20–25% on full-time salaries. We do it differently.
        </div>
      </div>
      <div style="margin-top:32px; text-align:center; width:100%;">
        <div style="font-size:13px; color:${gray};">TechCloudPro | BrandMonkz | 18,000+ pre-screened tech candidates</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>${pageStyle}</style>
</head>
<body>
${coverPage}
${stepPages}
${pricingPage}
</body>
</html>`;
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  const html = buildHtml();
  console.log('Setting content...');
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, 'campaign-guide.pdf');
  console.log('Generating PDF...');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  console.log('Done! PDF saved to: ' + outputPath);
}

run().catch(err => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
