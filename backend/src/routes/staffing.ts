import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIMessageConfig } from '../config/ai';

const router = Router();
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: AI_CONFIG.apiKey });

router.use(authenticate);

// ─── Staffing Company Seed Data ─────────────────────────────────────────────
const STAFFING_COMPANIES = [
  {
    name: 'Deloitte',
    industry: 'Consulting & Professional Services',
    website: 'https://www.deloitte.com',
    description: 'Global professional services firm offering audit, consulting, tax, and advisory services.',
    contacts: [
      { firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah.mitchell@deloitte.com', role: 'Head of Technology Recruitment', phone: '+1-212-555-0101' },
      { firstName: 'James', lastName: 'Chen', email: 'james.chen@deloitte.com', role: 'Senior Talent Acquisition Manager', phone: '+1-212-555-0102' },
      { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@deloitte.com', role: 'VP of Human Resources', phone: '+1-212-555-0103' },
    ],
    positions: ['AI/ML Engineer', 'Cloud Architect (AWS/Azure/GCP)', 'Cybersecurity Consultant', 'Full-Stack Developer (React/Node)', 'Data Engineer (Spark/Databricks)', 'DevOps Engineer (K8s/Terraform)', 'SAP S/4HANA Consultant', 'Salesforce Developer', 'ServiceNow Architect', 'Power Platform Developer'],
  },
  {
    name: 'Accenture',
    industry: 'IT Services & Consulting',
    website: 'https://www.accenture.com',
    description: 'Global professional services company specializing in IT services, consulting, and operations.',
    contacts: [
      { firstName: 'Michael', lastName: 'Rodriguez', email: 'michael.rodriguez@accenture.com', role: 'Director of Technology Staffing', phone: '+1-312-555-0201' },
      { firstName: 'Emily', lastName: 'Watson', email: 'emily.watson@accenture.com', role: 'Recruitment Lead - Cloud & Infrastructure', phone: '+1-312-555-0202' },
      { firstName: 'David', lastName: 'Kim', email: 'david.kim@accenture.com', role: 'VP Talent Acquisition', phone: '+1-312-555-0203' },
    ],
    positions: ['GenAI Solutions Architect', 'Azure Cloud Engineer', 'React Native Developer', 'Kubernetes Platform Engineer', 'Data Science Lead', 'Blockchain Developer', 'RPA Developer (UiPath)', 'Pega Architect', 'Workday Consultant', 'Snowflake Data Engineer'],
  },
  {
    name: 'TCS (Tata Consultancy Services)',
    industry: 'IT Services & Consulting',
    website: 'https://www.tcs.com',
    description: 'Largest Indian multinational IT services and consulting company.',
    contacts: [
      { firstName: 'Rajesh', lastName: 'Patel', email: 'rajesh.patel@tcs.com', role: 'Head of Lateral Hiring', phone: '+1-201-555-0301' },
      { firstName: 'Anita', lastName: 'Desai', email: 'anita.desai@tcs.com', role: 'Senior Recruitment Manager', phone: '+1-201-555-0302' },
    ],
    positions: ['Java Microservices Developer', 'Angular/React Frontend Developer', 'AWS Solutions Architect', 'Python ML Engineer', 'ServiceNow Developer', 'Salesforce Admin', 'Oracle EBS Consultant', 'Mainframe Modernization Developer', 'IoT Platform Engineer', 'QA Automation (Selenium/Cypress)'],
  },
  {
    name: 'Infosys',
    industry: 'IT Services & Consulting',
    website: 'https://www.infosys.com',
    description: 'Global leader in next-generation digital services and consulting.',
    contacts: [
      { firstName: 'Vikram', lastName: 'Reddy', email: 'vikram.reddy@infosys.com', role: 'Director of Talent Acquisition', phone: '+1-469-555-0401' },
      { firstName: 'Lisa', lastName: 'Thompson', email: 'lisa.thompson@infosys.com', role: 'US Recruitment Head', phone: '+1-469-555-0402' },
    ],
    positions: ['Spring Boot Developer', 'Google Cloud Platform Engineer', 'Power BI / Tableau Analyst', 'Cyber Threat Analyst', 'SAP ABAP Developer', 'Full-Stack Python/Django Developer', 'Terraform/Ansible DevOps', 'NLP/LLM Engineer', 'Edge Computing Architect', 'MuleSoft Integration Developer'],
  },
  {
    name: 'Cognizant',
    industry: 'IT Services & Consulting',
    website: 'https://www.cognizant.com',
    description: 'American multinational IT services and consulting company.',
    contacts: [
      { firstName: 'Jennifer', lastName: 'Adams', email: 'jennifer.adams@cognizant.com', role: 'VP Global Recruitment', phone: '+1-201-555-0501' },
      { firstName: 'Suresh', lastName: 'Kumar', email: 'suresh.kumar@cognizant.com', role: 'Technology Hiring Lead', phone: '+1-201-555-0502' },
    ],
    positions: ['Generative AI Developer', 'AWS Lambda/Serverless Engineer', 'React.js Frontend Architect', '.NET Core Backend Developer', 'Databricks Data Engineer', 'Splunk/SIEM Analyst', 'Agile Coach / Scrum Master', 'Appian Low-Code Developer', 'GraphQL API Developer', 'Unity/Unreal XR Developer'],
  },
  {
    name: 'Wipro',
    industry: 'IT Services & Consulting',
    website: 'https://www.wipro.com',
    description: 'Leading global IT, consulting and business process services company.',
    contacts: [
      { firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.mehta@wipro.com', role: 'Head of Recruitment Americas', phone: '+1-408-555-0601' },
      { firstName: 'Nicole', lastName: 'Brown', email: 'nicole.brown@wipro.com', role: 'Senior Technical Recruiter', phone: '+1-408-555-0602' },
    ],
    positions: ['Java Full-Stack Developer', 'Azure DevOps Engineer', 'Salesforce Commerce Cloud Developer', 'Hadoop/Spark Data Engineer', 'Penetration Tester', 'iOS/Android Mobile Developer', 'Microservices Architect', 'RPA Lead (Automation Anywhere)', 'Digital Twin Engineer', 'MLOps Engineer'],
  },
  {
    name: 'HCLTech',
    industry: 'IT Services & Consulting',
    website: 'https://www.hcltech.com',
    description: 'Global technology company helping enterprises reimagine their businesses for the digital age.',
    contacts: [
      { firstName: 'Deepa', lastName: 'Nair', email: 'deepa.nair@hcltech.com', role: 'Recruitment Director', phone: '+1-571-555-0701' },
    ],
    positions: ['Golang Backend Developer', 'VMware Cloud Architect', 'Rust Systems Developer', 'DomainDrivenDesign Consultant', 'Neo4j Graph Database Engineer', 'GitOps/ArgoCD Platform Engineer', 'SAST/DAST Security Engineer', 'Kafka Streaming Engineer', 'Digital Commerce (Hybris) Developer', 'Embedded C++ IoT Developer'],
  },
  {
    name: 'Capgemini',
    industry: 'IT Services & Consulting',
    website: 'https://www.capgemini.com',
    description: 'French multinational IT services and consulting company.',
    contacts: [
      { firstName: 'Marie', lastName: 'Dubois', email: 'marie.dubois@capgemini.com', role: 'VP Talent Management', phone: '+1-312-555-0801' },
      { firstName: 'Robert', lastName: 'Singh', email: 'robert.singh@capgemini.com', role: 'Head of Technology Hiring', phone: '+1-312-555-0802' },
    ],
    positions: ['AI Ethics & Governance Specialist', 'Multi-Cloud Architect', 'Vue.js/Nuxt Frontend Developer', 'Scala/Akka Developer', 'Snowflake/dbt Analytics Engineer', 'Zero Trust Security Architect', 'Product Owner (Enterprise)', 'Low-Code/No-Code Platform Lead', 'Computer Vision Engineer', 'Quantum Computing Researcher'],
  },
  {
    name: 'IBM',
    industry: 'Technology & Cloud',
    website: 'https://www.ibm.com',
    description: 'American multinational technology corporation producing computer hardware, middleware, and software.',
    contacts: [
      { firstName: 'Thomas', lastName: 'Williams', email: 'thomas.williams@ibm.com', role: 'Director of Technical Recruiting', phone: '+1-914-555-0901' },
      { firstName: 'Keiko', lastName: 'Tanaka', email: 'keiko.tanaka@ibm.com', role: 'Global Talent Strategy Lead', phone: '+1-914-555-0902' },
    ],
    positions: ['Watson AI Platform Engineer', 'Red Hat OpenShift Specialist', 'Hybrid Cloud Architect', 'Quantum Developer (Qiskit)', 'Z/OS Mainframe Developer', 'Kubernetes/Istio Platform Engineer', 'Security Orchestration (SOAR) Developer', 'Node-RED IoT Developer', 'Carbon Design System Developer', 'Enterprise Blockchain Architect'],
  },
  {
    name: 'EY (Ernst & Young)',
    industry: 'Consulting & Professional Services',
    website: 'https://www.ey.com',
    description: 'Multinational professional services partnership providing assurance, tax, consulting and advisory.',
    contacts: [
      { firstName: 'Rachel', lastName: 'Green', email: 'rachel.green@ey.com', role: 'Technology Talent Acquisition Director', phone: '+1-212-555-1001' },
      { firstName: 'Ahmed', lastName: 'Hassan', email: 'ahmed.hassan@ey.com', role: 'Senior Recruitment Manager', phone: '+1-212-555-1002' },
    ],
    positions: ['AI Transformation Consultant', 'Cloud Migration Architect', 'Cyber Forensics Analyst', 'Data Privacy Engineer (GDPR/CCPA)', 'RPA Solutions Developer', 'ERP Migration Specialist (Oracle/SAP)', 'Power Automate Developer', 'Risk Analytics Engineer', 'Digital Twin Architect', 'Sustainable Tech Consultant'],
  },
  {
    name: 'PwC (PricewaterhouseCoopers)',
    industry: 'Consulting & Professional Services',
    website: 'https://www.pwc.com',
    description: 'International professional services brand of firms operating as partnerships under the PwC brand.',
    contacts: [
      { firstName: 'Laura', lastName: 'Martinez', email: 'laura.martinez@pwc.com', role: 'Head of Technology Recruitment', phone: '+1-646-555-1101' },
    ],
    positions: ['Responsible AI Developer', 'Cloud FinOps Architect', 'Threat Intelligence Analyst', 'Alteryx/DataRobot ML Engineer', 'Workday HCM Consultant', 'ServiceNow ITSM Architect', 'Palantir Foundry Developer', 'ESG Data Engineer', 'Audit Automation Developer', 'AR/VR Experience Developer'],
  },
  {
    name: 'KPMG',
    industry: 'Consulting & Professional Services',
    website: 'https://www.kpmg.com',
    description: 'Global network of professional firms providing Audit, Tax and Advisory services.',
    contacts: [
      { firstName: 'Daniel', lastName: 'O\'Brien', email: 'daniel.obrien@kpmg.com', role: 'Technology Talent Lead', phone: '+1-212-555-1201' },
    ],
    positions: ['AI/ML Strategy Consultant', 'GCP Data Engineer', 'Cybersecurity Risk Assessor', 'SAS/Python Data Scientist', 'SAP S/4HANA Migration Lead', 'Power Platform Architect', 'RegTech Developer', 'Data Governance Specialist', 'Cloud Cost Optimization Engineer', 'Smart Contract Auditor'],
  },
  {
    name: 'McKinsey & Company',
    industry: 'Management Consulting',
    website: 'https://www.mckinsey.com',
    description: 'Worldwide management consulting firm serving the largest businesses, governments, and institutions.',
    contacts: [
      { firstName: 'Sophie', lastName: 'Anderson', email: 'sophie.anderson@mckinsey.com', role: 'Partner - People Analytics', phone: '+1-212-555-1301' },
    ],
    positions: ['Advanced Analytics Engineer', 'GenAI Strategy Consultant', 'Cloud Infrastructure Architect', 'Digital McKinsey Developer', 'Quantum Algorithm Developer', 'Product Analytics Lead', 'Platform Engineering Lead', 'AI Safety Researcher', 'FinTech Platform Architect', 'Healthcare AI Specialist'],
  },
  {
    name: 'Tech Mahindra',
    industry: 'IT Services & Consulting',
    website: 'https://www.techmahindra.com',
    description: 'Indian multinational technology company providing IT services and business process outsourcing.',
    contacts: [
      { firstName: 'Kavita', lastName: 'Joshi', email: 'kavita.joshi@techmahindra.com', role: 'Recruitment Head Americas', phone: '+1-408-555-1401' },
    ],
    positions: ['5G Network Engineer', 'Telecom OSS/BSS Developer', 'Angular Enterprise Developer', 'AWS Glue/Redshift Data Engineer', 'Selenium/Appium Test Lead', 'Pega PRPC Developer', 'Network Security Engineer', 'MEAN Stack Developer', 'Amdocs Billing Specialist', 'SRE/Reliability Engineer'],
  },
  {
    name: 'Google',
    industry: 'Big Tech',
    website: 'https://www.google.com',
    description: 'Multinational technology company specializing in Internet-related services and products.',
    contacts: [
      { firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@google.com', role: 'Staff Technical Recruiter', phone: '+1-650-555-1501' },
      { firstName: 'Yuki', lastName: 'Sato', email: 'yuki.sato@google.com', role: 'Engineering Recruiting Lead', phone: '+1-650-555-1502' },
    ],
    positions: ['Staff SWE (Golang/C++)', 'TPM - AI Infrastructure', 'SRE Lead (GKE/Spanner)', 'Applied ML Scientist', 'Android Platform Engineer', 'Gemini API Developer Relations', 'Privacy Engineering Lead', 'Chip Design (TPU) Engineer', 'Waymo Autonomy Engineer', 'Chrome Browser Engineer'],
  },
  {
    name: 'Microsoft',
    industry: 'Big Tech',
    website: 'https://www.microsoft.com',
    description: 'American multinational technology corporation producing computer software, consumer electronics, and services.',
    contacts: [
      { firstName: 'Chris', lastName: 'Johnson', email: 'chris.johnson@microsoft.com', role: 'Principal Talent Advisor', phone: '+1-425-555-1601' },
    ],
    positions: ['Azure OpenAI Engineer', 'Copilot Platform Developer', '.NET 8 Backend Architect', 'Power Platform MVP Developer', 'Dynamics 365 F&O Consultant', 'Xbox Cloud Gaming Engineer', 'Security Response Center Analyst', 'Teams SDK Developer', 'Azure Kubernetes Service Engineer', 'Fabric Data Analytics Engineer'],
  },
  {
    name: 'Amazon / AWS',
    industry: 'Big Tech / Cloud',
    website: 'https://www.amazon.com',
    description: 'American multinational technology company focusing on e-commerce, cloud computing, AI, and streaming.',
    contacts: [
      { firstName: 'Patricia', lastName: 'Lee', email: 'patricia.lee@amazon.com', role: 'Senior Technical Recruiting Manager', phone: '+1-206-555-1701' },
    ],
    positions: ['AWS Solutions Architect', 'Bedrock/SageMaker ML Engineer', 'EKS Platform Engineer', 'DynamoDB/Aurora Data Architect', 'Robotics Software Engineer', 'Supply Chain ML Scientist', 'AWS CDK/CloudFormation Developer', 'Alexa Skills Developer', 'Ring IoT Security Engineer', 'Prime Video Streaming Engineer'],
  },
  {
    name: 'Meta',
    industry: 'Big Tech / Social',
    website: 'https://www.meta.com',
    description: 'American multinational technology conglomerate owning Facebook, Instagram, WhatsApp, and Reality Labs.',
    contacts: [
      { firstName: 'Jordan', lastName: 'Taylor', email: 'jordan.taylor@meta.com', role: 'Engineering Recruiting Lead', phone: '+1-650-555-1801' },
    ],
    positions: ['Llama LLM Researcher', 'Reality Labs XR Developer', 'Instagram Feed ML Engineer', 'PyTorch Framework Developer', 'WhatsApp E2E Security Engineer', 'Ads Ranking Engineer', 'React Core Contributor', 'Hardware Firmware Engineer (Quest)', 'Content Integrity ML Engineer', 'Spatial Computing Architect'],
  },
];

// ─── Technology Streams (for campaign targeting) ────────────────────────────
const TECHNOLOGY_STREAMS = [
  { name: 'Artificial Intelligence & Machine Learning', shortCode: 'AI_ML', roles: ['AI/ML Engineer', 'Data Scientist', 'ML Platform Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'GenAI Developer', 'AI Ethics Specialist', 'MLOps Engineer'] },
  { name: 'Cloud & Infrastructure', shortCode: 'CLOUD', roles: ['AWS Solutions Architect', 'Azure Cloud Engineer', 'GCP Platform Engineer', 'Multi-Cloud Architect', 'Cloud Security Engineer', 'FinOps Analyst', 'Cloud Migration Specialist', 'Kubernetes/OpenShift Admin'] },
  { name: 'Cybersecurity', shortCode: 'SECURITY', roles: ['Penetration Tester', 'SOC Analyst', 'Threat Intelligence Analyst', 'Security Architect', 'DevSecOps Engineer', 'GRC Consultant', 'SIEM Engineer', 'Red Team Lead'] },
  { name: 'Full-Stack Development', shortCode: 'FULLSTACK', roles: ['React/Next.js Developer', 'Angular Frontend Dev', 'Node.js Backend Dev', 'Python/Django Developer', '.NET Full-Stack Dev', 'Java Spring Boot Dev', 'Vue.js/Nuxt Developer', 'GraphQL API Developer'] },
  { name: 'Data Engineering & Analytics', shortCode: 'DATA', roles: ['Spark/Databricks Engineer', 'Snowflake Data Engineer', 'Kafka Streaming Engineer', 'dbt Analytics Engineer', 'Power BI Developer', 'Tableau Analyst', 'Airflow/Dagster Engineer', 'Data Governance Lead'] },
  { name: 'DevOps & Platform Engineering', shortCode: 'DEVOPS', roles: ['Terraform/Pulumi Developer', 'CI/CD Pipeline Engineer', 'GitOps (ArgoCD/Flux) Lead', 'SRE / Reliability Engineer', 'Docker/Containerd Specialist', 'Ansible/Chef Automation', 'Platform Team Lead', 'Observability Engineer (Datadog/Grafana)'] },
  { name: 'Enterprise Applications', shortCode: 'ENTERPRISE', roles: ['SAP S/4HANA Consultant', 'Salesforce Developer', 'ServiceNow Architect', 'Workday HCM Consultant', 'Oracle ERP Specialist', 'Dynamics 365 Developer', 'Pega Architect', 'MuleSoft Integration Dev'] },
  { name: 'Mobile & Frontend', shortCode: 'MOBILE', roles: ['iOS (Swift/SwiftUI) Developer', 'Android (Kotlin) Developer', 'React Native Developer', 'Flutter Developer', 'Progressive Web App Dev', 'UI/UX Engineer', 'Design System Developer', 'Accessibility Specialist'] },
  { name: 'Blockchain & Web3', shortCode: 'WEB3', roles: ['Solidity Smart Contract Dev', 'Rust (Solana) Developer', 'DeFi Protocol Engineer', 'NFT Platform Developer', 'Smart Contract Auditor', 'Web3 Backend Engineer', 'Crypto Wallet Developer', 'DAO Tooling Developer'] },
  { name: 'Emerging Technologies', shortCode: 'EMERGING', roles: ['Quantum Computing Researcher', 'AR/VR Experience Developer', 'Digital Twin Engineer', 'Edge Computing Architect', 'Robotics Software Engineer', '5G Network Engineer', 'Spatial Computing Developer', 'Brain-Computer Interface Researcher'] },
];

// ─── Staffing Email Templates ───────────────────────────────────────────────
const STAFFING_EMAIL_TEMPLATES = [
  {
    name: 'Technology Talent Partnership Proposal',
    subject: 'Accelerate Your {{companyName}} Tech Hiring — Pre-Vetted Engineers Ready Now',
    htmlContent: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Technology Talent Partnership</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">BrandMonkz Staffing Solutions</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">I noticed {{companyName}} is scaling its technology teams and wanted to share how we can help accelerate your hiring pipeline.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;"><strong>What sets us apart:</strong></p>
    <ul style="color: #333; font-size: 15px; line-height: 1.8;">
      <li><strong>48-hour candidate delivery</strong> — pre-vetted engineers matched to your tech stack</li>
      <li><strong>AI-powered matching</strong> — our algorithm scores candidates against your role requirements</li>
      <li><strong>Specialization</strong> — AI/ML, Cloud, Cybersecurity, Full-Stack, DevOps, Data Engineering</li>
      <li><strong>Risk-free trial</strong> — 30-day replacement guarantee on every placement</li>
    </ul>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">We currently have <strong>200+ pre-screened engineers</strong> ready for immediate engagement across all major technology streams.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Schedule a 15-Min Discovery Call</a>
    </div>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">Looking forward to partnering with {{companyName}}.</p>
    <p style="color: #333; font-size: 15px;">Best regards,<br/><strong>BrandMonkz Staffing Team</strong></p>
  </div>
</div>`,
  },
  {
    name: 'AI/ML Talent Pipeline',
    subject: '{{companyName}}: Your AI/ML Talent Pipeline Is Ready — 50+ Pre-Vetted Candidates',
    htmlContent: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">AI/ML Talent Ready to Deploy</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Specialists in GenAI, LLMs, Computer Vision & MLOps</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">The AI talent war is intensifying. Companies like {{companyName}} need specialized ML engineers NOW — not in 3 months.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;"><strong>Our AI/ML talent pool includes:</strong></p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr style="background: #f8f9fa;">
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; font-weight: 600; color: #333;">GenAI / LLM Engineers</td>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; text-align: center; color: #667eea; font-weight: 700;">45+ available</td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; font-weight: 600; color: #333;">Computer Vision Specialists</td>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; text-align: center; color: #667eea; font-weight: 700;">30+ available</td>
      </tr>
      <tr style="background: #f8f9fa;">
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; font-weight: 600; color: #333;">MLOps / ML Platform Engineers</td>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; text-align: center; color: #667eea; font-weight: 700;">25+ available</td>
      </tr>
      <tr>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; font-weight: 600; color: #333;">NLP / Conversational AI</td>
        <td style="padding: 10px 15px; border: 1px solid #e9ecef; text-align: center; color: #667eea; font-weight: 700;">20+ available</td>
      </tr>
    </table>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">All candidates have been <strong>technically assessed</strong> and can start within <strong>2 weeks</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">View AI/ML Candidate Profiles</a>
    </div>
    <p style="color: #333; font-size: 15px;">Best,<br/><strong>BrandMonkz AI Staffing Division</strong></p>
  </div>
</div>`,
  },
  {
    name: 'Cloud & DevOps Talent Outreach',
    subject: 'Scale {{companyName}}\'s Cloud Team — Certified AWS/Azure/GCP Engineers Available',
    htmlContent: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Cloud & DevOps Talent</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Certified engineers for AWS, Azure, GCP & Multi-Cloud</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Cloud infrastructure is the backbone of every enterprise. Finding certified cloud engineers shouldn't take months.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;"><strong>Ready-to-deploy cloud talent:</strong></p>
    <ul style="color: #333; font-size: 15px; line-height: 1.8;">
      <li>AWS Solutions Architects (SAA-C03 / SAP-C02 certified)</li>
      <li>Azure Cloud Engineers (AZ-305 / AZ-400 certified)</li>
      <li>GCP Professional Cloud Architects</li>
      <li>Kubernetes / OpenShift Platform Engineers</li>
      <li>Terraform / Pulumi Infrastructure-as-Code Experts</li>
      <li>SRE / Observability Engineers (Datadog, Grafana, Prometheus)</li>
    </ul>
    <div style="background: #f0f7ff; border-left: 4px solid #4facfe; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0;">
      <p style="color: #333; margin: 0; font-size: 14px;"><strong>Client Success:</strong> We helped a Fortune 500 scale their cloud team from 12 to 45 engineers in 8 weeks with a 95% retention rate.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Get Cloud Talent Profiles</a>
    </div>
    <p style="color: #333; font-size: 15px;">Best,<br/><strong>BrandMonkz Cloud Staffing</strong></p>
  </div>
</div>`,
  },
  {
    name: 'Cybersecurity Talent Urgency',
    subject: '{{companyName}} — Close Your Cybersecurity Gap Before Year-End',
    htmlContent: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.2);">Cybersecurity Talent — Act Now</h1>
    <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0; font-size: 14px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">3.5M unfilled cyber positions globally. We have your candidates.</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">With the average cost of a data breach now at <strong>$4.45M</strong>, enterprises like {{companyName}} can't afford cybersecurity talent gaps.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;"><strong>Our security talent bench:</strong></p>
    <ul style="color: #333; font-size: 15px; line-height: 1.8;">
      <li>Penetration Testers (OSCP, GPEN certified)</li>
      <li>SOC Analysts & Threat Hunters (GCIH, GCIA)</li>
      <li>Security Architects (CISSP, CCSP)</li>
      <li>DevSecOps Engineers</li>
      <li>GRC & Compliance Specialists</li>
      <li>Incident Response / Digital Forensics</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; text-shadow: 0 1px 2px rgba(0,0,0,0.15);">Request Security Talent Profiles</a>
    </div>
    <p style="color: #333; font-size: 15px;">Best,<br/><strong>BrandMonkz Cybersecurity Staffing</strong></p>
  </div>
</div>`,
  },
  {
    name: 'Full-Stack Developer Pipeline',
    subject: 'Top Full-Stack Engineers for {{companyName}} — React, Node, Python, .NET',
    htmlContent: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); padding: 40px 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Full-Stack Engineers On Demand</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">React, Angular, Vue, Node.js, Python, .NET, Java</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi {{firstName}},</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Every enterprise project at {{companyName}} depends on strong full-stack engineers. We have them — screened, tested, and ready.</p>
    <p style="color: #333; font-size: 15px; line-height: 1.6;"><strong>Our developer bench by stack:</strong></p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0;">
      <span style="background: #667eea; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">React/Next.js</span>
      <span style="background: #f5576c; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Angular</span>
      <span style="background: #4facfe; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Vue/Nuxt</span>
      <span style="background: #43e97b; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Node.js</span>
      <span style="background: #fa709a; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Python/Django</span>
      <span style="background: #764ba2; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">.NET Core</span>
      <span style="background: #f093fb; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Java Spring</span>
      <span style="background: #fee140; color: #333; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Go/Rust</span>
    </div>
    <p style="color: #333; font-size: 15px; line-height: 1.6;">Every candidate passes our <strong>3-stage technical assessment</strong> (coding challenge + system design + culture fit).</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">Browse Developer Profiles</a>
    </div>
    <p style="color: #333; font-size: 15px;">Best,<br/><strong>BrandMonkz Developer Staffing</strong></p>
  </div>
</div>`,
  },
];

// ─── POST /api/staffing/seed-companies — Seed enterprise companies ──────────
router.post('/seed-companies', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const results: { company: string; created: boolean; contacts: number }[] = [];

    for (const companyData of STAFFING_COMPANIES) {
      // Check if company already exists for this user
      let company = await prisma.company.findFirst({
        where: { name: companyData.name, userId },
      });

      let created = false;
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: companyData.name,
            industry: companyData.industry,
            website: companyData.website,
            description: companyData.description,
            userId,
          },
        });
        created = true;
      }

      // Create contacts for this company
      let contactsCreated = 0;
      for (const contactData of companyData.contacts) {
        const existing = await prisma.contact.findFirst({
          where: { email: contactData.email, userId },
        });
        if (!existing) {
          await prisma.contact.create({
            data: {
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              email: contactData.email,
              role: contactData.role,
              phone: contactData.phone,
              companyId: company.id,
              userId,
              isActive: true,
            },
          });
          contactsCreated++;
        }
      }

      results.push({
        company: companyData.name,
        created,
        contacts: contactsCreated,
      });
    }

    return res.json({
      message: `Seeded ${results.filter(r => r.created).length} new companies with contacts`,
      results,
      totalCompanies: STAFFING_COMPANIES.length,
    });
  } catch (error) {
    return next(error);
  }
});

// ─── GET /api/staffing/technology-streams — List all tech streams ───────────
router.get('/technology-streams', async (_req, res) => {
  return res.json({ streams: TECHNOLOGY_STREAMS });
});

// ─── GET /api/staffing/templates — Get staffing email templates ─────────────
router.get('/templates', async (_req, res) => {
  return res.json({ templates: STAFFING_EMAIL_TEMPLATES });
});

// ─── GET /api/staffing/companies — Get seeded companies with positions ──────
router.get('/companies', async (_req, res) => {
  const companiesWithPositions = STAFFING_COMPANIES.map(c => ({
    name: c.name,
    industry: c.industry,
    website: c.website,
    contactCount: c.contacts.length,
    positions: c.positions,
  }));
  return res.json({ companies: companiesWithPositions });
});

// ─── POST /api/staffing/ai/research-company — AI agent: research a company ──
router.post('/ai/research-company', async (req, res, next) => {
  try {
    const { companyName } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const companyData = STAFFING_COMPANIES.find(
      c => c.name.toLowerCase().includes(companyName.toLowerCase())
    );

    const prompt = `You are a staffing industry research agent for BrandMonkz, a technology staffing company. Research the company "${companyName}" and provide actionable intelligence for a staffing sales pitch.

${companyData ? `Known data: Industry: ${companyData.industry}, Current open tech positions include: ${companyData.positions.join(', ')}` : ''}

Provide your research in this JSON format:
{
  "company": "${companyName}",
  "overview": "2-3 sentence company overview focused on their tech needs",
  "hiringTrends": ["trend 1", "trend 2", "trend 3"],
  "techStack": ["technology 1", "technology 2", "technology 3"],
  "painPoints": ["pain point 1", "pain point 2"],
  "recommendedApproach": "Best staffing pitch angle for this company",
  "urgentRoles": ["role 1", "role 2", "role 3"],
  "competitorStaffingFirms": ["competitor 1", "competitor 2"]
}

Return ONLY valid JSON.`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('campaign'),
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/staffing/ai/generate-pitch — AI agent: generate staffing pitch ─
router.post('/ai/generate-pitch', async (req, res, next) => {
  try {
    const { companyName, technologyStream, positions, tone = 'professional' } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const streamData = technologyStream
      ? TECHNOLOGY_STREAMS.find(s => s.shortCode === technologyStream || s.name.toLowerCase().includes(technologyStream.toLowerCase()))
      : null;

    const prompt = `You are an expert staffing sales pitch writer for BrandMonkz, a premium technology staffing firm. Write a compelling email pitch for ${companyName}.

Target Company: ${companyName}
Technology Stream: ${streamData ? streamData.name : technologyStream || 'General Technology'}
Specific Positions: ${positions?.join(', ') || 'Various technology roles'}
Tone: ${tone}
Available Roles in this stream: ${streamData ? streamData.roles.join(', ') : 'AI/ML, Cloud, Full-Stack, DevOps, Security, Data Engineering'}

Generate a professional HTML email that:
1. Opens with a relevant hook about their specific industry/tech challenges
2. Presents BrandMonkz as the solution with specific talent availability numbers
3. Lists 3-5 specific roles we can fill immediately
4. Includes a compelling CTA
5. Is personalized with {{firstName}} and {{companyName}} template variables

Return ONLY valid JSON:
{
  "subject": "Email subject line with {{companyName}}",
  "htmlContent": "<div>...full professional HTML email...</div>",
  "campaignName": "Short campaign name",
  "previewText": "First line preview text"
}

Use single quotes for HTML attributes. Make the email mobile-responsive with inline CSS.`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('content'),
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/staffing/ai/match-positions — AI agent: match positions to company ─
router.post('/ai/match-positions', async (req, res, next) => {
  try {
    const { companyName, industry } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const prompt = `You are a technology staffing position matcher for BrandMonkz. Given the company "${companyName}" in the "${industry || 'Technology'}" industry, recommend the most relevant technology positions they are likely hiring for RIGHT NOW (Q1 2026).

Consider current industry trends, the company's known tech stack, and market demand.

Return ONLY valid JSON:
{
  "company": "${companyName}",
  "recommendedStreams": [
    {
      "stream": "Stream Name",
      "positions": ["Position 1", "Position 2", "Position 3"],
      "urgency": "high|medium|low",
      "reasoning": "Why this stream matters for this company"
    }
  ],
  "topPriority": ["Top 5 most likely positions they need immediately"],
  "marketInsight": "One-liner about the talent market for this company's needs"
}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('campaign'),
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/staffing/ai/video-script — AI agent: generate video campaign script ─
router.post('/ai/video-script', async (req, res, next) => {
  try {
    const { companyName, technologyStream, duration = 60 } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const prompt = `You are a video marketing scriptwriter for BrandMonkz, a premium technology staffing firm. Write a ${duration}-second video script targeting ${companyName}.

Technology Focus: ${technologyStream || 'General Technology Staffing'}
Duration: ${duration} seconds
Style: Professional, confident, data-driven

Structure the script as:
1. Hook (first 5 seconds) - grab attention with a pain point
2. Problem (10 seconds) - highlight the hiring challenge
3. Solution (20 seconds) - present BrandMonkz staffing
4. Proof (15 seconds) - stats and social proof
5. CTA (10 seconds) - clear next step

Return ONLY valid JSON:
{
  "title": "Video title",
  "script": "Full narration script with [VISUAL: description] cues",
  "scenes": [
    {"time": "0:00-0:05", "narration": "...", "visual": "..."},
    {"time": "0:05-0:15", "narration": "...", "visual": "..."}
  ],
  "duration": ${duration},
  "tone": "Professional & Confident",
  "callToAction": "Clear CTA text"
}`;

    const message = await anthropic.messages.create({
      ...getAIMessageConfig('content'),
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '');
      }
      const result = JSON.parse(jsonText);
      return res.json(result);
    }

    return res.status(500).json({ error: 'Unexpected response format' });
  } catch (error) {
    return next(error);
  }
});

// ─── POST /api/campaigns/:id/mock-send — Mock send (no real email) ──────────
// This is on the campaigns router but we export a helper
export const mockSendHandler = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        companies: {
          include: {
            company: {
              include: {
                contacts: {
                  where: { isActive: true },
                  select: { id: true, email: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Collect all unique contacts
    const contactMap = new Map<string, any>();
    for (const cc of campaign.companies) {
      for (const contact of cc.company.contacts) {
        if (contact.email && !contactMap.has(contact.email)) {
          contactMap.set(contact.email, { ...contact, companyName: cc.company.name });
        }
      }
    }

    const contacts = Array.from(contactMap.values());

    // Create email logs as QUEUED (not actually sent)
    for (const contact of contacts) {
      try {
        await prisma.emailLog.create({
          data: {
            toEmail: contact.email,
            fromEmail: 'campaigns@brandmonkz.com',
            status: 'QUEUED',
            campaignId: campaign.id,
            contactId: contact.id,
          } as any,
        });
      } catch {
        // Non-blocking
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        totalSent: contacts.length,
      },
    });

    return res.json({
      success: true,
      sent: contacts.length,
      total: contacts.length,
      failed: 0,
      mode: 'queued',
      message: `Campaign queued for ${contacts.length} contacts. Emails will be sent when SES production access is approved.`,
      recipients: contacts.map(c => ({
        email: c.email,
        name: `${c.firstName} ${c.lastName}`,
        company: c.companyName,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// ─── POST /api/staffing/promote-super-admin — One-time: make rajesh@techcloudpro.com SUPER_ADMIN ─
router.post('/promote-super-admin', async (req, res, next) => {
  try {
    const targetEmail = 'rajesh@techcloudpro.com';

    const user = await prisma.user.findFirst({
      where: { email: targetEmail },
    });

    if (!user) {
      return res.status(404).json({ error: `User ${targetEmail} not found` });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.json({ message: `${targetEmail} is already SUPER_ADMIN`, user: { id: user.id, email: user.email, role: user.role } });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return res.json({
      message: `${targetEmail} promoted to SUPER_ADMIN`,
      user: updated,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
