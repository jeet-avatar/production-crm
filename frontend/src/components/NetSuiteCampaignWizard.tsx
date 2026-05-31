import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
  EnvelopeIcon,
  UserGroupIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';
import {
  contactsApi,
  emailTemplatesApi,
  apolloApi,
  campaignsApi, // ONLY for aiGenerateContent — NOT used for sending. Send path is apolloApi.sendPersonalizedCampaign.
} from '../services/api';
import type { ApolloPersonalizedCampaignResponse } from '../services/api';

// ===== Types =====

interface Contact {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  stream?: string | null;
  companyId?: string | null;
  company?: { id: string; name: string } | null;
}

interface NetSuiteCampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  importedContactIds: string[];
  suggestedStream: string;
  onSuccess?: () => void;
}

// 3rd-layer fallback used when no per-stream template AND no "Stream:Other" template exists.
// Step 3 send button will block on this state (no templateId) and surface a "seed templates first" error,
// because /api/apollo/send-campaign requires a real templateId for tenant-scoped lookup.
const HARDCODED_FALLBACK = {
  subject: 'Tech engineers available for {{companyName}}',
  htmlBody:
    '<p>Hi {{firstName}},</p>' +
    '<p>We place senior engineers across the stack. Quick chat about {{companyName}}\'s near-term needs?</p>' +
    '<p>— Sara, TechCloudPro</p>',
};

// Hardcoded from-address — mirrors backend apollo.ts:53 (APOLLO_FROM_EMAIL).
// Phase 4.5 will make this per-stream / configurable.
const APOLLO_FROM_DISPLAY = 'Sara <sara@techcloudpro.com>';

// ===== Component =====

export function NetSuiteCampaignWizard({
  isOpen,
  onClose,
  importedContactIds,
  suggestedStream,
  onSuccess,
}: NetSuiteCampaignWizardProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1 — audience
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Step 2 — email content
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 3 — AI Personalize preview (Phase 05 plan 05-03 Task 1)
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ApolloPersonalizedCampaignResponse | null>(null);
  const [confirmedLargeBatch, setConfirmedLargeBatch] = useState(false);
  const LARGE_BATCH_THRESHOLD = 50;

  // Derived: first contact for preview (used by Step 3 fetch).
  // Uses selectedIds (the contacts the user actually checked in Step 1), NOT importedContactIds (the superset).
  const firstContactId = Array.from(selectedIds)[0] || null;

  // Step 4/5 — send
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<ApolloPersonalizedCampaignResponse | null>(null);

  // ===== Mount: fetch contacts + lookup template (3-layer fallback) =====
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    // Reset state for a clean open
    setStep(1);
    setSendError(null);
    setAiError(null);
    setPreviewError(null);
    setPreviewResult(null);
    setSendResult(null);
    setConfirmedLargeBatch(false);

    (async () => {
      // ---- Fetch contacts by ID ----
      setLoadingContacts(true);
      try {
        const data = await contactsApi.getByIds(importedContactIds);
        if (cancelled) return;
        const list: Contact[] = data?.contacts || [];
        setContacts(list);
        setSelectedIds(new Set(list.map((c) => c.id))); // pre-tick all
      } catch (err) {
        console.error('[NetSuiteCampaignWizard] fetch contacts failed', err);
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }

      // ---- 3-layer template fallback ----
      const fetchTemplate = async (category: string) => {
        try {
          return await emailTemplatesApi.findByCategory(category);
        } catch {
          return null;
        }
      };

      let tpl = await fetchTemplate(`Stream:${suggestedStream}`);
      if (!tpl) tpl = await fetchTemplate('Stream:Other');

      if (cancelled) return;
      if (tpl) {
        setSubject(tpl.subject || '');
        setBody(tpl.htmlBody || tpl.body || '');
        setTemplateId(tpl.id);
        setUsingFallback(false);
      } else {
        // Layer 3 — hardcoded literal. Sending will be blocked until user seeds templates.
        setSubject(HARDCODED_FALLBACK.subject);
        setBody(HARDCODED_FALLBACK.htmlBody);
        setTemplateId(null);
        setUsingFallback(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, importedContactIds, suggestedStream]);

  if (!isOpen) return null;

  // ===== Step 2 AI generation =====
  async function handleAiGenerate() {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await campaignsApi.aiGenerateContent(
        `${suggestedStream} outreach`,
        'professional',
        contacts[0]?.company?.name || 'your team',
      );
      if (data?.content) {
        setBody(data.content);
      }
    } catch (err) {
      console.error('[NetSuiteCampaignWizard] AI generate failed', err);
      setAiError('AI write failed — try again or edit the draft yourself.');
    } finally {
      setAiLoading(false);
    }
  }

  // ===== Step 3 fetchPreview — Phase 05 plan 05-03 Task 1 =====
  // Calls /api/apollo/send-personalized-campaign with previewOnly:true for the FIRST
  // checked contact. Creates a new personalized_email_sends audit row server-side
  // (status='preview'). Cached by previewResult — useEffect won't re-fire if
  // previewResult is non-null. Only the explicit Re-generate ✨ button creates additional
  // audit rows (user opt-in to spend another ~$0.069).
  const fetchPreview = async () => {
    if (!firstContactId || !templateId) {
      setPreviewError('No contact or template available for preview.');
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    setPreviewResult(null);
    try {
      const { data } = await apolloApi.sendPersonalizedCampaign({
        contactIds: [firstContactId],
        templateId,
        suggestedStream,
        previewOnly: true,
      });
      setPreviewResult(data);
    } catch (err: any) {
      setPreviewError(
        err?.response?.data?.detail || err?.message || 'Preview failed',
      );
    } finally {
      setPreviewing(false);
    }
  };

  // Auto-fetch on entering Step 3 — cached, fires ONLY when previewResult is null.
  // Deps include firstContactId + templateId so a user who navigates Back, changes
  // selection or template, and returns to Step 3 will trigger a fresh fetch (because
  // Back from Step 3 → Step 2 clears previewResult — see Step 3 JSX Back button).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (step === 3 && !previewResult && !previewing && firstContactId && templateId) {
      fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, firstContactId, templateId]);

  // ===== Step 4 send — Phase 05 plan 05-03 Task 2 =====
  // Calls /api/apollo/send-personalized-campaign (live, no previewOnly).
  // Phase 4 firewall holds: still bypasses the existing SES campaigns route — no Campaign
  // DB row is created here, tracking lives in personalized_email_sends + the response.
  // Backend handles per-contact Claude personalization + Resend dispatch + 250ms pacing.
  async function handleSend() {
    if (!templateId) {
      setSendError(
        'No saved template found for this stream. Go to Email Templates and seed templates first, ' +
          'or save this draft as a template before sending.',
      );
      return;
    }

    if (selectedIds.size === 0) {
      setSendError('Pick at least one contact in Step 1.');
      return;
    }

    if (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch) {
      setSendError(
        `Batch size ${selectedIds.size} exceeds ${LARGE_BATCH_THRESHOLD}. ` +
          'Go back to Step 3 and confirm the large-batch checkbox.',
      );
      return;
    }

    setSending(true);
    setSendError(null);
    setSendResult(null);

    try {
      const { data } = await apolloApi.sendPersonalizedCampaign({
        contactIds: Array.from(selectedIds),
        templateId,
        suggestedStream,
        confirmedLargeBatch:
          selectedIds.size > LARGE_BATCH_THRESHOLD ? true : undefined,
      });
      setSendResult(data);
      if (data.failureDetails && data.failureDetails.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[NetSuiteCampaignWizard] send failures', data.failureDetails);
      }
      setStep(5);
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Send failed. Check console for details.';
      console.error('[NetSuiteCampaignWizard] send failed', err);
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }

  // ===== Step 1 helpers =====
  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  // ===== Render =====
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#0f172a',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2
              style={{
                color: '#f1f5f9',
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Send Campaign to Imported Contacts
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
              Suggested stream: <strong style={{ color: '#a5b4fc' }}>{suggestedStream}</strong> ·{' '}
              {importedContactIds.length} contact(s) imported from Apollo
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
            }}
            aria-label="Close"
          >
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Step indicator (1.Audience 2.Email 3.AI Personalize 4.Review 5.Done) */}
        <div
          style={{
            padding: '16px 28px',
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}
        >
          {['Audience', 'Email', 'AI Personalize', 'Review', 'Done'].map((label, i) => {
            const s = (i + 1) as 1 | 2 | 3 | 4 | 5;
            const active = s === step;
            const done = s < step;
            return (
              <div
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: done ? '#10b981' : active ? '#6366f1' : 'rgba(255,255,255,0.08)',
                    color: done || active ? '#fff' : '#64748b',
                  }}
                >
                  {done ? '✓' : s}
                </div>
                <span style={{ color: active ? '#f1f5f9' : '#64748b' }}>
                  {s}. {label}
                </span>
                {i < 4 && <span style={{ color: '#334155', marginLeft: 4 }}>›</span>}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* ===== STEP 1: Audience ===== */}
          {step === 1 && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <UserGroupIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Pick the contacts you want to email
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px' }}>
                These are the {contacts.length} contact(s) you just imported from Apollo for the{' '}
                <strong>{suggestedStream}</strong> stream.
              </p>

              {loadingContacts ? (
                <div style={{ color: '#64748b', fontSize: '14px', padding: '20px 0' }}>
                  Loading contacts…
                </div>
              ) : contacts.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    fontSize: '13px',
                  }}
                >
                  No contacts were loaded. Close the wizard and try the Apollo import again.
                </div>
              ) : (
                <>
                  {/* Select All */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 600 }}>
                      Select all {contacts.length} contact(s)
                    </span>
                  </label>

                  {/* Contact list */}
                  <div
                    style={{
                      maxHeight: '320px',
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                    }}
                  >
                    {contacts.map((c) => {
                      const checked = selectedIds.has(c.id);
                      const displayName = [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)';
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer',
                            background: checked ? 'rgba(99,102,241,0.05)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleContact(c.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: '#f1f5f9',
                                fontSize: '13px',
                                fontWeight: 600,
                              }}
                            >
                              {displayName}
                              {c.company?.name && (
                                <span
                                  style={{
                                    color: '#64748b',
                                    fontWeight: 400,
                                    marginLeft: 8,
                                  }}
                                >
                                  · {c.company.name}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                marginTop: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.email}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p style={{ color: '#64748b', fontSize: '12px', margin: '12px 0 0' }}>
                    {selectedIds.size} of {contacts.length} selected
                  </p>
                </>
              )}

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                    background:
                      selectedIds.size === 0
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: selectedIds.size === 0 ? '#475569' : '#fff',
                    border: 'none',
                  }}
                >
                  Next: Write your email →
                </button>
              </div>
            </section>
          )}

          {/* ===== STEP 2: Email ===== */}
          {step === 2 && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <EnvelopeIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Write your email
                </h3>
              </div>

              {usingFallback && (
                <div
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fbbf24',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  Using built-in fallback template — no saved template found for{' '}
                  <strong>Stream:{suggestedStream}</strong> or <strong>Stream:Other</strong>.
                  Sending will be blocked until you seed templates on the Email Templates page.
                </div>
              )}

              <label
                style={{
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                📝 SUBJECT LINE
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's the subject of your email?"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  ✍️ WHAT YOU WANT TO SAY
                </label>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(99,102,241,0.4)',
                    borderRadius: '6px',
                    color: '#818cf8',
                    fontSize: '11px',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <SparklesIcon style={{ width: 12, height: 12 }} />
                  {aiLoading ? 'Generating…' : 'Let AI write it for me ✨'}
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <p
                style={{
                  color: '#64748b',
                  fontSize: '12px',
                  margin: '6px 0 0',
                }}
              >
                {body.length} characters · Variables{' '}
                <code style={{ color: '#a5b4fc' }}>{'{{firstName}}'}</code> +{' '}
                <code style={{ color: '#a5b4fc' }}>{'{{companyName}}'}</code> substitute per-recipient
                on the server.
              </p>

              {aiError && (
                <div
                  style={{
                    color: '#fca5a5',
                    fontSize: '12px',
                    marginTop: '8px',
                  }}
                >
                  {aiError}
                </div>
              )}

              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Next: AI Personalize →
                </button>
              </div>
            </section>
          )}

          {/* ===== STEP 3: AI Personalize (Phase 05 plan 05-03) ===== */}
          {step === 3 && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <SparklesIcon style={{ width: 18, height: 18, color: '#a855f7' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  AI Personalize — review the first-contact preview
                </h3>
                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: 'auto' }}>
                  Step 3 of 5
                </span>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>
                We&apos;ll generate the AI-personalized email for the FIRST checked contact.
                Review the tokens (intentHook / companyContext / painPoint / cta) before
                committing the batch.
                Estimated cost: ~$0.069 / contact × {selectedIds.size} ={' '}
                <strong style={{ color: '#a5b4fc' }}>
                  ~${(0.069 * selectedIds.size).toFixed(2)}
                </strong>
                .
              </p>

              {previewing && (
                <div
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13px',
                  }}
                >
                  🧠 Researching the first contact&apos;s company with Claude + web_search… (up to 60s)
                </div>
              )}

              {previewError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  ❌ Preview failed: {previewError}
                </div>
              )}

              {previewResult && previewResult.audit[0] && (
                <>
                  {/* Inbox-card preview */}
                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '13px',
                        color: '#94a3b8',
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <strong style={{ color: '#cbd5e1' }}>From:</strong> {APOLLO_FROM_DISPLAY}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong style={{ color: '#cbd5e1' }}>To:</strong>{' '}
                        {previewResult.audit[0].email}
                      </div>
                      <div>
                        <strong style={{ color: '#cbd5e1' }}>Subject:</strong>{' '}
                        {previewResult.audit[0].subject || (
                          <em style={{ color: '#64748b' }}>(no subject)</em>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '16px',
                        background: '#fff',
                        color: '#1e293b',
                        fontSize: '14px',
                        lineHeight: 1.6,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(previewResult.audit[0].renderedBody || ''),
                      }}
                    />
                  </div>

                  {/* AI token attribution panel */}
                  <div
                    style={{
                      border: '1px solid rgba(168,85,247,0.3)',
                      background: 'rgba(168,85,247,0.08)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '12px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ color: '#d8b4fe', fontWeight: 600, marginBottom: 6 }}>
                      🤖 AI tokens used:
                    </div>
                    {previewResult.audit[0].aiTokens ? (
                      <ul style={{ color: '#e2e8f0', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                        <li>
                          <strong>intentHook:</strong>{' '}
                          {previewResult.audit[0].aiTokens.intentHook || (
                            <em style={{ color: '#fbbf24' }}>(used stream fallback)</em>
                          )}
                        </li>
                        <li>
                          <strong>companyContext:</strong>{' '}
                          {previewResult.audit[0].aiTokens.companyContext || (
                            <em style={{ color: '#fbbf24' }}>(used stream fallback)</em>
                          )}
                        </li>
                        <li>
                          <strong>painPoint:</strong>{' '}
                          {previewResult.audit[0].aiTokens.painPoint || (
                            <em style={{ color: '#fbbf24' }}>(used stream fallback)</em>
                          )}
                        </li>
                        <li>
                          <strong>cta:</strong>{' '}
                          {previewResult.audit[0].aiTokens.cta || (
                            <em style={{ color: '#fbbf24' }}>(used stream fallback)</em>
                          )}
                        </li>
                      </ul>
                    ) : (
                      <div style={{ color: '#fbbf24' }}>
                        ⚠ Claude unavailable — stream-generic fallback tokens used. Reason:{' '}
                        {previewResult.audit[0].aiWarning || 'unknown'}
                      </div>
                    )}
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: 8 }}>
                      Claude input tokens: {previewResult.audit[0].claudeInputTokens ?? 0} · output:{' '}
                      {previewResult.audit[0].claudeOutputTokens ?? 0} · web_search uses:{' '}
                      {previewResult.audit[0].webSearchUses ?? 0}
                    </div>
                  </div>

                  {/* Hard-batch warning + confirmation gate (N>50) */}
                  {selectedIds.size > LARGE_BATCH_THRESHOLD && (
                    <div
                      style={{
                        border: '1px solid rgba(239,68,68,0.4)',
                        background: 'rgba(239,68,68,0.1)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        color: '#fecaca',
                        lineHeight: 1.5,
                      }}
                    >
                      ⚠ Large batch: <strong>{selectedIds.size}</strong> contacts. Estimated cost:{' '}
                      <strong>${(selectedIds.size * 0.069).toFixed(2)}</strong>.
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={confirmedLargeBatch}
                          onChange={(e) => setConfirmedLargeBatch(e.target.checked)}
                          style={{ width: 14, height: 14, cursor: 'pointer' }}
                        />
                        <span>I confirm sending to {selectedIds.size} contacts.</span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Step navigation */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => {
                    setPreviewResult(null);
                    setPreviewError(null);
                    setStep(2);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={fetchPreview}
                    disabled={previewing}
                    title="Generates a new AI personalization (creates a new audit row in personalized_email_sends; ~$0.069)"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(168,85,247,0.12)',
                      border: '1px solid rgba(168,85,247,0.4)',
                      color: '#d8b4fe',
                      cursor: previewing ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      opacity: previewing ? 0.5 : 1,
                    }}
                  >
                    ✨ Re-generate
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={
                      !previewResult ||
                      previewing ||
                      (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch)
                    }
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor:
                        !previewResult ||
                        previewing ||
                        (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch)
                          ? 'not-allowed'
                          : 'pointer',
                      background:
                        !previewResult ||
                        previewing ||
                        (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch)
                          ? 'rgba(255,255,255,0.06)'
                          : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color:
                        !previewResult ||
                        previewing ||
                        (selectedIds.size > LARGE_BATCH_THRESHOLD && !confirmedLargeBatch)
                          ? '#475569'
                          : '#fff',
                      border: 'none',
                    }}
                  >
                    Looks good — Review →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ===== STEP 4: Review & Send (Phase 05 plan 05-03 Task 2) ===== */}
          {step === 4 && (
            <section>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <EyeIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Review &amp; Send
                </h3>
                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: 'auto' }}>
                  Step 4 of 5
                </span>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '8px',
                  color: '#a5b4fc',
                  fontSize: '13px',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                📊 Sending to: <strong>{selectedIds.size} contact(s)</strong> via AI-personalized
                Resend dispatch.
                <br />
                🧠 First-contact preview (already approved in Step 3):
              </div>

              {previewResult?.audit[0] && (
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      fontSize: '13px',
                      color: '#94a3b8',
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <strong style={{ color: '#cbd5e1' }}>From:</strong> {APOLLO_FROM_DISPLAY}
                    </div>
                    <div>
                      <strong style={{ color: '#cbd5e1' }}>Subject:</strong>{' '}
                      {previewResult.audit[0].subject || (
                        <em style={{ color: '#64748b' }}>(no subject)</em>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      background: '#fff',
                      color: '#1e293b',
                      fontSize: '14px',
                      lineHeight: 1.6,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(previewResult.audit[0].renderedBody || ''),
                    }}
                  />
                </div>
              )}

              {sendError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  ❌ {sendError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <button
                  onClick={() => setStep(3)}
                  disabled={sending}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !templateId || selectedIds.size === 0}
                  style={{
                    padding: '10px 28px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor:
                      sending || !templateId || selectedIds.size === 0
                        ? 'not-allowed'
                        : 'pointer',
                    background:
                      sending || !templateId || selectedIds.size === 0
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color:
                      sending || !templateId || selectedIds.size === 0 ? '#475569' : '#fff',
                    border: 'none',
                  }}
                >
                  {sending
                    ? `Sending to ${selectedIds.size}… (can take several minutes)`
                    : `🚀 Send to ${selectedIds.size} contact(s)`}
                </button>
              </div>
            </section>
          )}

          {/* ===== STEP 5: Done (Phase 05 plan 05-03 Task 2) ===== */}
          {step === 5 && (
            <section style={{ padding: '24px 8px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <CheckCircleIcon
                  style={{
                    width: 64,
                    height: 64,
                    color: '#10b981',
                    margin: '0 auto 16px',
                  }}
                />
                <h3
                  style={{
                    color: '#f1f5f9',
                    fontSize: '22px',
                    fontWeight: 700,
                    margin: '0 0 4px',
                  }}
                >
                  Your AI-personalized campaign is live! ✅
                </h3>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                  Step 5 of 5
                </p>
              </div>

              {sendResult && (
                <div
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    color: '#d1fae5',
                    fontSize: '14px',
                    lineHeight: 1.7,
                  }}
                >
                  <ul style={{ margin: 0, paddingLeft: 22 }}>
                    <li>
                      📨 Sent: <strong style={{ color: '#10b981' }}>{sendResult.sent}</strong>
                    </li>
                    <li>
                      ❌ Failed:{' '}
                      <strong style={{ color: sendResult.failed > 0 ? '#fbbf24' : '#10b981' }}>
                        {sendResult.failed}
                      </strong>
                    </li>
                    <li>
                      🧠 AI personalization:{' '}
                      <strong style={{ color: '#a5b4fc' }}>{sendResult.personalized}</strong>{' '}
                      succeeded,{' '}
                      <strong
                        style={{
                          color: sendResult.personalizeFailures > 0 ? '#fbbf24' : '#94a3b8',
                        }}
                      >
                        {sendResult.personalizeFailures}
                      </strong>{' '}
                      used fallback
                    </li>
                    <li>
                      💰 Cost:{' '}
                      <strong style={{ color: '#fbbf24' }}>
                        ${sendResult.cost.totalCostUSD.toFixed(4)}
                      </strong>{' '}
                      (Claude AI + web_search + Resend)
                    </li>
                    <li style={{ color: '#94a3b8', fontSize: '12px' }}>
                      Claude input tokens: {sendResult.cost.claudeInputTokens} · output:{' '}
                      {sendResult.cost.claudeOutputTokens} · web_search requests:{' '}
                      {sendResult.cost.webSearchRequests} · Resend cost: $
                      {sendResult.cost.resendCostUSD.toFixed(4)}{' '}
                      {sendResult.cost.resendCostUSD === 0 && '(free tier)'}
                    </li>
                  </ul>

                  {sendResult.failureDetails && sendResult.failureDetails.length > 0 && (
                    <details style={{ marginTop: 16 }}>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: '#fbbf24',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        Show {sendResult.failureDetails.length} failure(s)
                      </summary>
                      <ul
                        style={{
                          marginTop: 8,
                          paddingLeft: 22,
                          color: '#fde68a',
                          fontSize: '12px',
                          lineHeight: 1.6,
                        }}
                      >
                        {sendResult.failureDetails.map((f, i) => (
                          <li key={i}>
                            <strong>{f.email}:</strong> {f.error}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  marginTop: 24,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => {
                    onClose();
                    navigate('/contacts');
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Go see your contacts →
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setSendResult(null);
                    setPreviewResult(null);
                    setPreviewError(null);
                    setSendError(null);
                    setConfirmedLargeBatch(false);
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  Send another campaign
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
