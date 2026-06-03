// NetSuiteCampaignWizard — tri-mode wizard (NetSuite + Apollo + arthaBuild)
// -----------------------------------------------------------------------------
// Phase 08-02: 3rd mode 'arthabuild' added — opens the same Apollo audience +
// review + send flow as 'apollo' mode but: (a) header label "arthaBuild
// Campaign", (b) pre-fetches the ARTHABUILD ICP preset on mount via
// apolloApi.getIcpPreset('arthabuild') to show the user which Apollo filters
// to use when importing, (c) locks the dispatch stream to 'ArthaBuild' so the
// backend resolves the Stream:ArthaBuild template via the 3-layer fallback
// (Stream:ArthaBuild -> Stream:Other -> hardcoded). All 3 modes share the
// wizard shell; arthabuild diff is intentionally tiny.
//
// Phase 04-03: Apollo Campaign port. This wizard opens from /campaigns header
// in one of two modes via the `initialMode` prop:
//
//   initialMode='netsuite' (default):
//     Mirrors the legacy Send-NetSuite-Campaign one-click flow. Confirms intent,
//     then POSTs /api/campaigns/quick-send (SES one-shot dispatch to all
//     NetSuite-staffing companies).
//
//   initialMode='apollo':
//     New flow for contacts imported via /apollo (Phase 04-02). Fetches the
//     contact list, client-side filters to source==='apollo', groups by stream,
//     lets user pick a stream + which contacts to include, then dispatches via
//     apolloApi.sendCampaign(contactIds, stream) (Resend, 3-layer template
//     fallback handled server-side in backend/src/routes/apollo.ts).
//
// Intentionally LEAN (no AI personalize, no first-contact preview, no audit
// table) — those advanced features come in 04-05. This satisfies REQ-030 +
// REQ-033 (Apollo Campaign button reachable from main /campaigns header,
// dispatches via the wired apolloApi service).
//
// Phase 04-05 ADAPTATION: rather than insert a separate "AI Personalize" step
// (the plan assumed a 4-step wizard that no longer exists post-04-03 rewrite),
// the AI Personalize Preview is rendered ON the Step 2 Review screen for Apollo
// mode ONLY. It's a self-contained block above the Confirm & Send button:
//   - "Generate Preview" button → POST /api/apollo/send-personalized-campaign mode=preview
//   - Renders personalized subject + HTML + cost
//   - Caches per (firstContactId, templateId) — re-click does not re-spend Claude credits
//   - "Skip AI Personalization" link → revert to non-personalized Stream:* template dispatch
//   - Confirm & Send branches: if preview generated AND not skipped → mode='send' on the
//     personalized endpoint; else → existing apolloApi.sendCampaign (non-personalized)
// NetSuite mode is UNCHANGED — no AI Personalize there.
//
// Phase 6 rollback lessons: NO tabs, NO orange, NO auto-switching the page view.
// -----------------------------------------------------------------------------

import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircleIcon,
  XMarkIcon,
  EnvelopeIcon,
  UserGroupIcon,
  PaperAirplaneIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  contactsApi,
  apolloApi,
  campaignsApi,
  ApolloPersonalizedSendRow,
  ApolloPersonalizedPreviewResponse,
  ApolloPersonalizedSendResponse,
  ApolloSearchFilters,
  NetsuiteSubjectOption,
} from '../services/api';

// ===== Types =====

interface Contact {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  source?: string | null;
  customFields?: Record<string, any> | null;
  company?: { id: string; name: string } | null;
}

interface NetSuiteCampaignWizardProps {
  isOpen: boolean;
  // Phase 08-02 — 'arthabuild' added as 3rd mode (arthaBuild marketing campaign).
  initialMode?: 'netsuite' | 'apollo' | 'arthabuild';
  onClose: () => void;
  onSuccess?: () => void;
}

interface SendResult {
  sent: number;
  failed: number;
  total?: number;
  companyCount?: number;
  failureDetails?: Array<{ contactId?: string; email: string | null; error: string }>;
  // Phase 04-08 — scheduled-send fields (present when picker = 5 min / 10 min)
  scheduled?: boolean;
  scheduledAt?: string;
  stagedCount?: number;
}

const APOLLO_FROM_DISPLAY = 'Sara <sara@techcloudpro.com>';
const DEFAULT_STREAM = 'Other';
// Phase 08-02 — arthabuild mode locks the stream to 'ArthaBuild' so the
// backend resolves the Stream:ArthaBuild template seeded in Phase 08-01.
const ARTHABUILD_STREAM = 'ArthaBuild';

// ===== Component =====

export function NetSuiteCampaignWizard({
  isOpen,
  initialMode = 'netsuite',
  onClose,
  onSuccess,
}: NetSuiteCampaignWizardProps) {
  // initialMode drives label + dispatch path; locked at mount so toggling parent
  // state mid-flight can't corrupt an in-progress send. Phase 08-02 widened to
  // accept 'arthabuild' which reuses the Apollo audience+review+send flow.
  const [mode] = useState<'netsuite' | 'apollo' | 'arthabuild'>(initialMode);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Apollo-mode state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStream, setSelectedStream] = useState<string>(DEFAULT_STREAM);

  // Send state (shared)
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  // Phase 04-05 AI Personalize state (Apollo mode only)
  const [streamTemplateId, setStreamTemplateId] = useState<string | null>(null);
  const [streamTemplateError, setStreamTemplateError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<ApolloPersonalizedSendRow | null>(null);
  const [previewCached, setPreviewCached] = useState<boolean>(false);
  const [skipPersonalize, setSkipPersonalize] = useState<boolean>(false);

  // Phase 04-08 — restored 3-option schedule picker (Send Now / 5 min / 10 min).
  // Same state shared across both wizard modes; computeScheduledAt yields null for 'now'
  // (immediate dispatch) or a future Date for the delayed options. The picker renders on
  // Apollo Step 2 below the AI Personalize block AND on NetSuite Step 1 below the confirm text.
  const [scheduleChoice, setScheduleChoice] = useState<'now' | '5min' | '10min'>('now');
  function computeScheduledAt(choice: 'now' | '5min' | '10min'): Date | null {
    if (choice === 'now') return null;
    const t = new Date();
    if (choice === '5min') t.setMinutes(t.getMinutes() + 5);
    if (choice === '10min') t.setMinutes(t.getMinutes() + 10);
    return t;
  }

  // Phase 08-02 — arthabuild reuses the apollo audience/review/send flow, so
  // `isApollo` is true for BOTH 'apollo' and 'arthabuild'. `isArthaBuild`
  // narrows to the arthabuild-only branches (stream lock, ICP preset display,
  // label).
  const isArthaBuild = mode === 'arthabuild';
  const isApollo = mode === 'apollo' || isArthaBuild;
  const campaignLabel = isArthaBuild
    ? 'arthaBuild Campaign'
    : mode === 'apollo'
      ? 'Apollo Campaign'
      : 'NetSuite Campaign';

  // Phase 08-02 — arthabuild ICP preset fetched on mount (display-only help so
  // the user knows what Apollo filters to use when going to /apollo to import).
  const [icpPreset, setIcpPreset] = useState<ApolloSearchFilters | null>(null);

  // Phase 09-01 — "where I left off" resume tracking. Ported from
  // CampaignWizard.tsx (line 85,97,166,1491). Set of contact ids that have
  // received ANY prior campaign send (global across NetSuite + Apollo +
  // arthaBuild). Used to (a) badge contact rows and (b) drive the
  // "Hide already-sent" filter chip. NEVER affects what the user can manually
  // select or what gets dispatched — purely a visual + display-filter layer.
  const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());
  // Default ON — matches Rajesh's resume-from-where-left-off workflow.
  const [hideAlreadySent, setHideAlreadySent] = useState<boolean>(true);

  // Phase 10 — NetSuite subject picker state (netsuite mode ONLY; apollo +
  // arthabuild ignore these). Fetched on mount from /api/campaigns/netsuite-subjects
  // which now merges 5 hardcoded subjects with N DB email_templates rows
  // (category='NetSuite'). Default selection = first option (preserves prior
  // subjectVariant=0 behavior for muscle memory). On Send, the chosen option's
  // source decides whether to dispatch subjectVariant (code) or templateId (db).
  const [subjectOptions, setSubjectOptions] = useState<NetsuiteSubjectOption[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<NetsuiteSubjectOption | null>(null);
  const [subjectOptionsError, setSubjectOptionsError] = useState<string | null>(null);

  // ===== Mount: for apollo mode, fetch contacts and client-filter to source==='apollo' =====
  useEffect(() => {
    if (!isOpen) return;

    // Reset state for clean open
    setStep(1);
    setSendError(null);
    setSendResult(null);
    setSelectedIds(new Set());
    // Phase 04-05: clear AI Personalize state on every clean open
    setStreamTemplateId(null);
    setStreamTemplateError(null);
    setPreviewResult(null);
    setPreviewError(null);
    setPreviewCached(false);
    setSkipPersonalize(false);
    // Phase 04-08: reset schedule picker to default 'now' on every clean open
    setScheduleChoice('now');
    // Phase 08-02: reset arthabuild ICP preset on clean open
    setIcpPreset(null);
    // Phase 09-01: reset sent-tracking on clean open (refetched below)
    setSentContactIds(new Set());
    setHideAlreadySent(true);
    // Phase 10: reset NetSuite subject picker on clean open (refetched below
    // ONLY for netsuite mode — apollo/arthabuild don't use this picker).
    setSubjectOptions([]);
    setSelectedSubject(null);
    setSubjectOptionsError(null);

    // Phase 10 — fetch merged 9 NetSuite subject options (5 hardcoded + 4 DB
    // email_templates rows) ONLY in netsuite mode. Auth-gated via apiClient
    // (axios interceptor adds Bearer token). On error: surface inline so Rajesh
    // sees what went wrong, but DON'T block — fallback default = first hardcoded
    // option (subjectVariant=0) which is the legacy behavior.
    if (mode === 'netsuite') {
      (async () => {
        try {
          const data = await campaignsApi.getNetsuiteSubjects();
          const opts = Array.isArray(data?.subjects) ? data.subjects : [];
          setSubjectOptions(opts);
          if (opts.length > 0) setSelectedSubject(opts[0]);
        } catch (err: any) {
          console.error('[NetSuiteCampaignWizard] netsuite-subjects fetch failed', err);
          setSubjectOptionsError(err?.response?.data?.error || err?.message || 'Failed to load subject options');
        }
      })();
    }

    // Phase 09-01 — fetch contacts that have received ANY prior campaign send.
    // Used to render "Sent" badges + drive the "Hide already-sent" filter chip.
    // Auth-gated (relative URL → same VITE_API_URL pattern as other fetches in
    // this wizard's parent app). Silent on 401 / network error — badges just
    // won't show; wizard still works fully.
    (async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('crmToken');
        const res = await fetch(`${apiUrl}/api/campaigns/sent-contact-ids`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSentContactIds(new Set<string>(data.sentContactIds || []));
        }
      } catch {
        /* silent — badges just won't show, no blocker */
      }
    })();

    // Phase 08-02 — arthabuild mode locks stream to 'ArthaBuild' so backend
    // resolves Stream:ArthaBuild template seeded in Phase 08-01.
    if (isArthaBuild) setSelectedStream(ARTHABUILD_STREAM);

    if (!isApollo) return; // netsuite mode has no audience step — skip

    let cancelled = false;
    (async () => {
      setLoadingContacts(true);
      setContactsError(null);
      try {
        // Backend /api/contacts doesn't filter by source — fetch a wide page
        // and client-filter. Apollo imports are typically small batches.
        const data = await contactsApi.getAll({ limit: 500 });
        if (cancelled) return;
        const all: Contact[] = Array.isArray(data?.contacts) ? data.contacts : [];
        // Phase 08-02 — arthabuild mode additionally filters to contacts with
        // customFields.stream === 'ArthaBuild' so the user only sees the
        // arthaBuild-tagged audience. apollo mode keeps the broader filter.
        const apolloOnly = all.filter((c) => {
          if ((c.source || '').toLowerCase() !== 'apollo') return false;
          if (isArthaBuild) {
            const s = (c.customFields?.stream as string | undefined) || '';
            return s === ARTHABUILD_STREAM;
          }
          return true;
        });
        setContacts(apolloOnly);
        // Pre-tick all (user can deselect)
        setSelectedIds(new Set(apolloOnly.map((c) => c.id)));
      } catch (err: any) {
        if (cancelled) return;
        console.error('[NetSuiteCampaignWizard] fetch contacts failed', err);
        setContactsError(err?.message || 'Failed to load Apollo contacts');
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();

    // Phase 08-02 — fetch ICP preset for arthabuild mode (display-only).
    // Failure falls back silently to null — the wizard still works without it.
    if (isArthaBuild) {
      (async () => {
        try {
          const data = await apolloApi.getIcpPreset('arthabuild');
          if (!cancelled) setIcpPreset(data.preset);
        } catch (err) {
          if (!cancelled) {
            console.warn('[NetSuiteCampaignWizard] ICP preset fetch failed', err);
            setIcpPreset(null);
          }
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, isApollo, isArthaBuild]);

  // Derive available streams from loaded contacts (read from customFields.stream
  // if set by 04-01 importer; falls back to 'Other'). Memoized so the dropdown
  // doesn't churn on every render.
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    for (const c of contacts) {
      const s = (c.customFields?.stream as string | undefined) || DEFAULT_STREAM;
      set.add(s);
    }
    if (set.size === 0) set.add(DEFAULT_STREAM);
    return Array.from(set).sort();
  }, [contacts]);

  // Auto-select first available stream when contacts arrive
  useEffect(() => {
    if (availableStreams.length > 0 && !availableStreams.includes(selectedStream)) {
      setSelectedStream(availableStreams[0]);
    }
  }, [availableStreams, selectedStream]);

  // Phase 04-05: changing the stream invalidates any prior preview (different template).
  // Also clears the previously-resolved templateId so the next Step 2 entry re-resolves.
  useEffect(() => {
    setPreviewResult(null);
    setPreviewError(null);
    setPreviewCached(false);
    setStreamTemplateId(null);
    setStreamTemplateError(null);
    setSkipPersonalize(false);
  }, [selectedStream]);

  // Phase 04-05: resolve the Stream:<x> template id once we enter Step 2 (Apollo mode).
  // 3-layer fallback handled server-side. 404 → AI Preview block hides itself.
  useEffect(() => {
    if (!isOpen || !isApollo || step !== 2 || streamTemplateId || streamTemplateError) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apolloApi.getStreamTemplate(selectedStream);
        if (cancelled) return;
        setStreamTemplateId(data.template.id);
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setStreamTemplateError(
            'No Stream:* template seeded for this stream yet — AI Personalize is unavailable. The non-personalized fallback still works.',
          );
        } else {
          setStreamTemplateError(err?.response?.data?.error || err?.message || 'Failed to load template');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isApollo, step, selectedStream, streamTemplateId, streamTemplateError]);

  if (!isOpen) return null;

  // ===== Step 1 helpers (apollo) =====
  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map((c) => c.id)));
  }

  // ===== Phase 04-05: AI Personalize preview (Apollo mode only) =====
  // Generates the personalized email for the FIRST selected contact via Claude + web_search.
  // Cached server-side per (firstContactId, templateId, status='preview') so re-click
  // doesn't re-spend Claude credits.
  async function handleGeneratePreview() {
    if (!streamTemplateId) return;
    if (selectedIds.size === 0) {
      setPreviewError('No contacts selected (go back to Step 1).');
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    setSkipPersonalize(false);
    try {
      const contactIds = Array.from(selectedIds);
      const data = (await apolloApi.sendPersonalizedCampaign({
        contactIds: [contactIds[0]],
        templateId: streamTemplateId,
        mode: 'preview',
      })) as ApolloPersonalizedPreviewResponse;
      setPreviewResult(data.preview);
      setPreviewCached(data.cached);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Preview generation failed.';
      console.error('[NetSuiteCampaignWizard] AI preview failed', err);
      setPreviewError(msg);
    } finally {
      setPreviewing(false);
    }
  }

  // ===== Dispatch =====
  // Branches on AI Personalize state:
  //   - preview generated AND not skipped → personalized send (Claude + web_search per contact)
  //   - otherwise                          → non-personalized Stream:* template dispatch (04-01)
  async function handleSendApollo() {
    if (selectedIds.size === 0) {
      setSendError('Pick at least one contact in Step 1.');
      return;
    }
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const usePersonalized = !!previewResult && !skipPersonalize && !!streamTemplateId;
      // Phase 04-08 — compute scheduledAt from the picker. null = immediate (Send Now).
      const scheduledAt = computeScheduledAt(scheduleChoice);
      const scheduledAtIso = scheduledAt?.toISOString();
      if (usePersonalized) {
        const data = (await apolloApi.sendPersonalizedCampaign({
          contactIds: Array.from(selectedIds),
          templateId: streamTemplateId!,
          mode: 'send',
          ...(scheduledAtIso ? { scheduledAt: scheduledAtIso } : {}),
        })) as ApolloPersonalizedSendResponse;
        setSendResult({
          sent: data.scheduled ? 0 : data.sent,
          failed: data.failed,
          total: selectedIds.size,
          failureDetails: data.failureDetails,
          scheduled: !!data.scheduled,
          scheduledAt: data.scheduledAt,
          stagedCount: data.count,
        });
      } else {
        const data = await apolloApi.sendCampaign(
          Array.from(selectedIds),
          selectedStream,
          scheduledAtIso,
        );
        setSendResult({
          sent: data.scheduled ? 0 : data.sent,
          failed: data.failed,
          total: selectedIds.size,
          failureDetails: data.failureDetails,
          scheduled: !!data.scheduled,
          scheduledAt: data.scheduledAt,
          stagedCount: data.count,
        });
      }
      setStep(3);
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Send failed. Check console for details.';
      console.error('[NetSuiteCampaignWizard] apollo send failed', err);
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleSendNetSuite() {
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      // Phase 04-08 — pass scheduledAt to quick-send so the picker works in NetSuite mode too.
      const scheduledAt = computeScheduledAt(scheduleChoice);
      const scheduledAtIso = scheduledAt?.toISOString();
      // Phase 10 — pass the Rajesh-picked subject. Source decides which field:
      //   source='code' → subjectVariant (numeric index, 0..4 today)
      //   source='db'   → templateId (cuid pointing at email_templates row)
      // If selectedSubject is null (fetch failed / empty), fall back to legacy
      // default behavior (server defaults subjectVariant to 0 = first hardcoded).
      const subjectPayload: Record<string, unknown> = {};
      if (selectedSubject) {
        if (selectedSubject.source === 'db' && selectedSubject.templateId) {
          subjectPayload.templateId = selectedSubject.templateId;
        } else if (selectedSubject.source === 'code' && typeof selectedSubject.index === 'number') {
          subjectPayload.subjectVariant = selectedSubject.index;
        }
      }
      const body: Record<string, unknown> = { ...subjectPayload };
      if (scheduledAtIso) body.scheduledAt = scheduledAtIso;
      const response = await fetch(`${apiUrl}/api/campaigns/quick-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send NetSuite campaign');
      }
      setSendResult({
        sent: data.scheduled ? 0 : data.sent,
        failed: data.failed,
        total: data.total,
        companyCount: data.companyCount,
        scheduled: !!data.scheduled,
        scheduledAt: data.scheduledAt,
        stagedCount: data.scheduled ? data.total : undefined,
      });
      setStep(3);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || 'Send failed. Check console for details.';
      console.error('[NetSuiteCampaignWizard] netsuite send failed', err);
      setSendError(msg);
    } finally {
      setSending(false);
    }
  }

  // ===== Phase 04-08 — Schedule picker (Send Now / 5 min / 10 min) =====
  // Rendered on Apollo Step 2 (below AI Personalize block) AND NetSuite Step 1 (below confirm).
  // Indigo brand only — matches the AI Preview block treatment for visual consistency.
  // 3 fixed options ONLY — intentionally no arbitrary date picker.
  function renderSchedulePicker() {
    const opt: Array<{ key: 'now' | '5min' | '10min'; label: string }> = [
      { key: 'now', label: 'Send Now' },
      { key: '5min', label: 'Send in 5 min' },
      { key: '10min', label: 'Send in 10 min' },
    ];
    return (
      <div
        style={{
          padding: '14px 16px',
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Schedule
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {opt.map(({ key, label }) => {
            const active = scheduleChoice === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setScheduleChoice(key)}
                disabled={sending}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  border: active
                    ? '2px solid #6366f1'
                    : '2px solid rgba(255,255,255,0.08)',
                  background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                  color: active ? '#fff' : '#cbd5e1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {scheduleChoice !== 'now' && (
          <p style={{ color: '#a5b4fc', fontSize: 11, margin: '8px 0 0', lineHeight: 1.5 }}>
            Will dispatch at ~{computeScheduledAt(scheduleChoice)?.toLocaleTimeString()}.
            Sender stays Sara &lt;sara@techcloudpro.com&gt; for all scheduled sends.
          </p>
        )}
      </div>
    );
  }

  // ===== Render =====

  const headerIcon = isApollo ? (
    <RocketLaunchIcon style={{ width: 22, height: 22, color: '#a5b4fc' }} />
  ) : (
    <PaperAirplaneIcon style={{ width: 22, height: 22, color: '#a5b4fc' }} />
  );

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
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {headerIcon}
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>
                {campaignLabel}
              </h2>
              <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>
                {isApollo
                  ? `From: ${APOLLO_FROM_DISPLAY} · Resend dispatch with stream template fallback`
                  : 'One-click send to all NetSuite-staffing companies via AWS SES'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
            }}
            aria-label="Close"
          >
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Step indicator */}
        <div
          style={{
            padding: '14px 24px',
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexWrap: 'wrap',
          }}
        >
          {(isApollo ? ['Audience', 'Review', 'Done'] : ['Confirm', 'Send', 'Done']).map(
            (label, i) => {
              const s = (i + 1) as 1 | 2 | 3;
              const active = s === step;
              const done = s < step;
              return (
                <div
                  key={s}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
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
                  {i < 2 && <span style={{ color: '#334155', marginLeft: 4 }}>›</span>}
                </div>
              );
            },
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* ===== APOLLO STEP 1: Audience ===== */}
          {isApollo && step === 1 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <UserGroupIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, margin: 0 }}>
                  {isArthaBuild
                    ? 'Pick arthaBuild contacts to email'
                    : 'Pick Apollo contacts to email'}
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 16px' }}>
                {isArthaBuild
                  ? `Showing ${contacts.length} contact(s) tagged stream='ArthaBuild' (source='apollo').`
                  : `Showing ${contacts.length} contact(s) imported from Apollo (source='apollo').`}
              </p>

              {/* Phase 08-02 — arthabuild ICP preset banner (display-only).
                  Tells the user which Apollo filters to apply when going to
                  /apollo to import more arthaBuild-tagged contacts. */}
              {isArthaBuild && icpPreset && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 12,
                    color: '#c4b5fd',
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      color: '#94a3b8',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 6,
                    }}
                  >
                    arthaBuild ICP preset (use these on /apollo)
                  </div>
                  {icpPreset.personTitles && icpPreset.personTitles.length > 0 && (
                    <div>
                      <strong>Titles:</strong> {icpPreset.personTitles.join(', ')}
                    </div>
                  )}
                  {icpPreset.organizationKeywordTags &&
                    icpPreset.organizationKeywordTags.length > 0 && (
                      <div>
                        <strong>Keywords:</strong>{' '}
                        {icpPreset.organizationKeywordTags.join(', ')}
                      </div>
                    )}
                  {icpPreset.personLocations && icpPreset.personLocations.length > 0 && (
                    <div>
                      <strong>Locations:</strong> {icpPreset.personLocations.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Stream picker — apollo mode only. arthabuild locks the
                  stream to 'ArthaBuild' so we hide the picker. */}
              {!isArthaBuild && (
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      color: '#94a3b8',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    STREAM (template routing key)
                  </label>
                  <select
                    value={selectedStream}
                    onChange={(e) => setSelectedStream(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#f1f5f9',
                      fontSize: 14,
                    }}
                  >
                    {availableStreams.map((s) => (
                      <option key={s} value={s} style={{ background: '#0f172a' }}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <p style={{ color: '#64748b', fontSize: 11, margin: '6px 0 0' }}>
                    Backend resolves: Stream:{selectedStream} → Stream:Other → hardcoded fallback
                  </p>
                </div>
              )}

              {loadingContacts ? (
                <div style={{ color: '#64748b', fontSize: 14, padding: '20px 0' }}>
                  Loading Apollo contacts…
                </div>
              ) : contactsError ? (
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8,
                    color: '#fca5a5',
                    fontSize: 13,
                  }}
                >
                  ❌ {contactsError}
                </div>
              ) : contacts.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 8,
                    color: '#fbbf24',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {isArthaBuild ? (
                    <>
                      No existing arthaBuild-tagged contacts yet — go to{' '}
                      <strong>/apollo</strong> and import contacts using the ICP preset above
                      (apply <code>stream='ArthaBuild'</code> on import).
                    </>
                  ) : (
                    <>
                      No Apollo-source contacts found. Go to <strong>/apollo</strong> and import
                      some first.
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Phase 09-01 — "Hide already-sent" filter chip. Default ON
                      to match Rajesh's resume-from-where-left-off workflow.
                      VISUAL-ONLY: filters what's rendered in the contact list
                      below; does NOT mutate `contacts`, `selectedIds`, or any
                      dispatch payload. Manually-selected contacts stay
                      selected even when hidden. */}
                  {sentContactIds.size > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setHideAlreadySent((v) => !v)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 14px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: hideAlreadySent
                            ? '1px solid rgba(139,92,246,0.45)'
                            : '1px solid rgba(255,255,255,0.12)',
                          background: hideAlreadySent
                            ? 'rgba(139,92,246,0.18)'
                            : 'rgba(255,255,255,0.05)',
                          color: hideAlreadySent ? '#c4b5fd' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {hideAlreadySent
                          ? `✓ Hiding ${
                              contacts.filter((c) => sentContactIds.has(c.id)).length
                            } already-sent`
                          : 'Show all'}
                      </button>
                      <span style={{ color: '#64748b', fontSize: 11 }}>
                        Resume from where you left off — already-sent contacts hidden by default.
                      </span>
                    </div>
                  )}

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 8,
                      marginBottom: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    <span style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 600 }}>
                      Select all {contacts.length}
                    </span>
                  </label>

                  <div
                    style={{
                      maxHeight: 320,
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                    }}
                  >
                    {/* Phase 09-01 — filter only the RENDERED list. `contacts`,
                        `selectedIds`, and dispatch logic are untouched. */}
                    {contacts
                      .filter((c) => !hideAlreadySent || !sentContactIds.has(c.id))
                      .map((c) => {
                        const checked = selectedIds.has(c.id);
                        const isSent = sentContactIds.has(c.id);
                        const displayName =
                          [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)';
                        return (
                          <label
                            key={c.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
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
                              <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>
                                {displayName}
                                {/* Phase 09-01 — "Sent" badge (purple, mirrors
                                    CampaignWizard.tsx:1520 pattern). */}
                                {isSent && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      marginLeft: 8,
                                      padding: '1px 7px',
                                      borderRadius: 4,
                                      background: 'rgba(139,92,246,0.25)',
                                      color: '#c4b5fd',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      verticalAlign: 'middle',
                                    }}
                                  >
                                    Sent
                                  </span>
                                )}
                                {c.company?.name && (
                                  <span
                                    style={{ color: '#64748b', fontWeight: 400, marginLeft: 8 }}
                                  >
                                    · {c.company.name}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  color: '#94a3b8',
                                  fontSize: 12,
                                  marginTop: 2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {c.email || '(no email)'}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>

                  <p style={{ color: '#64748b', fontSize: 12, margin: '12px 0 0' }}>
                    {selectedIds.size} of {contacts.length} selected
                    {hideAlreadySent && sentContactIds.size > 0 && (() => {
                      const hidden = contacts.filter((c) => sentContactIds.has(c.id)).length;
                      return hidden > 0 ? (
                        <span style={{ color: '#94a3b8', marginLeft: 6 }}>
                          ({hidden} already-sent hidden)
                        </span>
                      ) : null;
                    })()}
                  </p>
                </>
              )}

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                    background:
                      selectedIds.size === 0
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: selectedIds.size === 0 ? '#475569' : '#fff',
                    border: 'none',
                  }}
                >
                  Review →
                </button>
              </div>
            </section>
          )}

          {/* ===== APOLLO STEP 2: Review & Send ===== */}
          {isApollo && step === 2 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <EnvelopeIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, margin: 0 }}>
                  Review &amp; Send
                </h3>
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8,
                  color: '#a5b4fc',
                  fontSize: 13,
                  marginBottom: 16,
                  lineHeight: 1.5,
                }}
              >
                Sending to <strong>{selectedIds.size} Apollo contact(s)</strong> on stream{' '}
                <strong>{selectedStream}</strong> via Resend.<br />
                From: {APOLLO_FROM_DISPLAY}<br />
                Backend resolves template via 3-layer fallback (Stream:{selectedStream} →
                Stream:Other → hardcoded).
              </div>

              {/* ===== Phase 04-05: AI Personalize Preview block ===== */}
              {/* Renders ONLY when a Stream:* template is found. 404 → block hides (block uses
                  the lean non-personalized Stream:* path via existing apolloApi.sendCampaign). */}
              {streamTemplateError ? (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.18)',
                    borderRadius: 8,
                    color: '#fbbf24',
                    fontSize: 12,
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  ⚠️ {streamTemplateError}
                </div>
              ) : streamTemplateId ? (
                <div
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <SparklesIcon style={{ width: 16, height: 16, color: '#c4b5fd' }} />
                    <h4
                      style={{
                        color: '#f1f5f9',
                        fontSize: 14,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      AI Personalize Preview
                    </h4>
                  </div>
                  <p
                    style={{
                      color: '#94a3b8',
                      fontSize: 12,
                      margin: '0 0 12px',
                      lineHeight: 1.5,
                    }}
                  >
                    Generate a Claude + web_search personalized email for your first selected
                    contact. Cost ~$0.01-$0.07. Re-clicking re-uses the cached preview (no
                    additional credit spend).
                  </p>

                  {!previewResult && !previewError && (
                    <button
                      onClick={handleGeneratePreview}
                      disabled={previewing || !streamTemplateId || selectedIds.size === 0}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: previewing
                          ? 'rgba(255,255,255,0.06)'
                          : 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                        color: previewing ? '#475569' : '#fff',
                        border: 'none',
                        cursor: previewing ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {previewing ? 'Generating preview…' : '✨ Generate Preview'}
                    </button>
                  )}

                  {previewError && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '10px 12px',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 6,
                        color: '#fca5a5',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      ❌ {previewError}
                      <div style={{ marginTop: 6 }}>
                        <button
                          onClick={handleGeneratePreview}
                          disabled={previewing}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#a5b4fc',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 0,
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  )}

                  {previewResult && (
                    <div>
                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(16,185,129,0.06)',
                          border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: 6,
                          color: '#d1fae5',
                          fontSize: 12,
                          marginBottom: 10,
                        }}
                      >
                        ✓ Preview generated{previewCached ? ' (cache hit — no credit re-spend)' : ''}.
                        Cost so far: ~${Number(previewResult.claudeCostUSD || 0).toFixed(4)} ·
                        Tokens: {previewResult.claudeInputTokens}/{previewResult.claudeOutputTokens} ·
                        Web searches: {previewResult.webSearchUses}
                        {previewResult.aiWarning && (
                          <>
                            <br />
                            <span style={{ color: '#fbbf24' }}>
                              ⚠ {previewResult.aiWarning} — per-stream fallback tokens used.
                            </span>
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Subject
                        </div>
                        <div style={{ color: '#f1f5f9', fontSize: 13, marginBottom: 10 }}>
                          {previewResult.subject}
                        </div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Rendered HTML (first contact)
                        </div>
                        <div
                          style={{
                            background: '#fff',
                            color: '#0f172a',
                            padding: 12,
                            borderRadius: 4,
                            maxHeight: 260,
                            overflowY: 'auto',
                            fontSize: 12,
                          }}
                          dangerouslySetInnerHTML={{ __html: previewResult.renderedBody }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          onClick={handleGeneratePreview}
                          disabled={previewing}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#a5b4fc',
                            cursor: previewing ? 'not-allowed' : 'pointer',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          {previewing ? '…' : '↻ Regenerate'}
                        </button>
                        <button
                          onClick={() => setSkipPersonalize(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 0,
                          }}
                        >
                          Skip AI Personalization (send Stream:{selectedStream} as-is)
                        </button>
                        {skipPersonalize && (
                          <span style={{ color: '#fbbf24', fontSize: 12 }}>
                            AI personalization SKIPPED — non-personalized template will be used.
                            <button
                              onClick={() => setSkipPersonalize(false)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#a5b4fc',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: 12,
                                marginLeft: 8,
                                padding: 0,
                              }}
                            >
                              undo
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    color: '#64748b',
                    fontSize: 12,
                    marginBottom: 16,
                  }}
                >
                  Loading Stream:{selectedStream} template…
                </div>
              )}

              {/* Phase 04-08 — 3-option schedule picker (Send Now / 5 min / 10 min) */}
              {renderSchedulePicker()}

              {sendError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  ❌ {sendError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={() => setStep(1)}
                  disabled={sending}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSendApollo}
                  disabled={sending || selectedIds.size === 0}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: sending || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                    background:
                      sending || selectedIds.size === 0
                        ? 'rgba(255,255,255,0.06)'
                        : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: sending || selectedIds.size === 0 ? '#475569' : '#fff',
                    border: 'none',
                  }}
                >
                  {(() => {
                    const usingPersonalized =
                      !!previewResult && !skipPersonalize && !!streamTemplateId;
                    const isScheduled = scheduleChoice !== 'now';
                    if (sending) {
                      if (isScheduled) {
                        return usingPersonalized
                          ? `Personalizing & scheduling ${selectedIds.size}…`
                          : `Scheduling ${selectedIds.size}…`;
                      }
                      return usingPersonalized
                        ? `Personalizing & sending to ${selectedIds.size}…`
                        : `Sending to ${selectedIds.size}…`;
                    }
                    if (isScheduled) {
                      return usingPersonalized
                        ? `✨ Schedule AI-personalized (${selectedIds.size})`
                        : `🕒 Schedule ${selectedIds.size} contact(s)`;
                    }
                    return usingPersonalized
                      ? `✨ Send AI-personalized to ${selectedIds.size}`
                      : `🚀 Send to ${selectedIds.size} contact(s)`;
                  })()}
                </button>
              </div>
            </section>
          )}

          {/* ===== NETSUITE STEP 1: Confirm ===== */}
          {!isApollo && step === 1 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PaperAirplaneIcon style={{ width: 18, height: 18, color: '#6366f1' }} />
                <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, margin: 0 }}>
                  Send NetSuite Campaign — confirm
                </h3>
              </div>
              <div
                style={{
                  padding: '14px 16px',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 8,
                  color: '#a5b4fc',
                  fontSize: 13,
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                This sends the $2/hr staff-augmentation campaign to <strong>all NetSuite
                companies</strong> in your CRM via AWS SES.<br />
                Endpoint: <code>POST /api/campaigns/quick-send</code><br />
                You will see sent/failed counts on the next step.
              </div>

              {/* Phase 10 — Subject + body picker. Lists 5 hardcoded subjects
                  ([code] body) + N DB email_templates rows ([DB-rich body]) so
                  Rajesh can pick exactly which NetSuite variant to dispatch. */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: 'block',
                    color: '#cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Subject + body variant
                </label>
                {subjectOptionsError && (
                  <div
                    style={{
                      background: 'rgba(251,191,36,0.1)',
                      border: '1px solid rgba(251,191,36,0.3)',
                      color: '#fde68a',
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    ⚠️ {subjectOptionsError} — falling back to default subject.
                  </div>
                )}
                <select
                  value={selectedSubject?.id || ''}
                  onChange={(e) => {
                    const next = subjectOptions.find((o) => o.id === e.target.value);
                    if (next) setSelectedSubject(next);
                  }}
                  disabled={sending || subjectOptions.length === 0}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#e2e8f0',
                    fontSize: 13,
                    cursor: sending || subjectOptions.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {subjectOptions.length === 0 && <option value="">Loading subjects…</option>}
                  {subjectOptions.map((opt) => {
                    const bodyTag = opt.bodySource === 'db-template' ? 'DB-rich body' : 'code body';
                    return (
                      <option key={opt.id} value={opt.id}>
                        {opt.subject} — [{bodyTag}]
                      </option>
                    );
                  })}
                </select>
                {subjectOptions.length > 0 && (
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
                    {subjectOptions.length} option(s) available — {subjectOptions.filter((o) => o.source === 'code').length} hardcoded, {subjectOptions.filter((o) => o.source === 'db').length} from email_templates.
                  </div>
                )}
              </div>

              {/* Phase 04-08 — 3-option schedule picker (Send Now / 5 min / 10 min) */}
              {renderSchedulePicker()}

              {sendError && (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#fca5a5',
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  ❌ {sendError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={onClose}
                  disabled={sending}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNetSuite}
                  disabled={sending}
                  style={{
                    padding: '10px 28px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    background: sending
                      ? 'rgba(255,255,255,0.06)'
                      : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: sending ? '#475569' : '#fff',
                    border: 'none',
                  }}
                >
                  {sending
                    ? scheduleChoice !== 'now'
                      ? 'Scheduling NetSuite campaign…'
                      : 'Sending NetSuite campaign…'
                    : scheduleChoice !== 'now'
                      ? '🕒 Schedule NetSuite Campaign'
                      : '🚀 Send NetSuite Campaign'}
                </button>
              </div>
            </section>
          )}

          {/* ===== DONE (both modes) ===== */}
          {step === 3 && sendResult && (
            <section style={{ padding: '16px 8px' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <CheckCircleIcon
                  style={{ width: 56, height: 56, color: '#10b981', margin: '0 auto 12px' }}
                />
                <h3 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>
                  {sendResult.scheduled ? `${campaignLabel} scheduled!` : `${campaignLabel} sent!`}
                </h3>
                {sendResult.scheduled && sendResult.scheduledAt && (
                  <p style={{ color: '#a5b4fc', fontSize: 13, margin: '4px 0 0' }}>
                    Will dispatch at{' '}
                    {new Date(sendResult.scheduledAt).toLocaleTimeString()} via Sara.
                  </p>
                )}
              </div>

              <div
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 12,
                  padding: '18px 22px',
                  color: '#d1fae5',
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                  {sendResult.scheduled ? (
                    <li>
                      🕒 Scheduled:{' '}
                      <strong style={{ color: '#a5b4fc' }}>
                        {sendResult.stagedCount ?? sendResult.total ?? 0}
                      </strong>{' '}
                      email(s) staged for delivery
                    </li>
                  ) : (
                    <li>
                      📨 Sent: <strong style={{ color: '#10b981' }}>{sendResult.sent}</strong>
                    </li>
                  )}
                  <li>
                    ❌ Failed:{' '}
                    <strong style={{ color: sendResult.failed > 0 ? '#fbbf24' : '#10b981' }}>
                      {sendResult.failed}
                    </strong>
                  </li>
                  {sendResult.total !== undefined && (
                    <li>
                      📊 Total attempted: <strong>{sendResult.total}</strong>
                    </li>
                  )}
                  {sendResult.companyCount !== undefined && (
                    <li>
                      🏢 Companies reached: <strong>{sendResult.companyCount}</strong>
                    </li>
                  )}
                </ul>

                {sendResult.failureDetails && sendResult.failureDetails.length > 0 && (
                  <details style={{ marginTop: 14 }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        color: '#fbbf24',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      Show {sendResult.failureDetails.length} failure(s)
                    </summary>
                    <ul
                      style={{
                        marginTop: 8,
                        paddingLeft: 22,
                        color: '#fde68a',
                        fontSize: 12,
                        lineHeight: 1.6,
                      }}
                    >
                      {sendResult.failureDetails.map((f, i) => (
                        <li key={i}>
                          <strong>{f.email || '(no email)'}:</strong> {f.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                  marginTop: 22,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Done
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetSuiteCampaignWizard;
