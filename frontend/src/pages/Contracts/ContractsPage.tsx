import { useState } from 'react';
import { DocumentTextIcon, PencilIcon, PaperAirplaneIcon, ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ─── CONTRACT TYPES ─────────────────────────────────────────────────────────
const CONTRACT_TYPES = [
  { id: 'fulltime', name: 'Full-Time Staffing', desc: '15% of annual salary — permanent placement', icon: '👥', color: '#6366F1' },
  { id: 'contract', name: 'Contract Staffing (Hourly)', desc: '$2/hr markup — US contract basis', icon: '⏱️', color: '#3B82F6' },
  { id: 'project', name: 'Project / AI Consulting', desc: 'Fixed-price or T&M engagements', icon: '🚀', color: '#8B5CF6' },
];

// ─── RATE CARDS ─────────────────────────────────────────────────────────────
interface RateRow { role: string; juniorRate: string; midRate: string; seniorRate: string; leadRate: string; }

const RATE_CARDS: Record<string, { category: string; rates: RateRow[] }[]> = {
  fulltime: [
    { category: 'AI / Machine Learning', rates: [
      { role: 'AI/ML Engineer', juniorRate: '$90K', midRate: '$130K', seniorRate: '$170K', leadRate: '$210K' },
      { role: 'Data Scientist', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'NLP Engineer', juniorRate: '$95K', midRate: '$135K', seniorRate: '$175K', leadRate: '$215K' },
      { role: 'MLOps Engineer', juniorRate: '$90K', midRate: '$130K', seniorRate: '$170K', leadRate: '$205K' },
      { role: 'Computer Vision Engineer', juniorRate: '$95K', midRate: '$140K', seniorRate: '$180K', leadRate: '$220K' },
    ]},
    { category: 'Cloud & DevOps', rates: [
      { role: 'AWS Solutions Architect', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'Azure Cloud Engineer', juniorRate: '$80K', midRate: '$120K', seniorRate: '$160K', leadRate: '$195K' },
      { role: 'GCP Platform Engineer', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'Kubernetes Engineer', juniorRate: '$90K', midRate: '$130K', seniorRate: '$170K', leadRate: '$205K' },
      { role: 'DevOps/SRE Engineer', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'Terraform/IaC Specialist', juniorRate: '$80K', midRate: '$120K', seniorRate: '$160K', leadRate: '$195K' },
    ]},
    { category: 'Cybersecurity', rates: [
      { role: 'Security Architect', juniorRate: '$95K', midRate: '$140K', seniorRate: '$185K', leadRate: '$230K' },
      { role: 'Penetration Tester', juniorRate: '$85K', midRate: '$125K', seniorRate: '$170K', leadRate: '$210K' },
      { role: 'SOC Analyst', juniorRate: '$65K', midRate: '$90K', seniorRate: '$125K', leadRate: '$160K' },
      { role: 'DevSecOps Engineer', juniorRate: '$90K', midRate: '$130K', seniorRate: '$175K', leadRate: '$215K' },
      { role: 'GRC Specialist', juniorRate: '$75K', midRate: '$110K', seniorRate: '$150K', leadRate: '$190K' },
    ]},
    { category: 'Full-Stack Development', rates: [
      { role: 'React/Next.js Developer', juniorRate: '$75K', midRate: '$110K', seniorRate: '$150K', leadRate: '$185K' },
      { role: 'Node.js Backend Developer', juniorRate: '$75K', midRate: '$110K', seniorRate: '$150K', leadRate: '$185K' },
      { role: 'Python/Django Developer', juniorRate: '$75K', midRate: '$115K', seniorRate: '$155K', leadRate: '$190K' },
      { role: '.NET Full-Stack Developer', juniorRate: '$70K', midRate: '$105K', seniorRate: '$145K', leadRate: '$180K' },
      { role: 'Java Spring Boot Developer', juniorRate: '$75K', midRate: '$115K', seniorRate: '$155K', leadRate: '$190K' },
      { role: 'Go/Rust Developer', juniorRate: '$85K', midRate: '$130K', seniorRate: '$170K', leadRate: '$210K' },
    ]},
    { category: 'NetSuite / ERP', rates: [
      { role: 'NetSuite Administrator', juniorRate: '$70K', midRate: '$100K', seniorRate: '$135K', leadRate: '$170K' },
      { role: 'NetSuite Developer (SuiteScript)', juniorRate: '$80K', midRate: '$115K', seniorRate: '$150K', leadRate: '$185K' },
      { role: 'NetSuite Functional Consultant', juniorRate: '$75K', midRate: '$110K', seniorRate: '$145K', leadRate: '$180K' },
      { role: 'SAP S/4HANA Consultant', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'Salesforce Developer', juniorRate: '$75K', midRate: '$115K', seniorRate: '$155K', leadRate: '$190K' },
      { role: 'ServiceNow Architect', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
    ]},
    { category: 'Data Engineering', rates: [
      { role: 'Spark/Databricks Engineer', juniorRate: '$85K', midRate: '$125K', seniorRate: '$165K', leadRate: '$200K' },
      { role: 'Snowflake Data Engineer', juniorRate: '$80K', midRate: '$120K', seniorRate: '$160K', leadRate: '$195K' },
      { role: 'Power BI / Tableau Analyst', juniorRate: '$65K', midRate: '$95K', seniorRate: '$130K', leadRate: '$165K' },
      { role: 'Airflow/dbt Engineer', juniorRate: '$80K', midRate: '$115K', seniorRate: '$155K', leadRate: '$190K' },
    ]},
  ],
  contract: [
    { category: 'AI / Machine Learning', rates: [
      { role: 'AI/ML Engineer', juniorRate: '$55/hr', midRate: '$75/hr', seniorRate: '$100/hr', leadRate: '$130/hr' },
      { role: 'Data Scientist', juniorRate: '$50/hr', midRate: '$70/hr', seniorRate: '$95/hr', leadRate: '$125/hr' },
      { role: 'GenAI/LLM Specialist', juniorRate: '$60/hr', midRate: '$85/hr', seniorRate: '$115/hr', leadRate: '$145/hr' },
      { role: 'MLOps Engineer', juniorRate: '$55/hr', midRate: '$75/hr', seniorRate: '$100/hr', leadRate: '$125/hr' },
    ]},
    { category: 'Cloud & DevOps', rates: [
      { role: 'AWS Solutions Architect', juniorRate: '$50/hr', midRate: '$70/hr', seniorRate: '$95/hr', leadRate: '$120/hr' },
      { role: 'Kubernetes Engineer', juniorRate: '$55/hr', midRate: '$75/hr', seniorRate: '$100/hr', leadRate: '$125/hr' },
      { role: 'DevOps/SRE Engineer', juniorRate: '$50/hr', midRate: '$70/hr', seniorRate: '$95/hr', leadRate: '$120/hr' },
      { role: 'Terraform Specialist', juniorRate: '$45/hr', midRate: '$65/hr', seniorRate: '$90/hr', leadRate: '$115/hr' },
    ]},
    { category: 'Cybersecurity', rates: [
      { role: 'Penetration Tester', juniorRate: '$55/hr', midRate: '$80/hr', seniorRate: '$110/hr', leadRate: '$140/hr' },
      { role: 'SOC Analyst', juniorRate: '$35/hr', midRate: '$50/hr', seniorRate: '$70/hr', leadRate: '$90/hr' },
      { role: 'Security Architect', juniorRate: '$60/hr', midRate: '$85/hr', seniorRate: '$115/hr', leadRate: '$145/hr' },
    ]},
    { category: 'Full-Stack Development', rates: [
      { role: 'React Developer', juniorRate: '$40/hr', midRate: '$60/hr', seniorRate: '$85/hr', leadRate: '$110/hr' },
      { role: 'Node.js Developer', juniorRate: '$40/hr', midRate: '$60/hr', seniorRate: '$85/hr', leadRate: '$110/hr' },
      { role: 'Python Developer', juniorRate: '$40/hr', midRate: '$65/hr', seniorRate: '$90/hr', leadRate: '$115/hr' },
      { role: 'Java Developer', juniorRate: '$40/hr', midRate: '$60/hr', seniorRate: '$85/hr', leadRate: '$110/hr' },
    ]},
    { category: 'NetSuite / ERP', rates: [
      { role: 'NetSuite Developer', juniorRate: '$45/hr', midRate: '$65/hr', seniorRate: '$90/hr', leadRate: '$115/hr' },
      { role: 'NetSuite Admin', juniorRate: '$35/hr', midRate: '$55/hr', seniorRate: '$75/hr', leadRate: '$100/hr' },
      { role: 'SAP Consultant', juniorRate: '$50/hr', midRate: '$75/hr', seniorRate: '$100/hr', leadRate: '$130/hr' },
      { role: 'Salesforce Developer', juniorRate: '$45/hr', midRate: '$65/hr', seniorRate: '$90/hr', leadRate: '$115/hr' },
    ]},
  ],
  project: [
    { category: 'AI Consulting & Implementation', rates: [
      { role: 'AI Strategy Workshop (2 weeks)', juniorRate: '$15K', midRate: '$25K', seniorRate: '$40K', leadRate: '$60K' },
      { role: 'LLM/GenAI Integration (4-8 weeks)', juniorRate: '$40K', midRate: '$75K', seniorRate: '$120K', leadRate: '$180K' },
      { role: 'ML Pipeline Build (6-12 weeks)', juniorRate: '$50K', midRate: '$90K', seniorRate: '$150K', leadRate: '$225K' },
      { role: 'AI POC / Prototype (2-4 weeks)', juniorRate: '$20K', midRate: '$35K', seniorRate: '$55K', leadRate: '$80K' },
      { role: 'Computer Vision System (8-16 weeks)', juniorRate: '$60K', midRate: '$100K', seniorRate: '$160K', leadRate: '$250K' },
    ]},
    { category: 'Cloud Migration', rates: [
      { role: 'Cloud Assessment & Roadmap', juniorRate: '$10K', midRate: '$20K', seniorRate: '$35K', leadRate: '$50K' },
      { role: 'AWS/Azure Migration (8-16 weeks)', juniorRate: '$50K', midRate: '$100K', seniorRate: '$175K', leadRate: '$275K' },
      { role: 'Kubernetes Setup & Migration', juniorRate: '$30K', midRate: '$60K', seniorRate: '$100K', leadRate: '$150K' },
      { role: 'DevOps Pipeline Setup', juniorRate: '$15K', midRate: '$30K', seniorRate: '$50K', leadRate: '$75K' },
    ]},
    { category: 'Cybersecurity Audit', rates: [
      { role: 'Security Assessment (2-4 weeks)', juniorRate: '$15K', midRate: '$30K', seniorRate: '$50K', leadRate: '$75K' },
      { role: 'Penetration Testing', juniorRate: '$10K', midRate: '$20K', seniorRate: '$35K', leadRate: '$55K' },
      { role: 'SOC Setup & Monitoring', juniorRate: '$40K', midRate: '$75K', seniorRate: '$125K', leadRate: '$200K' },
      { role: 'Compliance (SOC2/HIPAA/GDPR)', juniorRate: '$25K', midRate: '$45K', seniorRate: '$75K', leadRate: '$120K' },
    ]},
    { category: 'Digital Transformation', rates: [
      { role: 'ERP Implementation (SAP/NetSuite)', juniorRate: '$75K', midRate: '$150K', seniorRate: '$250K', leadRate: '$400K' },
      { role: 'Salesforce Implementation', juniorRate: '$30K', midRate: '$60K', seniorRate: '$100K', leadRate: '$175K' },
      { role: 'Legacy Modernization', juniorRate: '$50K', midRate: '$100K', seniorRate: '$175K', leadRate: '$300K' },
    ]},
  ],
};

// ─── CONTRACT TEMPLATES ─────────────────────────────────────────────────────
const CONTRACT_TEMPLATES: Record<string, string> = {
  fulltime: `STAFFING SERVICES AGREEMENT — FULL-TIME PLACEMENT

This Staffing Services Agreement ("Agreement") is entered into as of {{date}} between:

CLIENT: {{clientCompany}} ("Client")
STAFFING PROVIDER: TechCloudPro Inc. ("Provider")

1. SERVICES
Provider agrees to source, screen, and present qualified technology candidates for full-time employment with Client.

2. PLACEMENT FEE
Client agrees to pay Provider a placement fee equal to 15% of the placed candidate's first-year annual base salary.
• Fee is due within 30 days of candidate's start date
• Fee applies to base salary only (excludes bonuses, equity, benefits)

3. GUARANTEE PERIOD
Provider offers a 90-day replacement guarantee:
• If the placed candidate voluntarily leaves or is terminated for cause within 90 days, Provider will source a replacement at no additional fee
• Replacement guarantee is limited to one replacement per placement

4. CANDIDATE OWNERSHIP
• Candidates presented by Provider are exclusive for 12 months from date of introduction
• Client may not hire presented candidates through other channels during this period

5. PAYMENT TERMS
• Net 30 from candidate start date
• Late payments subject to 1.5% monthly interest
• Client responsible for collection costs if payment exceeds 60 days

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of candidate information, rates, and business terms.

7. TERM & TERMINATION
• This Agreement is effective for 12 months and auto-renews annually
• Either party may terminate with 30 days written notice
• Outstanding placement fees survive termination

AGREED AND ACCEPTED:

Client: _________________________ Date: _________
{{clientName}}, {{clientTitle}}
{{clientCompany}}

Provider: _________________________ Date: _________
Peter Samuel, Director of Staffing
TechCloudPro Inc.

Contact: contracts@techcloudpro.com`,

  contract: `CONTRACTOR STAFFING AGREEMENT — HOURLY RATE

This Contractor Staffing Agreement ("Agreement") is entered into as of {{date}} between:

CLIENT: {{clientCompany}} ("Client")
STAFFING PROVIDER: TechCloudPro Inc. ("Provider")

1. SERVICES
Provider agrees to supply qualified technology contractors to Client on an hourly basis.

2. BILLING STRUCTURE
• Client pays Provider the agreed hourly bill rate per contractor
• TechCloudPro markup: $2.00/hour over contractor pay rate
• Rates per role are as specified in the attached Rate Card (Exhibit A)
• Minimum engagement: 4 weeks per contractor

3. BILLING & PAYMENT
• Provider invoices bi-weekly based on approved timesheets
• Client approves timesheets within 3 business days
• Payment due Net 15 from invoice date
• Overtime (>40 hrs/week): billed at 1.5x standard rate

4. CONTRACTOR MANAGEMENT
• Contractors are W-2 employees of Provider (not independent contractors)
• Provider handles payroll, taxes, workers' compensation, and benefits
• Client directs daily work activities

5. CONVERSION TO FULL-TIME
• Client may convert contractor to full-time after 480 hours (approx. 12 weeks)
• Conversion fee: 15% of annual salary minus contractor fees already paid
• No conversion fee after 960 hours (approx. 24 weeks)

6. REPLACEMENT GUARANTEE
• If contractor is unsatisfactory, Provider will replace within 5 business days
• No charge for the first 40 hours of replacement overlap

7. CONFIDENTIALITY & IP
• Contractors sign NDA and IP assignment agreements
• All work product belongs to Client
• Provider ensures contractor compliance

8. TERM & TERMINATION
• This Agreement is effective for 12 months, auto-renews annually
• Either party may terminate a contractor placement with 2 weeks notice
• Agreement may be terminated with 30 days written notice

AGREED AND ACCEPTED:

Client: _________________________ Date: _________
{{clientName}}, {{clientTitle}}
{{clientCompany}}

Provider: _________________________ Date: _________
Peter Samuel, Director of Staffing
TechCloudPro Inc.

Contact: contracts@techcloudpro.com`,

  project: `PROJECT SERVICES AGREEMENT — AI CONSULTING & TECHNOLOGY

This Project Services Agreement ("Agreement") is entered into as of {{date}} between:

CLIENT: {{clientCompany}} ("Client")
PROVIDER: TechCloudPro Inc. ("Provider")

1. PROJECT SCOPE
Provider agrees to deliver the following technology consulting services:
• Project: {{projectName}}
• Deliverables: As specified in Statement of Work (Exhibit A)
• Timeline: {{timeline}}

2. PRICING MODEL
☐ Fixed Price: $[fixedPrice] for complete project delivery
☐ Time & Materials: Billed at rates specified in Rate Card (Exhibit B)
  - Project Manager: $[pmRate]/hr
  - Senior Engineer: $[seniorRate]/hr
  - Engineer: $[midRate]/hr
  - Monthly cap: $[monthlyCap] (if applicable)

3. PAYMENT SCHEDULE
For Fixed Price:
• 30% upon signing ($[deposit])
• 40% at mid-project milestone
• 30% upon final delivery and acceptance

For Time & Materials:
• Bi-weekly invoicing based on approved timesheets
• Net 15 payment terms

4. CHANGE MANAGEMENT
• Scope changes require written Change Order signed by both parties
• Change Orders specify additional cost, timeline impact, and deliverable changes
• Provider will not proceed with changes until Change Order is approved

5. INTELLECTUAL PROPERTY
• All deliverables and work product are owned by Client upon full payment
• Provider retains rights to general knowledge, tools, and methodologies
• Open-source components governed by their respective licenses

6. WARRANTIES
• Provider warrants deliverables will meet specifications for 60 days post-delivery
• Provider will fix defects at no cost during warranty period
• Warranty excludes issues caused by Client modifications

7. CONFIDENTIALITY
• Both parties agree to protect confidential information for 3 years
• Provider team signs individual NDAs
• Client data handled per industry security standards

8. LIABILITY
• Provider's total liability limited to fees paid under this Agreement
• Neither party liable for indirect, consequential, or punitive damages

9. TERM & TERMINATION
• Agreement effective until project completion or mutual termination
• Either party may terminate with 30 days written notice
• Client pays for work completed through termination date
• Provider delivers all work product through termination date

AGREED AND ACCEPTED:

Client: _________________________ Date: _________
{{clientName}}, {{clientTitle}}
{{clientCompany}}

Provider: _________________________ Date: _________
Peter Samuel, Director of Consulting
TechCloudPro Inc.

Contact: contracts@techcloudpro.com`,
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export function ContractsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [contractText, setContractText] = useState('');
  const [editingRate, setEditingRate] = useState<{ type: string; catIdx: number; rowIdx: number; field: string } | null>(null);
  const [rateCards, setRateCards] = useState(RATE_CARDS);

  const handleEditRate = (type: string, catIdx: number, rowIdx: number, field: string, value: string) => {
    setRateCards(prev => {
      const next = { ...prev };
      next[type] = [...prev[type]];
      next[type][catIdx] = { ...next[type][catIdx], rates: [...next[type][catIdx].rates] };
      (next[type][catIdx].rates[rowIdx] as any)[field] = value;
      return next;
    });
  };

  const handleViewContract = (typeId: string) => {
    setContractText(CONTRACT_TEMPLATES[typeId]);
    setShowContract(true);
  };

  const handleDownloadContract = () => {
    const blob = new Blob([contractText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TechCloudPro_Contract_${selectedType || 'draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeInfo = selectedType ? CONTRACT_TYPES.find(t => t.id === selectedType) : null;

  return (
    <div style={{ padding: '16px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))', borderRadius: '12px', border: '1px solid #2a2a44', padding: '24px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 4px' }}>Contracts & Rate Cards</h1>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Three contract types with market-rate pricing. Rates are editable. Contracts sent from contracts@techcloudpro.com</p>
      </div>

      {/* Contract Type Cards */}
      {!selectedType && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
          {CONTRACT_TYPES.map(type => (
            <div
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              style={{
                background: '#161625', border: '1px solid #2a2a44', borderRadius: '12px',
                padding: '24px', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = type.color; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a44'; }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{type.icon}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 6px' }}>{type.name}</h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{type.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selected Type — Rate Card + Contract */}
      {selectedType && typeInfo && (
        <div>
          {/* Back + Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={() => { setSelectedType(null); setShowContract(false); }} style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              ← Back to contract types
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleViewContract(selectedType)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #3d3d5c', background: 'transparent', color: '#F1F5F9', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DocumentTextIcon style={{ width: '14px', height: '14px' }} />
                {showContract ? 'Hide Contract' : 'View Contract Template'}
              </button>
              <button
                onClick={handleDownloadContract}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowDownTrayIcon style={{ width: '14px', height: '14px' }} />
                Download Contract
              </button>
            </div>
          </div>

          {/* Type Header */}
          <div style={{ background: '#161625', border: '1px solid #2a2a44', borderRadius: '12px', padding: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '36px' }}>{typeInfo.icon}</div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 4px' }}>{typeInfo.name}</h2>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>{typeInfo.desc}</p>
            </div>
            <div style={{ marginLeft: 'auto', background: `${typeInfo.color}15`, border: `1px solid ${typeInfo.color}30`, borderRadius: '8px', padding: '8px 16px' }}>
              <span style={{ color: typeInfo.color, fontSize: '12px', fontWeight: 700 }}>
                {selectedType === 'fulltime' ? '15% Placement Fee' : selectedType === 'contract' ? '$2/hr Markup' : 'Fixed / T&M'}
              </span>
            </div>
          </div>

          {/* Contract Template (toggled) */}
          {showContract && (
            <div style={{ background: '#1e1e36', border: '1px solid #2a2a44', borderRadius: '12px', padding: '24px', marginBottom: '16px', maxHeight: '500px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Contract Template</h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Edit the text below before sending</span>
              </div>
              <textarea
                value={contractText}
                onChange={e => setContractText(e.target.value)}
                style={{
                  width: '100%', minHeight: '400px', background: '#12121f', border: '1px solid #3d3d5c',
                  borderRadius: '8px', color: '#CBD5E1', padding: '16px', fontSize: '13px', lineHeight: '1.7',
                  fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Rate Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(rateCards[selectedType] || []).map((cat, catIdx) => {
              const isExpanded = expandedCategory === cat.category;
              return (
                <div key={cat.category} style={{ background: '#161625', border: '1px solid #2a2a44', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                    style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(99,102,241,0.05)' : 'transparent' }}
                  >
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>{cat.category}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{cat.rates.length} roles</span>
                      {isExpanded ? <ChevronDownIcon style={{ width: '16px', height: '16px', color: '#94A3B8' }} /> : <ChevronRightIcon style={{ width: '16px', height: '16px', color: '#94A3B8' }} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #2a2a44' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#12121f' }}>
                            <th style={{ padding: '10px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Junior</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Mid-Level</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Senior</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Lead/Principal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.rates.map((row, rowIdx) => (
                            <tr key={row.role} style={{ borderTop: '1px solid #1e1e36' }}>
                              <td style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 500, color: '#F1F5F9' }}>{row.role}</td>
                              {(['juniorRate', 'midRate', 'seniorRate', 'leadRate'] as const).map(field => (
                                <td key={field} style={{ padding: '6px 10px', textAlign: 'center' }}>
                                  {editingRate?.type === selectedType && editingRate?.catIdx === catIdx && editingRate?.rowIdx === rowIdx && editingRate?.field === field ? (
                                    <input
                                      autoFocus
                                      defaultValue={row[field]}
                                      onBlur={e => { handleEditRate(selectedType, catIdx, rowIdx, field, e.target.value); setEditingRate(null); }}
                                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                      style={{ width: '80px', background: '#252540', border: '1px solid #6366F1', borderRadius: '4px', color: '#F1F5F9', padding: '4px 8px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
                                    />
                                  ) : (
                                    <span
                                      onClick={() => setEditingRate({ type: selectedType, catIdx, rowIdx, field })}
                                      style={{ fontSize: '13px', color: '#A5B4FC', fontWeight: 600, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}
                                      title="Click to edit"
                                    >
                                      {row[field]}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
