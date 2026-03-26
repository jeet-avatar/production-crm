import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Company {
  id: string;
  name: string;
  _count: { contacts: number };
}

const EMOJIS = ['🏢', '🏬', '🏭', '🏪', '🏫'];

export function CampaignWizard({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  const API_URL = import.meta.env.VITE_API_URL;

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

  // Load companies when wizard opens or step changes to 2
  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch {
      // silently fail — empty state handled below
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
          name: campaignName,
          subject,
          status: 'SENDING',
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

      setSending(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send campaign. Please try again.');
      setSending(false);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const totalSelectedContacts = companies
    .filter(c => selectedCompanyIds.includes(c.id))
    .reduce((sum, c) => sum + (c._count?.contacts || 0), 0);

  const toneLabels: { value: 'professional' | 'friendly' | 'persuasive'; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'persuasive', label: 'Urgent' },
  ];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: 'rgba(22,22,37,0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    width: '860px',
    maxWidth: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    color: '#E2E8F0',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#F1F5F9',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '16px',
  };

  // Progress bar
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
      {[1, 2, 3].map(s => (
        <div
          key={s}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: s <= step ? '#6366F1' : 'rgba(255,255,255,0.12)',
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
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
              {step === 1 && 'Describe your campaign — AI writes the email for you'}
              {step === 2 && 'Select the groups that will receive this email'}
              {step === 3 && 'Confirm the details and hit send'}
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
          {step === 2 && (
            <div>
              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No groups yet — add contacts first</p>
                  <a href="/contacts" style={{ color: '#6366F1', textDecoration: 'underline' }}>
                    Go to Contacts
                  </a>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {companies.map((company, i) => {
                    const isSelected = selectedCompanyIds.includes(company.id);
                    return (
                      <div
                        key={company.id}
                        onClick={() => toggleCompany(company.id)}
                        style={{
                          padding: '16px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid #6366F1'
                            : '1px solid rgba(255,255,255,0.1)',
                          background: isSelected
                            ? 'rgba(99,102,241,0.12)'
                            : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                          {EMOJIS[i % EMOJIS.length]}
                        </div>
                        <div
                          style={{ fontWeight: 600, fontSize: '14px', color: '#F1F5F9', marginBottom: '4px' }}
                        >
                          {company.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                          {company._count?.contacts || 0} contacts
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom filter tile (coming soon) */}
                  <div
                    title="Coming soon"
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1.5px dashed rgba(255,255,255,0.2)',
                      background: 'transparent',
                      cursor: 'not-allowed',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.25)',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    + Custom filter
                  </div>
                </div>
              )}

              {/* Summary bar */}
              {selectedCompanyIds.length > 0 && (
                <div
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#A5B4FC',
                    marginBottom: '16px',
                  }}
                >
                  ✅ {selectedCompanyIds.length} group{selectedCompanyIds.length !== 1 ? 's' : ''} selected
                  — {totalSelectedContacts} contact{totalSelectedContacts !== 1 ? 's' : ''} will receive this
                  email
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
          )}

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
