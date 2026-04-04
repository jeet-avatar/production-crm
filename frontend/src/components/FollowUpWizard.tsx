import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  UserGroupIcon,
  CursorArrowRaysIcon,
  EyeIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EngagementSignal {
  status: string;
  totalOpens: number;
  engagementScore: number;
  openedAt?: string | null;
  clickedAt?: string | null;
}

interface ContactRecord {
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string | null;
  company: {
    id: string;
    name: string;
    industry?: string | null;
    size?: string | null;
    intent?: string | null;
    hiringInfo?: string | null;
    pitch?: string | null;
    description?: string | null;
  } | null;
  engagementSignal: EngagementSignal;
}

interface FollowUpSource {
  campaignId: string;
  campaignName: string;
  campaignSubject: string;
  segments: {
    clicked: ContactRecord[];
    opened: ContactRecord[];
  };
  totals: {
    clicked: number;
    opened: number;
    allEngaged: number;
  };
}

interface IntelBrief {
  companyId: string;
  whyFollowUp: string;
  suggestedAngle: string;
  suggestedSubject: string;
  urgencySignal: string;
}

interface SendResult {
  success: boolean;
  sent: number;
  total: number;
  failed: number;
}

type Segment = 'CLICKED' | 'OPENED' | 'ALL';

function buildClickersTemplate(campaignTopic: string): string {
  return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Following up on ${campaignTopic}</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">TechCloudPro · Technology Staffing</p>
  </div>
  <div style="padding: 28px; background: #ffffff; color: #1e293b;">
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">Hi {{firstName}},</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">I wanted to follow up on our recent outreach about technology staffing for <strong>{{companyName}}</strong>.</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">We work with companies who need <strong>pre-vetted engineers fast</strong> — without the 15-20% markup most staffing firms charge. Our flat $2/hr model means you get senior talent at contractor rates, with full flexibility to scale up or down.</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Would a quick 15-minute call this week work? I can walk you through how we have placed engineers at similar companies in your space.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://calendly.com/peter-techcloudpro" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; letter-spacing: 0.3px;">Schedule a 15-Min Call</a>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;">Best regards,<br/><strong style="color: #1e293b;">Peter Varghese</strong><br/>TechCloudPro · Technology Staffing</p>
  </div>
</div>`;
}

function buildOpenersTemplate(campaignTopic: string): string {
  return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">One thought on ${campaignTopic}</h1>
    <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px;">TechCloudPro · Technology Staffing</p>
  </div>
  <div style="padding: 28px; background: #ffffff; color: #1e293b;">
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">Hi {{firstName}},</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">I will keep this brief — one question for <strong>{{companyName}}</strong>:</p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px; padding: 16px 20px; background: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 6px 6px 0;"><em>If you needed a senior engineer in the next 30 days — would you rather pay a 15% placement fee, or $2/hr above contractor rate with no long-term commitment?</em></p>
    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Most companies we talk to have not done the math. Happy to share a quick comparison if useful — just reply to this email.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;">Best,<br/><strong style="color: #1e293b;">Peter Varghese</strong><br/>TechCloudPro · Technology Staffing</p>
  </div>
</div>`;
}

export function FollowUpWizard({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [source, setSource] = useState<FollowUpSource | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [intel, setIntel] = useState<IntelBrief[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [intelError, setIntelError] = useState(false);

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedSegment(null);
    setIntel([]);
    setError('');
    setSendResult(null);
    setShowPreview(false);
    setLoadingIntel(false);
    setIntelError(false);

    try {
      const raw = sessionStorage.getItem('followUpSource');
      if (raw) {
        const data: FollowUpSource = JSON.parse(raw);
        setSource(data);
        setCampaignName(`Follow-up: ${data.campaignName}`);
      }
    } catch {
      // ignore parse errors
    }
  }, [isOpen]);

  const handleSegmentSelect = async (segment: Segment) => {
    if (!source) return;
    setSelectedSegment(segment);
    setIntel([]);
    setIntelError(false);

    const contacts =
      segment === 'CLICKED'
        ? source.segments.clicked
        : segment === 'OPENED'
        ? source.segments.opened
        : (() => {
            const merged = [...source.segments.clicked, ...source.segments.opened];
            const seen = new Set<string>();
            return merged.filter(c => {
              if (seen.has(c.contactId)) return false;
              seen.add(c.contactId);
              return true;
            });
          })();

    const companiesWithData = contacts
      .filter((c) => c.company !== null)
      .reduce<ContactRecord[]>((acc, c) => {
        if (!acc.find((x) => x.company?.id === c.company?.id)) acc.push(c);
        return acc;
      }, [])
      .map((c) => ({ ...c.company!, engagementSignal: c.engagementSignal }));

    const campaignTopic = source.campaignName;
    if (segment === 'CLICKED' || segment === 'ALL') {
      setSubject(`Following up on ${campaignTopic} — resources for {{companyName}}`);
      setEmailBody(buildClickersTemplate(campaignTopic));
    } else {
      setSubject(`One thought on ${campaignTopic} for {{companyName}}`);
      setEmailBody(buildOpenersTemplate(campaignTopic));
    }

    if (companiesWithData.length === 0) return;

    setLoadingIntel(true);
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/campaigns/${source.campaignId}/ai-intel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segment, companies: companiesWithData }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntel(data.intel || []);
      } else {
        setIntelError(true);
      }
    } catch {
      setIntelError(true);
    } finally {
      setLoadingIntel(false);
    }
  };

  const getSegmentContacts = (): ContactRecord[] => {
    if (!source || !selectedSegment) return [];
    if (selectedSegment === 'CLICKED') return source.segments.clicked;
    if (selectedSegment === 'OPENED') return source.segments.opened;
    const merged = [...source.segments.clicked, ...source.segments.opened];
    const seen = new Set<string>();
    return merged.filter(c => {
      if (seen.has(c.contactId)) return false;
      seen.add(c.contactId);
      return true;
    });
  };

  const getGroupedContacts = () => {
    const contacts = getSegmentContacts();
    const byCompany = new Map<string, { company: ContactRecord['company']; contacts: ContactRecord[] }>();
    const individuals: ContactRecord[] = [];

    for (const c of contacts) {
      if (c.company) {
        const existing = byCompany.get(c.company.id);
        if (existing) {
          existing.contacts.push(c);
        } else {
          byCompany.set(c.company.id, { company: c.company, contacts: [c] });
        }
      } else {
        individuals.push(c);
      }
    }
    return { byCompany: Array.from(byCompany.values()), individuals };
  };

  const handleSend = async () => {
    if (!source || !selectedSegment) return;
    setSending(true);
    setError('');

    const token = localStorage.getItem('crmToken');
    const contacts = getSegmentContacts();

    try {
      const createRes = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject,
          htmlContent: emailBody,
          status: 'DRAFT',
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create campaign');
      const { id: newCampaignId } = await createRes.json();

      const companyIds = [
        ...new Set(contacts.filter((c) => c.company).map((c) => c.company!.id)),
      ];
      for (const companyId of companyIds) {
        await fetch(`${API_URL}/api/campaigns/${newCampaignId}/companies/${companyId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      const sendRes = await fetch(`${API_URL}/api/campaigns/${newCampaignId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || 'Send failed');

      setSendResult({ success: true, sent: sendData.sent, total: sendData.total, failed: sendData.failed || 0 });
      setStep(4);
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;
  if (!source && isOpen) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0f172a', borderRadius: '16px', padding: '32px', maxWidth: '400px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '16px' }}>Could not load engagement data. Please close and try again.</p>
        <button onClick={onClose} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>Close</button>
      </div>
    </div>
  );

  const contacts = getSegmentContacts();
  const { byCompany, individuals } = getGroupedContacts();
  const segmentCount = (seg: Segment) => {
    if (!source) return 0;
    if (seg === 'CLICKED') return source.totals.clicked;
    if (seg === 'OPENED') return source.totals.opened;
    return source.totals.allEngaged;
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '860px',
          maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>Follow-up Campaign</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
              {source ? `Following up: ${source.campaignName}` : 'Loading...'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: '16px 28px', display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['Pick Segment', 'Review Audience', 'Preview & Send', 'Sent!'].map((label, i) => {
            const s = i + 1;
            const active = s === step;
            const done = s < step;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
                  background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.08)',
                  color: done || active ? '#fff' : '#64748b',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ color: active ? '#f1f5f9' : '#64748b' }}>{label}</span>
                {i < 3 && <span style={{ color: '#334155', marginLeft: 4 }}>›</span>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '24px 28px' }}>

          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', minHeight: '380px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Who gets the follow-up?
                </p>
                {(['CLICKED', 'OPENED', 'ALL'] as Segment[]).map((seg) => {
                  const count = segmentCount(seg);
                  const icon = seg === 'CLICKED' ? <CursorArrowRaysIcon style={{ width: 18, height: 18 }} /> : seg === 'OPENED' ? <EyeIcon style={{ width: 18, height: 18 }} /> : <UserGroupIcon style={{ width: 18, height: 18 }} />;
                  const label = seg === 'CLICKED' ? 'Clickers' : seg === 'OPENED' ? 'Openers' : 'All Engaged';
                  const desc = seg === 'CLICKED' ? 'Clicked your CTA — high intent' : seg === 'OPENED' ? "Opened but didn't click — mild interest" : 'Everyone who engaged';
                  return (
                    <button
                      key={seg}
                      onClick={() => handleSegmentSelect(seg)}
                      disabled={count === 0}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%',
                        padding: '14px 16px', borderRadius: '10px', marginBottom: '10px', cursor: count === 0 ? 'not-allowed' : 'pointer',
                        border: `2px solid ${selectedSegment === seg ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        background: selectedSegment === seg ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        textAlign: 'left', opacity: count === 0 ? 0.4 : 1,
                      }}
                    >
                      <div style={{ color: selectedSegment === seg ? '#818cf8' : '#64748b', marginTop: '2px' }}>{icon}</div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>
                          {label} <span style={{ color: '#6366f1', fontWeight: 700 }}>({count})</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '24px' }}>
                {!selectedSegment && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', textAlign: 'center' }}>
                    <SparklesIcon style={{ width: 32, height: 32, marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Pick a segment to see AI intelligence</p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0', color: '#1e293b' }}>Claude will analyze each company and suggest the right approach</p>
                  </div>
                )}

                {selectedSegment && loadingIntel && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                    <SparklesIcon style={{ width: 28, height: 28, marginBottom: '12px' }} />
                    <p style={{ fontSize: '14px', margin: 0 }}>Analyzing companies...</p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0', color: '#334155' }}>Claude is generating follow-up intelligence</p>
                  </div>
                )}

                {selectedSegment && !loadingIntel && intelError && (
                  <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '13px' }}>
                    Intelligence unavailable — AI service error. You can still proceed with the pre-filled template.
                  </div>
                )}

                {selectedSegment && !loadingIntel && !intelError && intel.length > 0 && (
                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                      AI Intelligence · {intel.length} {intel.length === 1 ? 'company' : 'companies'}
                    </p>
                    {intel.map((brief) => (
                      <div key={brief.companyId} style={{ marginBottom: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                          {byCompany.find(g => g.company?.id === brief.companyId)?.company?.name || 'Company'}
                          <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 500, marginLeft: '8px' }}>⚡ {brief.urgencySignal}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.6 }}>
                          <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Why follow up: </span>{brief.whyFollowUp}</div>
                          <div style={{ marginBottom: '6px' }}><span style={{ color: '#64748b' }}>Angle: </span><span style={{ color: '#a5b4fc' }}>{brief.suggestedAngle}</span></div>
                          <div><span style={{ color: '#64748b' }}>Suggested subject: </span><em>{brief.suggestedSubject}</em></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSegment && !loadingIntel && !intelError && intel.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', margin: 0 }}>No companies with linked data in this segment.</p>
                    <p style={{ fontSize: '12px', margin: '6px 0 0' }}>You can still send with the pre-filled template.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedSegment}
                style={{
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: selectedSegment ? 'pointer' : 'not-allowed',
                  background: selectedSegment ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.06)',
                  color: selectedSegment ? '#fff' : '#475569', border: 'none',
                }}
              >
                Review Audience →
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <LockClosedIcon style={{ width: 16, height: 16, color: '#6366f1' }} />
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                  Audience is locked to contacts who engaged with your original campaign.
                </p>
              </div>
              <p style={{ color: '#475569', fontSize: '12px', marginBottom: '20px' }}>
                These contacts engaged with your original campaign. Remove this follow-up and start a new campaign if you need a different audience.
              </p>

              {byCompany.map(({ company, contacts: cc }) => (
                <div key={company?.id} style={{ marginBottom: '10px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>{company?.name}</span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>{company?.industry}</span>
                  </div>
                  <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{cc.length} contact{cc.length !== 1 ? 's' : ''}</span>
                </div>
              ))}

              {individuals.length > 0 && (
                <div style={{ marginBottom: '10px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Individual Contacts</span>
                  <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{individuals.length} contact{individuals.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ← Back
                </button>
                <button onClick={() => setStep(3)} style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none' }}>
                  Preview & Send →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>CAMPAIGN NAME</label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>SUBJECT LINE</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>EMAIL BODY</label>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {showPreview ? 'Edit HTML' : 'Preview'}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailBody) }}
                  />
                ) : (
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                )}
              </div>

              {(() => {
                const linkedCount = contacts.length - individuals.length;
                return (
                  <>
                    <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: '#a5b4fc', marginBottom: individuals.length > 0 ? '8px' : '16px' }}>
                      Sending to <strong>{linkedCount}</strong> contacts across <strong>{byCompany.length}</strong> {byCompany.length === 1 ? 'company' : 'companies'} · Segment: <strong>{selectedSegment}</strong>
                    </div>
                    {individuals.length > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', color: '#fbbf24', fontSize: '12px', marginBottom: '16px' }}>
                        ⚠ {individuals.length} contact{individuals.length !== 1 ? 's' : ''} without a linked company will not receive this email.
                      </div>
                    )}
                  </>
                );
              })()}

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ← Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !campaignName || !subject || byCompany.length === 0}
                  style={{
                    padding: '10px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '14px',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    background: sending ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: sending ? '#475569' : '#fff', border: 'none',
                  }}
                >
                  {sending ? 'Sending...' : `Send to ${contacts.length - individuals.length} Contacts`}
                </button>
              </div>
            </div>
          )}

          {step === 4 && sendResult && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircleIcon style={{ width: 56, height: 56, color: '#10b981', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Follow-up Sent!</h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
                {sendResult.sent} emails sent · {sendResult.failed} failed
              </p>
              <button
                onClick={() => { onClose(); }}
                style={{ padding: '10px 28px', borderRadius: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
