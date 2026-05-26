/**
 * Send CTO Onboarding Email to Ethan Varela
 *
 * This script sends a comprehensive onboarding email to the new CTO
 * with all credentials, documentation links, and to-do lists.
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration (using Gmail SMTP from .env.production)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'jeetnair.in@gmail.com',
    pass: 'amvtukbjjdlvaluf' // Gmail App Password
  }
});

// Generate HTML email content
function generateEmailHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to BrandMonkz - CTO Onboarding</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #0066cc;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 10px 0 0 0;
      font-size: 16px;
    }
    .credentials-box {
      background-color: #f8f9fa;
      border-left: 4px solid #28a745;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .credentials-box h3 {
      margin-top: 0;
      color: #28a745;
    }
    .credentials-box code {
      background-color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      display: inline-block;
      margin: 5px 0;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      border: 1px solid #ddd;
    }
    .info-box {
      background-color: #e7f3ff;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #0066cc;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .checklist {
      list-style: none;
      padding: 0;
    }
    .checklist li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    .checklist li:before {
      content: '☐';
      position: absolute;
      left: 0;
      font-size: 18px;
      color: #0066cc;
    }
    .priority-high {
      background-color: #fff0f0;
      border-left: 3px solid #dc3545;
      padding: 10px;
      margin: 10px 0;
    }
    .priority-medium {
      background-color: #fff8f0;
      border-left: 3px solid #fd7e14;
      padding: 10px;
      margin: 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table th {
      background-color: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
    }
    table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    table tr:hover {
      background-color: #f8f9fa;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 10px 10px 0;
      font-weight: bold;
    }
    .button:hover {
      background-color: #0052a3;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      color: #666;
      font-size: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .kpi-card {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #0066cc;
    }
    .kpi-card h4 {
      margin: 0 0 5px 0;
      color: #0066cc;
    }
    .kpi-card p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎉 Welcome to BrandMonkz, Ethan!</h1>
      <p>Chief Technology Officer - Onboarding Package</p>
    </div>

    <!-- Introduction -->
    <div class="section">
      <p>Dear <strong>Ethan Varela</strong>,</p>
      <p>Welcome to BrandMonkz as our new <strong>Chief Technology Officer</strong>! We're excited to have you leading our technical strategy and engineering operations.</p>
      <p>This email contains everything you need to get started, including your login credentials, responsibilities, and a comprehensive onboarding plan.</p>
    </div>

    <!-- Login Credentials -->
    <div class="credentials-box">
      <h3>🔐 Your CRM Login Credentials</h3>
      <p><strong>CRM URL:</strong><br>
      <a href="http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com" target="_blank">
        http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
      </a></p>

      <p><strong>Email:</strong> <code>ethan@brandmonkz.com</code></p>
      <p><strong>Password:</strong> <code>CTOPassword123</code></p>
      <p><strong>Role:</strong> ADMIN (Full Access)</p>

      <div class="warning-box">
        <strong>⚠️ IMPORTANT SECURITY:</strong>
        <ul>
          <li>Change this password immediately after first login</li>
          <li>Use a strong password (16+ characters, mixed case, numbers, symbols)</li>
          <li>Store credentials in a password manager (1Password, LastPass)</li>
          <li>Enable 2FA on your Google Workspace account</li>
          <li>Never share credentials via email or Slack</li>
        </ul>
      </div>
    </div>

    <!-- Action Required Today -->
    <div class="section">
      <h2>🚨 Action Required - TODAY (Next 2 Hours)</h2>
      <div class="priority-high">
        <h4>Critical - Do Immediately:</h4>
        <ul class="checklist">
          <li>Log in to CRM with credentials above</li>
          <li>Change password to secure password (16+ chars)</li>
          <li>Store new password in password manager</li>
          <li>Test email access at ethan@brandmonkz.com</li>
          <li>Reply to this email to confirm receipt</li>
        </ul>
      </div>

      <div class="priority-medium">
        <h4>Important - Complete Today:</h4>
        <ul class="checklist">
          <li>Explore all CRM modules (Companies, Contacts, Deals, Tasks)</li>
          <li>Test AI enrichment feature on sample company</li>
          <li>Review system architecture overview</li>
          <li>Read incident management procedures (below)</li>
          <li>Schedule 1:1 meeting with CEO (jeet@brandmonkz.com)</li>
        </ul>
      </div>
    </div>

    <!-- Your Profile -->
    <div class="section">
      <h2>👤 Your Profile</h2>
      <table>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
        <tr>
          <td><strong>Full Name</strong></td>
          <td>Ethan Varela</td>
        </tr>
        <tr>
          <td><strong>Title</strong></td>
          <td>Chief Technology Officer (CTO)</td>
        </tr>
        <tr>
          <td><strong>Employee ID</strong></td>
          <td>EMP-CTO-001</td>
        </tr>
        <tr>
          <td><strong>Email</strong></td>
          <td>ethan@brandmonkz.com (✅ Real - can send/receive)</td>
        </tr>
        <tr>
          <td><strong>Phone</strong></td>
          <td>+1-555-0100</td>
        </tr>
        <tr>
          <td><strong>Department</strong></td>
          <td>Engineering & Technology</td>
        </tr>
        <tr>
          <td><strong>Reports To</strong></td>
          <td>CEO (jeet@brandmonkz.com)</td>
        </tr>
        <tr>
          <td><strong>Timezone</strong></td>
          <td>America/New_York (EST)</td>
        </tr>
        <tr>
          <td><strong>User ID</strong></td>
          <td>cmgo1an330000hj34auamels4</td>
        </tr>
      </table>
    </div>

    <!-- Your Responsibilities -->
    <div class="section">
      <h2>🎯 Your Responsibilities as CTO</h2>

      <h3>1. Technical Leadership (40% of time)</h3>
      <ul>
        <li>Define and maintain technical architecture</li>
        <li>Lead engineering team (when hired)</li>
        <li>Make strategic technology decisions</li>
        <li>Establish coding standards and best practices</li>
        <li>Mentor and grow engineering talent</li>
      </ul>

      <h3>2. System Operations & Reliability (25% of time)</h3>
      <ul>
        <li><strong>Ensure 99.9% uptime SLA</strong> for production systems</li>
        <li>Monitor system performance, latency, and error rates</li>
        <li>Manage incident response (see below)</li>
        <li>Oversee backup, disaster recovery, business continuity</li>
        <li>Optimize infrastructure costs and performance</li>
      </ul>

      <h3>3. Security & Compliance (20% of time)</h3>
      <ul>
        <li><strong>Maintain SOC 2 Type II compliance</strong></li>
        <li>Implement security best practices (OWASP Top 10)</li>
        <li>Manage vulnerability scanning and penetration testing</li>
        <li>Ensure data encryption (at rest and in transit)</li>
        <li>Conduct quarterly security audits</li>
      </ul>

      <h3>4. Product Development (10% of time)</h3>
      <ul>
        <li>Collaborate with product team on feature roadmap</li>
        <li>Prioritize technical debt vs new features</li>
        <li>Review and approve major implementations</li>
        <li>Ensure code quality through PR reviews</li>
      </ul>

      <h3>5. Strategic Planning (5% of time)</h3>
      <ul>
        <li>Define quarterly OKRs for engineering</li>
        <li>Plan infrastructure scaling for growth</li>
        <li>Evaluate and adopt new technologies</li>
        <li>Prepare technical budget and resource planning</li>
      </ul>
    </div>

    <!-- Key Performance Indicators -->
    <div class="section">
      <h2>📊 Your Key Performance Indicators (KPIs)</h2>

      <div class="kpi-grid">
        <div class="kpi-card">
          <h4>Uptime</h4>
          <p>≥ 99.9% monthly uptime</p>
        </div>
        <div class="kpi-card">
          <h4>API Performance</h4>
          <p>p95 latency &lt; 500ms</p>
        </div>
        <div class="kpi-card">
          <h4>Error Rate</h4>
          <p>&lt; 0.1% error rate</p>
        </div>
        <div class="kpi-card">
          <h4>Security</h4>
          <p>Zero data breaches</p>
        </div>
        <div class="kpi-card">
          <h4>Incident Response</h4>
          <p>MTTR &lt; 30 minutes</p>
        </div>
        <div class="kpi-card">
          <h4>Code Quality</h4>
          <p>80%+ test coverage</p>
        </div>
        <div class="kpi-card">
          <h4>Feature Delivery</h4>
          <p>90% on-time delivery</p>
        </div>
        <div class="kpi-card">
          <h4>Team Health</h4>
          <p>≥ 4.0/5.0 satisfaction</p>
        </div>
      </div>
    </div>

    <!-- Incident Management -->
    <div class="section">
      <h2>🚨 CRITICAL: Incident Management & CEO Escalation</h2>

      <div class="info-box">
        <strong>When Things Go Wrong - You MUST Escalate to CEO</strong>
        <p>As CTO, you are responsible for system reliability and must escalate incidents appropriately.</p>
      </div>

      <h3>P0 - CRITICAL (Call CEO Immediately)</h3>
      <div style="background-color: #fee; padding: 15px; border-left: 5px solid #dc3545; margin: 10px 0;">
        <strong>Examples:</strong>
        <ul>
          <li>Production system down > 15 minutes</li>
          <li>Data breach or unauthorized data access</li>
          <li>Security vulnerability actively exploited</li>
          <li>Complete database failure or data loss</li>
          <li>Legal/regulatory compliance violation</li>
        </ul>
        <strong>Action:</strong>
        <ul>
          <li>📞 <strong>Call CEO immediately</strong> (day or night)</li>
          <li>📧 Send email to jeet@brandmonkz.com</li>
          <li>💬 Slack @jeet with @channel alert</li>
          <li>🎯 Response time: 5 minutes</li>
          <li>🎯 Resolution target: 1-2 hours</li>
        </ul>
        <strong>Case ID Format:</strong> INC-20251012-P0-001
      </div>

      <h3>P1 - HIGH (Notify CEO within 1 hour)</h3>
      <div style="background-color: #fff3cd; padding: 15px; border-left: 5px solid #ffc107; margin: 10px 0;">
        <strong>Examples:</strong>
        <ul>
          <li>Major feature completely broken</li>
          <li>Performance degraded > 50%</li>
          <li>Authentication/login system issues</li>
          <li>Payment processing failures</li>
        </ul>
        <strong>Action:</strong>
        <ul>
          <li>📧 Email CEO within 1 hour</li>
          <li>💬 Slack update</li>
          <li>🎯 Resolution target: 4-8 hours</li>
        </ul>
      </div>

      <h3>P2 - MEDIUM (Notify CEO within 4 hours)</h3>
      <div style="background-color: #e7f3ff; padding: 15px; border-left: 5px solid #0066cc; margin: 10px 0;">
        <strong>Examples:</strong>
        <ul>
          <li>Minor feature broken (&lt;10% users affected)</li>
          <li>Performance issues (10-30% degradation)</li>
          <li>Non-critical API errors</li>
        </ul>
        <strong>Action:</strong>
        <ul>
          <li>📧 Email CEO within 4 hours</li>
          <li>🎯 Resolution target: 24-48 hours</li>
        </ul>
      </div>

      <h3>P3 - LOW (Weekly summary)</h3>
      <ul>
        <li>UI cosmetic bugs</li>
        <li>Documentation errors</li>
        <li>Non-urgent technical debt</li>
      </ul>
    </div>

    <!-- 30-Day Onboarding Plan -->
    <div class="section">
      <h2>📅 Your 30-Day Onboarding Plan</h2>

      <h3>Week 1: Setup & System Familiarization</h3>
      <ul class="checklist">
        <li>Complete first login and password change</li>
        <li>Explore all CRM modules hands-on</li>
        <li>Test AI enrichment feature</li>
        <li>Review backend codebase (Node.js, Express, Prisma)</li>
        <li>Review frontend codebase (React, TypeScript, Vite)</li>
        <li>Understand database schema (PostgreSQL)</li>
        <li>Meet with CEO for alignment on priorities</li>
        <li>Set up local development environment</li>
      </ul>

      <h3>Week 2: Technical Audit</h3>
      <ul class="checklist">
        <li>Audit AWS infrastructure and costs</li>
        <li>Review security posture and vulnerabilities</li>
        <li>Test incident response procedures</li>
        <li>Review backup and disaster recovery plans</li>
        <li>Assess technical debt backlog</li>
        <li>Review SOC 2 compliance status</li>
        <li>Identify top 5 technical risks</li>
      </ul>

      <h3>Week 3: Process Setup</h3>
      <ul class="checklist">
        <li>Establish monitoring and alerting (CloudWatch)</li>
        <li>Create incident response playbooks</li>
        <li>Set up weekly CEO sync meetings</li>
        <li>Document critical system architecture</li>
        <li>Create Q4 engineering roadmap</li>
        <li>Set up code review process</li>
        <li>Establish CI/CD pipeline improvements</li>
      </ul>

      <h3>Week 4: Strategic Planning</h3>
      <ul class="checklist">
        <li>Present 30-day assessment to CEO</li>
        <li>Define Q4 OKRs for engineering</li>
        <li>Create hiring plan for engineering team</li>
        <li>Establish monthly KPI reporting</li>
        <li>Document all SOPs and procedures</li>
        <li>Create 6-month technology roadmap</li>
        <li>Begin first round of optimizations</li>
      </ul>
    </div>

    <!-- Technology Stack -->
    <div class="section">
      <h2>🛠️ Technology Stack You're Responsible For</h2>

      <h3>Backend</h3>
      <ul>
        <li><strong>Runtime:</strong> Node.js v24</li>
        <li><strong>Framework:</strong> Express.js with TypeScript</li>
        <li><strong>Database ORM:</strong> Prisma</li>
        <li><strong>Database:</strong> PostgreSQL (AWS RDS)</li>
        <li><strong>Authentication:</strong> JWT + Google OAuth</li>
        <li><strong>AI Integration:</strong> Anthropic Claude API</li>
        <li><strong>Web Scraping:</strong> Cheerio, Readability, JSDOM</li>
        <li><strong>Email:</strong> Nodemailer (Gmail SMTP, AWS SES ready)</li>
      </ul>

      <h3>Frontend</h3>
      <ul>
        <li><strong>Framework:</strong> React 18 with TypeScript</li>
        <li><strong>Build Tool:</strong> Vite</li>
        <li><strong>Styling:</strong> Tailwind CSS</li>
        <li><strong>State Management:</strong> React Context</li>
        <li><strong>HTTP Client:</strong> Axios</li>
      </ul>

      <h3>Infrastructure (AWS)</h3>
      <ul>
        <li><strong>Backend Hosting:</strong> EC2 (sandbox-brandmonkz-backend.com)</li>
        <li><strong>Frontend Hosting:</strong> S3 + CloudFront</li>
        <li><strong>Database:</strong> RDS PostgreSQL</li>
        <li><strong>Process Manager:</strong> PM2</li>
        <li><strong>DNS:</strong> GoDaddy (API configured)</li>
        <li><strong>SSL:</strong> AWS Certificate Manager</li>
      </ul>

      <h3>Code Repository</h3>
      <ul>
        <li><strong>GitHub:</strong> <a href="https://github.com/jeet-avatar/production-crm">github.com/jeet-avatar/production-crm</a></li>
        <li><strong>Structure:</strong> Monorepo (backend/ and frontend/ folders)</li>
        <li><strong>Files:</strong> 284 files (~79,000 lines of code)</li>
      </ul>
    </div>

    <!-- Communication Protocols -->
    <div class="section">
      <h2>📞 Communication with CEO</h2>

      <h3>Daily Communication</h3>
      <ul>
        <li>Slack summary if any P1+ incidents occur</li>
        <li>Brief status update on any ongoing issues</li>
      </ul>

      <h3>Weekly Communication (Every Friday)</h3>
      <ul>
        <li>Email with engineering metrics + highlights</li>
        <li>System health report (uptime, performance, errors)</li>
        <li>Progress on quarterly OKRs</li>
        <li>Any blockers or concerns</li>
      </ul>

      <h3>Monthly Communication</h3>
      <ul>
        <li>1-hour meeting to review KPIs and roadmap</li>
        <li>Infrastructure cost review</li>
        <li>Security and compliance status</li>
        <li>Team hiring and growth plans</li>
      </ul>

      <h3>Quarterly Communication</h3>
      <ul>
        <li>Formal presentation on OKR results</li>
        <li>Technology strategy for next quarter</li>
        <li>Budget planning and resource needs</li>
      </ul>
    </div>

    <!-- Important Links -->
    <div class="section">
      <h2>🔗 Important Links & Resources</h2>

      <h3>Access These Now:</h3>
      <ul>
        <li><strong>CRM Login:</strong> <a href="http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com">Sandbox CRM</a></li>
        <li><strong>GitHub Repo:</strong> <a href="https://github.com/jeet-avatar/production-crm">Production CRM Repository</a></li>
        <li><strong>Documentation:</strong> All docs are in the backend folder of the repository</li>
      </ul>

      <h3>AWS Access (To Be Set Up):</h3>
      <ul>
        <li>AWS Console (Administrator access) - Credentials to be provided</li>
        <li>AWS EC2 (Backend server management)</li>
        <li>AWS RDS (Database management)</li>
        <li>AWS S3 (Frontend hosting)</li>
        <li>AWS CloudWatch (Monitoring and logs)</li>
      </ul>

      <h3>Tools You'll Need:</h3>
      <ul>
        <li><strong>Password Manager:</strong> 1Password or LastPass (required)</li>
        <li><strong>IDE:</strong> VS Code (recommended, configured in repo)</li>
        <li><strong>Git:</strong> For code management</li>
        <li><strong>Node.js v24:</strong> For local development</li>
        <li><strong>PostgreSQL Client:</strong> For database management</li>
        <li><strong>Postman/Insomnia:</strong> For API testing</li>
      </ul>
    </div>

    <!-- Security Best Practices -->
    <div class="section">
      <h2>🔒 Security Best Practices - CRITICAL</h2>

      <div class="warning-box">
        <h3>DO:</h3>
        <ul>
          <li>✅ Change password immediately on first login</li>
          <li>✅ Use password manager for all credentials</li>
          <li>✅ Enable MFA on all systems</li>
          <li>✅ Review access logs weekly</li>
          <li>✅ Follow principle of least privilege</li>
          <li>✅ Encrypt all sensitive data</li>
          <li>✅ Keep systems patched and updated</li>
        </ul>

        <h3>DON'T:</h3>
        <ul>
          <li>❌ Share credentials via email or Slack</li>
          <li>❌ Reuse passwords across systems</li>
          <li>❌ Store passwords in plain text</li>
          <li>❌ Skip security updates</li>
          <li>❌ Ignore security alerts</li>
          <li>❌ Mix sandbox and production credentials</li>
          <li>❌ Commit API keys or secrets to git</li>
        </ul>
      </div>
    </div>

    <!-- Next Steps -->
    <div class="section">
      <h2>✅ Your Immediate Next Steps</h2>

      <div class="priority-high">
        <h3>RIGHT NOW (Next 30 minutes):</h3>
        <ol>
          <li>Click the login link above</li>
          <li>Login with: ethan@brandmonkz.com / CTOPassword123</li>
          <li>Change password immediately</li>
          <li>Store new password in password manager</li>
          <li>Reply to this email confirming you've logged in</li>
        </ol>
      </div>

      <div class="priority-medium">
        <h3>TODAY (Next 8 hours):</h3>
        <ol>
          <li>Explore all CRM modules thoroughly</li>
          <li>Test AI enrichment on sample companies</li>
          <li>Review incident management procedures (above)</li>
          <li>Schedule 1:1 with CEO</li>
          <li>Set up your local development environment</li>
        </ol>
      </div>

      <div class="info-box">
        <h3>THIS WEEK:</h3>
        <ol>
          <li>Complete Week 1 onboarding checklist (above)</li>
          <li>Review entire codebase</li>
          <li>Understand AWS infrastructure</li>
          <li>Identify immediate technical risks</li>
          <li>Document your observations</li>
        </ol>
      </div>
    </div>

    <!-- Support -->
    <div class="section">
      <h2>🆘 Questions or Need Help?</h2>

      <table>
        <tr>
          <th>Contact</th>
          <th>Email</th>
          <th>Use For</th>
        </tr>
        <tr>
          <td><strong>CEO (Jeet)</strong></td>
          <td>jeet@brandmonkz.com</td>
          <td>Strategy, priorities, escalations, all questions</td>
        </tr>
        <tr>
          <td><strong>Your Email</strong></td>
          <td>ethan@brandmonkz.com</td>
          <td>Your professional email for all communication</td>
        </tr>
        <tr>
          <td><strong>AWS Support</strong></td>
          <td>1-877-641-7867</td>
          <td>AWS infrastructure emergencies (24/7)</td>
        </tr>
      </table>

      <p><strong>Don't hesitate to reach out with any questions!</strong> The CEO is available to support your onboarding.</p>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin: 40px 0;">
      <a href="http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com" class="button">
        🚀 Log In to CRM Now
      </a>
      <a href="https://github.com/jeet-avatar/production-crm" class="button" style="background-color: #333;">
        💻 View Code Repository
      </a>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Welcome to the team, Ethan!</strong></p>
      <p>We're excited to have you as our CTO and look forward to building amazing technology together.</p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <p style="font-size: 12px; color: #999;">
        This email was sent to ethan@brandmonkz.com<br>
        BrandMonkz CRM • Engineering & Technology Department<br>
        Date: October 12, 2025
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Send the email
async function sendOnboardingEmail() {
  try {
    console.log('📧 Preparing CTO Onboarding Email...');
    console.log('');
    console.log('To: ethan@brandmonkz.com');
    console.log('Subject: Welcome to BrandMonkz - Your CTO Onboarding Package');
    console.log('');

    const mailOptions = {
      from: '"BrandMonkz CRM" <jeetnair.in@gmail.com>',
      to: 'ethan@brandmonkz.com',
      subject: '🎉 Welcome to BrandMonkz - Your CTO Onboarding Package',
      html: generateEmailHTML(),
      // Plain text fallback
      text: `
Welcome to BrandMonkz, Ethan Varela!

You've been appointed as Chief Technology Officer (CTO).

CRM LOGIN CREDENTIALS:
URL: http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com
Email: ethan@brandmonkz.com
Password: CTOPassword123

IMPORTANT: Change this password immediately after first login!

YOUR RESPONSIBILITIES:
1. Technical Leadership (40%)
2. System Operations & Reliability (25%) - Ensure 99.9% uptime
3. Security & Compliance (20%) - Maintain SOC 2 compliance
4. Product Development (10%)
5. Strategic Planning (5%)

INCIDENT ESCALATION:
P0 (Critical) - Call CEO immediately: Production down, data breach, security exploit
P1 (High) - Notify CEO within 1 hour: Major features broken, auth issues
P2 (Medium) - Notify CEO within 4 hours: Minor bugs, performance issues
P3 (Low) - Weekly summary: UI bugs, documentation

IMMEDIATE ACTIONS (TODAY):
1. Log in to CRM
2. Change password
3. Reply to confirm receipt
4. Explore CRM modules
5. Schedule CEO meeting

CEO Contact: jeet@brandmonkz.com

For full details, please view the HTML version of this email.

Welcome to the team!
- BrandMonkz Leadership
      `
    };

    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ EMAIL SENT SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('  Message ID:', info.messageId);
    console.log('  To:', 'ethan@brandmonkz.com');
    console.log('  Subject: Welcome to BrandMonkz - Your CTO Onboarding Package');
    console.log('');
    console.log('  Email includes:');
    console.log('  ✅ Login credentials');
    console.log('  ✅ Complete responsibilities');
    console.log('  ✅ Incident escalation procedures');
    console.log('  ✅ 30-day onboarding plan');
    console.log('  ✅ Technology stack overview');
    console.log('  ✅ KPIs and success metrics');
    console.log('  ✅ Communication protocols');
    console.log('  ✅ Security best practices');
    console.log('  ✅ All important links');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📬 Ethan should receive the email momentarily!');
    console.log('');

  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check Gmail SMTP credentials in .env.production');
    console.error('2. Verify Gmail App Password is still valid');
    console.error('3. Check if ethan@brandmonkz.com exists in Google Workspace');
    console.error('4. Try sending a test email manually');
    console.error('');
    process.exit(1);
  }
}

// Run the script
console.log('');
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  CTO ONBOARDING EMAIL SENDER                         ║');
console.log('║  Sending comprehensive onboarding to Ethan Varela    ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');

sendOnboardingEmail();
