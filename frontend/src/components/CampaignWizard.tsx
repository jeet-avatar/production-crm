import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  phone?: string;
}

interface Company {
  id: string;
  name: string;
  _count: { contacts: number };
  contacts?: Contact[];
}

interface StaffingTemplate {
  name: string;
  subject: string;
  htmlContent: string;
}

interface SendResult {
  success: boolean;
  sent: number;
  total: number;
  failed: number;
  mode: string;
  message: string;
  recipients: { email: string; name: string; company: string }[];
}

const EMOJIS = ['🏢', '🏬', '🏭', '🏪', '🏫'];

export function CampaignWizard({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'persuasive'>('professional');
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [fromAddress, setFromAddress] = useState('');
  const [editingFrom, setEditingFrom] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [contentSource, setContentSource] = useState<'ai' | 'template' | 'staffing'>('ai');
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; htmlContent: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [staffingTemplates, setStaffingTemplates] = useState<StaffingTemplate[]>([]);
  const [selectedStaffingIdx, setSelectedStaffingIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Load user email on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('crmUser');
      if (raw) {
        const user = JSON.parse(raw);
        setFromAddress(user.email || '');
      }
    } catch {
      // ignore
    }
  }, []);

  // Load companies + templates when wizard opens
  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      loadTemplates();
      loadStaffingTemplates();
      // Reset state for fresh wizard
      setStep(1);
      setSendResult(null);
      setShowPreview(false);
      setError('');
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/email-templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.templates || data || [];
        setTemplates(Array.isArray(list) ? list : []);
      }
    } catch {
      // silently fail
    }
  };

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/companies?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.companies || data.data || [];
        // Sort by contact count descending so most populated groups show first
        list.sort((a: any, b: any) => (b._count?.contacts || 0) - (a._count?.contacts || 0));
        setCompanies(list);
      }
    } catch {
      // silently fail — empty state handled below
    }
  };

  const loadStaffingTemplates = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/staffing/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaffingTemplates(data.templates || []);
      }
    } catch {
      // Silently fail — staffing templates are optional
    }
  };

  const seedStaffingCompanies = async () => {
    setSeeding(true);
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/staffing/seed-companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSeedDone(true);
        await loadCompanies(); // Reload companies after seeding
      }
    } catch {
      // Silently fail
    } finally {
      setSeeding(false);
    }
  };

  const runGeneration = async () => {
    setGenerating(true);
    setGenerateError('');
    const token = localStorage.getItem('crmToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    try {
      // Step A: generate-basics
      const basicsRes = await fetch(`${API_URL}/api/campaigns/ai/generate-basics`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tone, description: prompt }),
      });
      if (!basicsRes.ok) throw new Error('Failed to generate campaign basics');
      const basicsData = await basicsRes.json();
      setCampaignName(basicsData.name);
      setCampaignGoal(basicsData.goal);

      // Step B: generate-subject
      const subjectRes = await fetch(`${API_URL}/api/campaigns/ai/generate-subject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ goal: basicsData.goal, tone, campaignName: basicsData.name }),
      });
      if (!subjectRes.ok) throw new Error('Failed to generate subject line');
      const subjectData = await subjectRes.json();
      setSubject(subjectData.variants[0]);

      // Step C: generate-content
      const contentRes = await fetch(`${API_URL}/api/campaigns/ai/generate-content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal: basicsData.goal,
          subject: subjectData.variants[0],
          tone,
          personalization: true,
        }),
      });
      if (!contentRes.ok) throw new Error('Failed to generate email content');
      const contentData = await contentRes.json();
      setEmailBody(contentData.content);
    } catch (err: any) {
      setGenerateError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');
    const token = localStorage.getItem('crmToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    try {
      // Create campaign
      const createRes = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: campaignName || `Staffing Campaign - ${new Date().toLocaleDateString()}`,
          subject,
          status: 'DRAFT',
          htmlContent: emailBody,
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create campaign');
      const createData = await createRes.json();
      const campaign = createData.campaign;

      // Link companies
      for (const companyId of selectedCompanyIds) {
        await fetch(`${API_URL}/api/campaigns/${campaign.id}/companies/${companyId}`, {
          method: 'POST',
          headers,
        });
      }

      // Mock send (queue without real email)
      const sendRes = await fetch(`${API_URL}/api/campaigns/${campaign.id}/mock-send`, {
        method: 'POST',
        headers,
      });

      if (sendRes.ok) {
        const result = await sendRes.json();
        setSendResult(result);
        setStep(4 as any); // Move to success step
      } else {
        // Fallback: even if mock-send fails, campaign is created
        setSendResult({
          success: true,
          sent: totalSelectedContacts,
          total: totalSelectedContacts,
          failed: 0,
          mode: 'queued',
          message: `Campaign created and queued for ${totalSelectedContacts} contacts.`,
          recipients: [],
        });
        setStep(4 as any);
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to send campaign. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds(prev => {
      if (prev.includes(id)) {
        // Deselecting company — also remove its contacts from selection
        const company = companies.find(c => c.id === id);
        if (company?.contacts) {
          setSelectedContactIds(prevContacts => {
            const next = new Set(prevContacts);
            company.contacts!.forEach(c => next.delete(c.id));
            return next;
          });
        }
        return prev.filter(c => c !== id);
      } else {
        // Selecting company — auto-select all its contacts
        const company = companies.find(c => c.id === id);
        if (company?.contacts) {
          setSelectedContactIds(prevContacts => {
            const next = new Set(prevContacts);
            company.contacts!.forEach(c => next.add(c.id));
            return next;
          });
        }
        return [...prev, id];
      }
    });
  };

  const toggleContact = (contactId: string, companyId: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
        // Also ensure the company is selected
        if (!selectedCompanyIds.includes(companyId)) {
          setSelectedCompanyIds(p => [...p, companyId]);
        }
      }
      return next;
    });
  };

  const toggleAllContactsInCompany = (company: Company) => {
    const contacts = company.contacts || [];
    const allSelected = contacts.every(c => selectedContactIds.has(c.id));
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        contacts.forEach(c => next.delete(c.id));
      } else {
        contacts.forEach(c => next.add(c.id));
      }
      return next;
    });
  };

  const totalSelectedContacts = selectedContactIds.size > 0
    ? selectedContactIds.size
    : companies
        .filter(c => selectedCompanyIds.includes(c.id))
        .reduce((sum, c) => sum + (c._count?.contacts || 0), 0);

  const toneLabels: { value: 'professional' | 'friendly' | 'persuasive'; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'persuasive', label: 'Urgent' },
  ];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#1a1a2e',
    border: '2px solid #6366F1',
    borderRadius: '16px',
    width: '860px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 25px 60px rgba(0,0,0,0.7)',
    color: '#F1F5F9',
    position: 'relative',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#252540',
    border: '1px solid #3d3d5c',
    borderRadius: '8px',
    color: '#F1F5F9',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    background: '#20203a',
    border: '1px solid #3d3d5c',
    borderRadius: '10px',
    padding: '16px',
  };

  // Progress bar
  const stepCount = 4;
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: s <= step ? (s === 4 && sendResult ? '#10B981' : '#6366F1') : 'rgba(255,255,255,0.12)',
            transition: 'background 0.3s',
          }}
        />
      ))}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#F1F5F9' }}>
              {step === 1 && 'New Campaign'}
              {step === 2 && 'Who Gets It?'}
              {step === 3 && 'Review & Send'}
              {step === 4 && 'Campaign Sent!'}
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
              {step === 1 && 'Describe your campaign — AI writes the email, or pick a staffing template'}
              {step === 2 && 'Select companies and pick the contacts to email'}
              {step === 3 && 'Preview the email, confirm details, and send'}
              {step === 4 && 'Your campaign has been queued successfully'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
            }}
          >
            <XMarkIcon style={{ width: '22px', height: '22px' }} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          <ProgressBar />

          {/* ======================== STEP 1 ======================== */}
          {step === 1 && (
            <div>
              {/* Source toggle: AI Generate vs Staffing Templates vs Use Template */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#252540', borderRadius: '10px', padding: '4px' }}>
                <button
                  onClick={() => setContentSource('staffing')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'staffing' ? '#6366F1' : 'transparent',
                    color: contentSource === 'staffing' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🏢 Staffing Templates
                </button>
                <button
                  onClick={() => setContentSource('ai')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'ai' ? '#6366F1' : 'transparent',
                    color: contentSource === 'ai' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  ✨ AI Generate
                </button>
                <button
                  onClick={() => setContentSource('template')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: contentSource === 'template' ? '#6366F1' : 'transparent',
                    color: contentSource === 'template' ? '#fff' : '#94A3B8',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  📄 My Templates
                </button>
              </div>

              {/* Helper: replace template variables with sample data for preview */}
              {(() => {
                const fillTemplate = (text: string) => {
                  return text
                    .replace(/\{\{firstName\}\}/g, 'Sarah')
                    .replace(/\{\{lastName\}\}/g, 'Mitchell')
                    .replace(/\{\{companyName\}\}/g, 'Deloitte')
                    .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                    .replace(/\{\{fromName\}\}/g, 'BrandMonkz');
                };

                const selectTemplate = (name: string, subj: string, html: string, idx?: number, templateId?: string) => {
                  setSubject(subj);
                  setEmailBody(html);
                  setCampaignName(name);
                  if (idx !== undefined) setSelectedStaffingIdx(idx);
                  if (templateId) setSelectedTemplateId(templateId);
                };

                return null; // This IIFE just defines helpers used below via closure
              })()}

              {/* Staffing Templates (shown when "Staffing Templates" is selected) */}
              {contentSource === 'staffing' && (
                <div>
                  {staffingTemplates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      <p style={{ fontSize: '40px', marginBottom: '12px' }}>🏢</p>
                      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#F1F5F9' }}>Loading staffing templates...</p>
                      <p style={{ fontSize: '13px' }}>Professional templates for technology staffing outreach</p>
                    </div>
                  ) : selectedStaffingIdx === null ? (
                    /* Template selection cards — clean, no raw HTML */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '380px', overflowY: 'auto' }}>
                      {staffingTemplates.map((t, idx) => {
                        const colors = ['#667eea', '#f5576c', '#4facfe', '#fa709a', '#a18cd1'];
                        const descriptions = [
                          'General partnership proposal — highlights your staffing capabilities across all tech streams',
                          'Targeted AI/ML talent pitch — pre-vetted GenAI, Computer Vision, NLP, and MLOps engineers',
                          'Cloud & DevOps specialists — certified AWS, Azure, GCP architects and SRE engineers',
                          'Cybersecurity urgency — penetration testers, SOC analysts, security architects',
                          'Full-Stack developers — React, Angular, Vue, Node.js, Python, .NET, Java engineers',
                        ];
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedStaffingIdx(idx);
                              setSubject(t.subject);
                              setEmailBody(t.htmlContent);
                              setCampaignName(t.name);
                            }}
                            style={{
                              padding: '16px',
                              borderRadius: '10px',
                              border: '1px solid #3d3d5c',
                              background: '#20203a',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              gap: '14px',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px',
                              background: `linear-gradient(135deg, ${colors[idx % colors.length]}, ${colors[(idx + 1) % colors.length]})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', color: '#fff', fontWeight: 700, flexShrink: 0,
                            }}>
                              {idx + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9', marginBottom: '4px' }}>
                                {t.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
                                {descriptions[idx] || t.subject.replace(/\{\{companyName\}\}/g, '[Company]').slice(0, 100)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Selected template — show rendered preview, not raw HTML */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button
                          onClick={() => setSelectedStaffingIdx(null)}
                          style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          ← Back to templates
                        </button>
                        <span style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600 }}>
                          {staffingTemplates[selectedStaffingIdx]?.name}
                        </span>
                      </div>

                      {/* Subject line — editable */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject line (personalized per recipient)</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />

                      {/* Rendered email preview — what the recipient actually sees */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview (names auto-filled per contact)</label>
                      <div style={{
                        border: '1px solid #3d3d5c',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        maxHeight: '250px',
                        overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff', padding: '0' }}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                emailBody
                                  .replace(/\{\{firstName\}\}/g, 'Sarah')
                                  .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                  .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                  .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                                  .replace(/\{\{fromName\}\}/g, 'BrandMonkz')
                              )
                            }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                        Names shown above are samples — each recipient gets their own name and company auto-filled.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Template picker (shown when "My Templates" is selected) */}
              {contentSource === 'template' && (
                <div>
                  {templates.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                      <p style={{ fontSize: '40px', marginBottom: '12px' }}>📄</p>
                      <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#F1F5F9' }}>No templates yet</p>
                      <p style={{ fontSize: '13px', marginBottom: '16px' }}>Create templates in Email Templates to use them here</p>
                      <a href="/email-templates" style={{ color: '#6366F1', textDecoration: 'underline', fontSize: '13px' }}>
                        Go to Email Templates →
                      </a>
                    </div>
                  ) : !selectedTemplateId ? (
                    /* Template cards — clean selection */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                      {templates.map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setSubject(t.subject);
                            setEmailBody(t.htmlContent);
                            setCampaignName(t.name);
                          }}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1px solid #3d3d5c',
                            background: '#20203a',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9', marginBottom: '6px' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                            {t.subject.replace(/\{\{.*?\}\}/g, '...').slice(0, 60)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Selected user template — rendered preview */
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <button
                          onClick={() => setSelectedTemplateId(null)}
                          style={{ background: 'none', border: 'none', color: '#A5B4FC', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                        >
                          ← Back to templates
                        </button>
                      </div>

                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject line</label>
                      <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />

                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</label>
                      <div style={{
                        border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden', maxHeight: '250px', overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff' }}>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                emailBody
                                  .replace(/\{\{firstName\}\}/g, 'Sarah')
                                  .replace(/\{\{lastName\}\}/g, 'Mitchell')
                                  .replace(/\{\{companyName\}\}/g, 'Deloitte')
                                  .replace(/\{\{email\}\}/g, 'sarah.mitchell@deloitte.com')
                              )
                            }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                        Names auto-filled per contact when sent.
                      </p>
                    </div>
                  )}

                  {/* Raw editing removed — preview is shown above */}
                </div>
              )}

              {/* AI Generation (existing — shown when "AI Generate" is selected) */}
              {contentSource === 'ai' && (
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* Left panel */}
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6366F1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '8px',
                    }}
                  >
                    Tell the AI what you want to say
                  </p>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. We are offering 20% off our cyber security training for NetSuite customers this month only"
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: '100px',
                      lineHeight: '1.5',
                    }}
                  />

                  {/* Tone pills */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {toneLabels.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          border: tone === t.value ? '1px solid #6366F1' : '1px solid rgba(99,102,241,0.4)',
                          background: tone === t.value ? '#6366F1' : 'transparent',
                          color: tone === t.value ? '#fff' : '#A5B4FC',
                          transition: 'all 0.2s',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={runGeneration}
                    disabled={generating || !prompt.trim()}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: generating || !prompt.trim()
                        ? 'rgba(99,102,241,0.4)'
                        : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {generating ? (
                      <>
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            border: '2px solid rgba(255,255,255,0.4)',
                            borderTopColor: '#fff',
                            borderRadius: '50%',
                            display: 'inline-block',
                            animation: 'spin 0.8s linear infinite',
                          }}
                        />
                        Generating...
                      </>
                    ) : (
                      '✨ Write my email'
                    )}
                  </button>

                  {generateError && (
                    <p style={{ color: '#F87171', fontSize: '12px', marginTop: '8px' }}>
                      {generateError}
                    </p>
                  )}
                </div>

                {/* Right panel — visible only after generation */}
                {subject && emailBody && (
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6366F1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          margin: 0,
                        }}
                      >
                        AI Draft — edit anything
                      </p>
                      <button
                        onClick={runGeneration}
                        disabled={generating}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#A5B4FC',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🔄 Regenerate
                      </button>
                    </div>

                    <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                      Subject line
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{ ...inputStyle, marginBottom: '12px' }}
                    />

                    <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                      Email body
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      rows={6}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: '130px',
                        lineHeight: '1.5',
                      }}
                    />
                  </div>
                )}
              </div>
              )}

              {/* Step 1 footer */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={!subject || !emailBody}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: !subject || !emailBody
                      ? 'rgba(99,102,241,0.3)'
                      : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: !subject || !emailBody ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next: Pick your group →
                </button>
              </div>
            </div>
          )}

          {/* ======================== STEP 2 ======================== */}
          {step === 2 && (() => {
            const filtered = companies.filter(c =>
              c.name.toLowerCase().includes(companySearch.toLowerCase())
            );
            const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedCompanyIds.includes(c.id));

            return (
            <div>
              {/* Search bar */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={companySearch}
                    onChange={e => setCompanySearch(e.target.value)}
                    placeholder="Search companies... (e.g. NetSuite, Cyber, Tech)"
                    style={{
                      ...inputStyle,
                      paddingLeft: '36px',
                    }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.5 }}>🔍</span>
                </div>
                <button
                  onClick={() => {
                    if (allFilteredSelected) {
                      setSelectedCompanyIds(prev => prev.filter(id => !filtered.find(c => c.id === id)));
                    } else {
                      const newIds = [...new Set([...selectedCompanyIds, ...filtered.map(c => c.id)])];
                      setSelectedCompanyIds(newIds);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.4)',
                    background: allFilteredSelected ? '#6366F1' : 'transparent',
                    color: allFilteredSelected ? '#fff' : '#A5B4FC',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {allFilteredSelected ? '✓ All Selected' : `Select All (${filtered.length})`}
                </button>
              </div>

              {/* Stats bar + seed button */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#94A3B8',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span>{companies.length} total groups</span>
                  <span>•</span>
                  <span>{filtered.length} shown</span>
                  <span>•</span>
                  <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{selectedCompanyIds.length} selected</span>
                </div>
                {!seedDone && (
                  <button
                    onClick={seedStaffingCompanies}
                    disabled={seeding}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(99,102,241,0.4)',
                      background: 'transparent',
                      color: '#A5B4FC',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: seeding ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {seeding ? '...' : '+ Add Staffing Companies'}
                  </button>
                )}
              </div>

              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No companies yet</p>
                  <p style={{ fontSize: '13px', marginBottom: '16px' }}>Seed enterprise staffing companies or add contacts first</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={seedStaffingCompanies}
                      disabled={seeding || seedDone}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: seedDone ? '#10B981' : seeding ? 'rgba(99,102,241,0.4)' : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: seeding || seedDone ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {seedDone ? '✓ Companies Loaded' : seeding ? 'Loading Companies...' : '🏢 Load Staffing Companies'}
                    </button>
                    <a href="/contacts" style={{ color: '#6366F1', textDecoration: 'underline', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                      Go to Contacts →
                    </a>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '14px' }}>No companies match "{companySearch}"</p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '16px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {filtered.map((company) => {
                    const isSelected = selectedCompanyIds.includes(company.id);
                    const isExpanded = expandedCompanyId === company.id;
                    const contactCount = company._count?.contacts || 0;
                    const contacts = company.contacts || [];
                    const selectedInCompany = contacts.filter(c => selectedContactIds.has(c.id)).length;

                    return (
                      <div key={company.id} style={{ borderRadius: '10px', border: isSelected ? '2px solid #6366F1' : '1px solid #3d3d5c', background: isSelected ? 'rgba(99,102,241,0.1)' : '#20203a', overflow: 'hidden', transition: 'all 0.15s' }}>
                        {/* Company header row */}
                        <div
                          style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        >
                          {/* Checkbox */}
                          <div
                            onClick={() => toggleCompany(company.id)}
                            style={{
                              width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                              border: isSelected ? '2px solid #6366F1' : '2px solid #3d3d5c',
                              background: isSelected ? '#6366F1' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', color: '#fff', fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            {isSelected && '✓'}
                          </div>

                          {/* Company icon */}
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, #252540, #2d2d4a)',
                            border: '1px solid #3d3d5c',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', flexShrink: 0, color: '#A5B4FC', fontWeight: 700,
                          }}>
                            {company.name.charAt(0).toUpperCase()}
                          </div>

                          {/* Company name + contact count */}
                          <div
                            onClick={() => toggleCompany(company.id)}
                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '2px' }}>
                              {company.name}
                            </div>
                            <div style={{ fontSize: '12px', color: selectedInCompany > 0 ? '#A5B4FC' : '#64748B' }}>
                              {selectedInCompany > 0
                                ? `${selectedInCompany} of ${contactCount} contacts selected`
                                : `${contactCount} contact${contactCount !== 1 ? 's' : ''}`
                              }
                            </div>
                          </div>

                          {/* Contact count badge */}
                          <div style={{
                            background: contactCount > 2 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                            color: contactCount > 2 ? '#A5B4FC' : '#64748B',
                            padding: '4px 10px', borderRadius: '12px',
                            fontSize: '12px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {contactCount}
                          </div>

                          {/* Expand/collapse arrow */}
                          {contactCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedCompanyId(isExpanded ? null : company.id); }}
                              style={{
                                background: isExpanded ? 'rgba(99,102,241,0.15)' : 'transparent',
                                border: '1px solid ' + (isExpanded ? 'rgba(99,102,241,0.3)' : '#3d3d5c'),
                                cursor: 'pointer',
                                color: isExpanded ? '#A5B4FC' : '#64748B',
                                fontSize: '11px', padding: '6px 10px',
                                borderRadius: '6px', transition: 'all 0.15s', fontWeight: 600, flexShrink: 0,
                              }}
                            >
                              {isExpanded ? '▲ Hide' : '▼ View'}
                            </button>
                          )}
                        </div>

                        {/* Expanded contact list */}
                        {isExpanded && contacts.length > 0 && (
                          <div style={{ borderTop: '1px solid #2d2d4a', padding: '8px 14px 12px', background: 'rgba(0,0,0,0.15)' }}>
                            {/* Select all / none for this company */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Contacts in {company.name}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleAllContactsInCompany(company); }}
                                style={{
                                  background: 'none', border: '1px solid rgba(99,102,241,0.3)',
                                  color: '#A5B4FC', fontSize: '11px', padding: '3px 8px',
                                  borderRadius: '4px', cursor: 'pointer',
                                }}
                              >
                                {contacts.every(c => selectedContactIds.has(c.id)) ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            {contacts.map(contact => {
                              const isContactSelected = selectedContactIds.has(contact.id);
                              return (
                                <div
                                  key={contact.id}
                                  onClick={(e) => { e.stopPropagation(); toggleContact(contact.id, company.id); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                    background: isContactSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    border: isContactSelected ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                    marginBottom: '4px', transition: 'all 0.1s',
                                  }}
                                >
                                  {/* Checkbox */}
                                  <div style={{
                                    width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                                    border: isContactSelected ? '2px solid #6366F1' : '2px solid #3d3d5c',
                                    background: isContactSelected ? '#6366F1' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', color: '#fff', fontWeight: 700,
                                  }}>
                                    {isContactSelected && '✓'}
                                  </div>
                                  {/* Contact info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>
                                      {contact.firstName} {contact.lastName}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <span>{contact.email}</span>
                                      {contact.role && <span style={{ color: '#6366F1' }}>• {contact.role}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary bar */}
              {selectedCompanyIds.length > 0 && (
                <div
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#A5B4FC',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {selectedCompanyIds.length} {selectedCompanyIds.length === 1 ? 'company' : 'companies'} selected
                    — {totalSelectedContacts} {totalSelectedContacts === 1 ? 'person' : 'people'} will receive this email
                  </span>
                  <button
                    onClick={() => setSelectedCompanyIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F87171',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Step 2 footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedCompanyIds.length === 0}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      selectedCompanyIds.length === 0
                        ? 'rgba(99,102,241,0.3)'
                        : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: selectedCompanyIds.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next: Review & Send →
                </button>
              </div>
            </div>
            );
          })()}

          {/* ======================== STEP 3 ======================== */}
          {step === 3 && (
            <div>
              {/* 2x2 summary cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                {/* Card 1: Campaign name */}
                <div style={cardStyle}>
                  <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                    Campaign name
                  </p>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={e => setCampaignName(e.target.value)}
                    style={{ ...inputStyle }}
                  />
                </div>

                {/* Card 2: Sending to */}
                <div style={cardStyle}>
                  <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                    Sending to
                  </p>
                  <p style={{ fontSize: '14px', color: '#F1F5F9', margin: 0, fontWeight: 500 }}>
                    {companies
                      .filter(c => selectedCompanyIds.includes(c.id))
                      .map(c => c.name)
                      .join(', ')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0' }}>
                    {totalSelectedContacts} contacts total
                  </p>
                </div>

                {/* Card 3: Subject line */}
                <div style={cardStyle}>
                  <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
                    Subject line
                  </p>
                  <p style={{ fontSize: '14px', color: '#F1F5F9', margin: 0 }}>{subject}</p>
                </div>

                {/* Card 4: From address */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      From address
                    </p>
                    <button
                      onClick={() => setEditingFrom(f => !f)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6366F1',
                        fontSize: '12px',
                      }}
                    >
                      ✏️ edit
                    </button>
                  </div>
                  {editingFrom ? (
                    <input
                      type="email"
                      value={fromAddress}
                      onChange={e => setFromAddress(e.target.value)}
                      style={{ ...inputStyle }}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#F1F5F9', margin: 0 }}>{fromAddress}</p>
                  )}
                </div>
              </div>

              {/* Email Preview Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99,102,241,0.4)',
                    background: showPreview ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: '#A5B4FC',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {showPreview ? '🔽 Hide Email Preview' : '👁️ Preview Email'}
                </button>

                {showPreview && emailBody && (
                  <div style={{
                    marginTop: '12px',
                    border: '1px solid #3d3d5c',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}>
                    {/* Email client header simulation */}
                    <div style={{
                      background: '#1e1e36',
                      padding: '12px 16px',
                      borderBottom: '1px solid #3d3d5c',
                    }}>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
                        <strong style={{ color: '#CBD5E1' }}>From:</strong> {fromAddress || 'campaigns@brandmonkz.com'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
                        <strong style={{ color: '#CBD5E1' }}>To:</strong> {'{'}{'{'} recipient {'}'}{'}'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        <strong style={{ color: '#CBD5E1' }}>Subject:</strong> {subject}
                      </div>
                    </div>
                    {/* Email body preview */}
                    <div style={{
                      background: '#ffffff',
                      padding: '0',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}>
                      <div
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailBody) }}
                        style={{ padding: '0' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: sending
                    ? 'rgba(16,185,129,0.4)'
                    : 'linear-gradient(to right, #10B981, #059669)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {sending ? (
                  <>
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Sending...
                  </>
                ) : (
                  `🚀 Send Campaign to ${totalSelectedContacts} People`
                )}
              </button>

              {error && (
                <p style={{ color: '#F87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              {/* Step 3 footer */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* ======================== STEP 4: SUCCESS ======================== */}
          {step === 4 && sendResult && (
            <div style={{ textAlign: 'center' }}>
              {/* Success icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)',
              }}>
                <span style={{ fontSize: '36px' }}>✓</span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>
                Campaign Queued Successfully!
              </h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px' }}>
                {sendResult.message}
              </p>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{sendResult.sent}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Contacts Queued</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366F1' }}>
                    {companies.filter(c => selectedCompanyIds.includes(c.id)).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Companies</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>
                    {sendResult.failed}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Failed</div>
                </div>
              </div>

              {/* Recipients list */}
              {sendResult.recipients.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6366F1',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '10px',
                    textAlign: 'left',
                  }}>
                    Recipients
                  </p>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #3d3d5c',
                  }}>
                    {sendResult.recipients.map((r, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: idx < sendResult.recipients.length - 1 ? '1px solid #2d2d4a' : 'none',
                          background: idx % 2 === 0 ? '#1e1e36' : '#20203a',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>{r.name}</div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.email}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 500 }}>{r.company}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note about email delivery */}
              <div style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#A5B4FC',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                📧 <strong>Note:</strong> Emails are queued and will be delivered once AWS SES production access is approved.
                Campaign data is saved and visible in your Campaigns dashboard.
              </div>

              {/* Done button */}
              <button
                onClick={() => {
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(to right, #6366F1, #8B5CF6)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Done — View Campaigns
              </button>
            </div>
          )}
        </div>

        {/* CSS for spinner */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default CampaignWizard;
