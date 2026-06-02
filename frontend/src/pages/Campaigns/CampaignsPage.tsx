import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MegaphoneIcon,
  PlusIcon,
  EnvelopeIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  XMarkIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import CampaignWizard from '../../components/CampaignWizard';
import { EditCampaignModal } from '../../components/EditCampaignModal';
import { CampaignsHelpGuide } from '../../components/CampaignsHelpGuide';
import { PendingReviewQueue } from '../../components/PendingReviewQueue';
import { useTheme } from '../../contexts/ThemeContext';
import { apolloApi, emailTemplatesApi } from '../../services/api';

// Phase 06 plan 06-05: mirrors backend/src/routes/apollo.ts:73-76 VALID_STREAMS — the 9 real prod streams.
// If a contact arrives with a stream value NOT in this set, the Apollo Campaign click handler
// routes it to 'Other' to avoid silent mis-mapping. BLOCKER 1+3 guard.
const VALID_STREAMS_FRONTEND = new Set([
  'NetSuite',
  'AI/ML',
  'Cloud/DevOps',
  'Cybersecurity',
  'Data/Analytics',
  'Mobile',
  'Enterprise/ERP',
  'Staffing/HR',
  'Other',
]);

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social';
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
  subject?: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  scheduledDate?: string;
  createdAt: string;
  createdBy: string;
}

interface Company {
  id: string;
  name: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const { gradients } = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ id: string; sent: number; total: number } | null>(null);
  // Phase 06 plan 06-05: view toggle + Apollo Campaign staging state
  const [view, setView] = useState<'campaigns' | 'pendingReview'>('campaigns');
  const [stagingQueue, setStagingQueue] = useState(false);
  const [stagingStreams, setStagingStreams] = useState<{ done: number; total: number; current: string | null }>({
    done: 0,
    total: 0,
    current: null,
  });
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);

  useEffect(() => {
    loadCampaigns();
    // Auto-open wizard if coming from follow-up
    const params = new URLSearchParams(window.location.search);
    if (params.get('followup') === 'true') {
      setShowCreateModal(true);
      // Clean URL
      window.history.replaceState({}, '', '/campaigns');
    }
  }, []);

  const loadCampaigns = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');

      if (!token) {
        // Not authenticated — redirect to login
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${apiUrl}/api/campaigns`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expired or invalid — clear and redirect to login
        localStorage.removeItem('crmToken');
        localStorage.removeItem('crmUser');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      // Map API data to component format — guard against missing data
      const campaignList = Array.isArray(data?.campaigns) ? data.campaigns : Array.isArray(data) ? data : [];
      const mappedCampaigns = campaignList.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'email',
        status: c.status ? c.status.toLowerCase() : 'draft',
        subject: c.subject,
        sentCount: c.totalSent || c._count?.emailLogs || 0,
        openedCount: c.totalOpened || 0,
        clickedCount: c.totalClicked || 0,
        convertedCount: 0,
        scheduledDate: c.scheduledDate,
        createdAt: c.createdAt,
        createdBy: 'Current User',
      }));

      setCampaigns(mappedCampaigns);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
      setIsLoading(false);
    }
  };

  const handleSendNow = async (e: React.MouseEvent, campaignId: string) => {
    e.stopPropagation();
    if (!window.confirm('Send this campaign now to all contacts?')) return;
    setSendingCampaignId(campaignId);
    setSendResult(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setSendResult({ id: campaignId, sent: data.sent, total: data.total });
        loadCampaigns();
      } else {
        alert(data.error || 'Failed to send campaign');
      }
    } catch {
      alert('Failed to send campaign');
    } finally {
      setSendingCampaignId(null);
    }
  };

  // Phase 06 plan 06-05: Apollo Campaign button — fetch unsent Apollo contacts, group by stream,
  // per-stream personalize+queue via apolloApi.sendPersonalizedCampaign({requireReview:true}),
  // then auto-switch view to 'pendingReview' so Rajesh works the queue immediately.
  async function handleApolloCampaignClick() {
    try {
      setStagingQueue(true);
      setStagingStreams({ done: 0, total: 0, current: null });

      // 1. Fetch unsent Apollo contacts
      const { contacts, total } = await apolloApi.unsentContacts();

      if (total === 0) {
        alert('No unsent Apollo contacts. Run Apollo import first to add new contacts.');
        return;
      }

      // 2. Hard cap at 200 + N>50 single confirmation
      const HARD_CAP = 200;
      const LARGE_CONFIRM = 50;
      let toProcess = contacts;
      if (total > HARD_CAP) {
        const ok = window.confirm(
          `${total} unsent contacts found. This will process the first ${HARD_CAP} in this batch. Continue?`,
        );
        if (!ok) return;
        toProcess = contacts.slice(0, HARD_CAP);
      } else if (total > LARGE_CONFIRM) {
        const ok = window.confirm(
          `${total} contacts will be personalized via Claude (~$${(total * 0.069).toFixed(2)} estimated). Continue?`,
        );
        if (!ok) return;
      }

      // 3. Group contacts by stream — route invalid stream values to 'Other' per VALID_STREAMS_FRONTEND guard.
      const byStream = new Map<string, typeof toProcess>();
      for (const c of toProcess) {
        let stream = c.suggestedStream || c.stream || 'Other';
        if (!VALID_STREAMS_FRONTEND.has(stream)) {
          // BLOCKER 3 guard — a contact with a rogue stream value gets routed to 'Other'
          // rather than silently mis-mapping. Phase 6 only ships templates for the 9 real prod streams.
          // eslint-disable-next-line no-console
          console.warn(
            `[Apollo Campaign] Contact ${c.id} has stream "${stream}" NOT in VALID_STREAMS — routing to Other`,
          );
          stream = 'Other';
        }
        if (!byStream.has(stream)) byStream.set(stream, []);
        byStream.get(stream)!.push(c);
      }

      // Defensive assertion — every key in byStream is in VALID_STREAMS_FRONTEND
      const invalidKeys = Array.from(byStream.keys()).filter((s) => !VALID_STREAMS_FRONTEND.has(s));
      if (invalidKeys.length > 0) {
        throw new Error(`Internal error: byStream contains invalid stream keys: ${invalidKeys.join(', ')}`);
      }

      // 4. Fetch the per-stream EmailTemplate for each group, then dispatch one call per group
      const streamNames = Array.from(byStream.keys());
      setStagingStreams({ done: 0, total: streamNames.length, current: null });

      for (let i = 0; i < streamNames.length; i++) {
        const streamName = streamNames[i];
        setStagingStreams({ done: i, total: streamNames.length, current: streamName });
        const group = byStream.get(streamName)!;

        // Look up the Stream:<name> template via emailTemplatesApi.findByCategory.
        // NO-SPACE format matches prod DB email_templates.category values written by
        // `seed.category = `Stream:${seed.stream}`` at stream-templates.ts:102.
        let template = await emailTemplatesApi.findByCategory('Stream:' + streamName);

        // Fall back to Stream:Other if the requested stream has no template
        if (!template && streamName !== 'Other') {
          template = await emailTemplatesApi.findByCategory('Stream:Other');
        }

        if (!template?.id) {
          // Surface a soft error: skip this stream, keep going.
          // eslint-disable-next-line no-console
          console.error(`[Apollo Campaign] No template found for Stream:${streamName} or Stream:Other`);
          continue;
        }

        // 5. Dispatch the per-stream personalize+queue call
        await apolloApi.sendPersonalizedCampaign({
          contactIds: group.map((c) => c.id),
          templateId: template.id,
          suggestedStream: streamName,
          requireReview: true,
          confirmedLargeBatch: group.length > LARGE_CONFIRM,
        });
      }

      setStagingStreams({ done: streamNames.length, total: streamNames.length, current: null });

      // 6. Auto-switch to Pending Review tab and bump refresh key
      setView('pendingReview');
      setPendingRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(`Apollo Campaign staging failed: ${err?.message || 'unknown error'}`);
    } finally {
      setStagingQueue(false);
    }
  }

  const filteredCampaigns = filterStatus === 'all'
    ? campaigns
    : campaigns.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border-default)]',
      scheduled: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      active: 'bg-green-500/15 text-green-400 border border-green-500/30',
      completed: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      paused: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      sent: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      sending: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    };
    return `px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border border-[var(--border-default)]'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '—';
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="bg-[var(--glass-bg)] rounded-xl h-32"></div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--glass-bg)] border border-[var(--border-default)] rounded-xl h-24"></div>
            ))}
          </div>

          {/* Campaign cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--glass-bg)] rounded-xl shadow-md h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalStats = campaigns.reduce(
    (acc, campaign) => ({
      sent: acc.sent + campaign.sentCount,
      opened: acc.opened + campaign.openedCount,
      clicked: acc.clicked + campaign.clickedCount,
      converted: acc.converted + campaign.convertedCount,
    }),
    { sent: 0, opened: 0, clicked: 0, converted: 0 }
  );

  // Count total campaigns (each campaign = 1 in the count)
  const totalCompanies = campaigns.length;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen overflow-y-auto">
      {/* Header with gradient background */}
      <div className={`mb-8 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl p-8 shadow-xl`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon className="h-10 w-10 text-white" />
              <h1 className="text-4xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
            </div>
            <p className="text-lg text-white/90 font-medium">Create and manage email marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className={`flex items-center gap-2 px-4 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-indigo-500/30`}
              title="Open Campaigns Help Guide"
            >
              <QuestionMarkCircleIcon className="h-5 w-5" />
              Help
            </button>
            <button
              type="button"
              onClick={handleApolloCampaignClick}
              disabled={stagingQueue}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-orange-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Personalize all unsent Apollo contacts and stage them for review"
            >
              <RocketLaunchIcon className="h-5 w-5" />
              {stagingQueue
                ? stagingStreams.total > 0
                  ? `Staging ${stagingStreams.done}/${stagingStreams.total} streams…`
                  : 'Staging…'
                : 'Apollo Campaign'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide border border-indigo-500/30`}
            >
              <PlusIcon className="h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <EnvelopeIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Total Sent</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalStats.sent.toLocaleString()}</span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <EyeIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Opened</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {totalStats.opened.toLocaleString()}
            <span className="text-base font-medium ml-2 text-white/80">
              ({calculateRate(totalStats.opened, totalStats.sent)}%)
            </span>
          </span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <CursorArrowRaysIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Clicked</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {totalStats.clicked.toLocaleString()}
            <span className="text-base font-medium ml-2 text-white/80">
              ({calculateRate(totalStats.clicked, totalStats.sent)}%)
            </span>
          </span>
        </div>

        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} rounded-xl px-5 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-indigo-500/30`}>
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-5 h-5 text-white" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">Total Campaigns</span>
          </div>
          <span className="text-3xl font-bold text-white">{totalCompanies}</span>
        </div>
      </div>

      {/* Phase 06 plan 06-05: View toggle — Campaigns vs Pending Review */}
      <div className="mb-4 flex gap-2 flex-wrap border-b border-[var(--border-default)] pb-2">
        <button
          type="button"
          onClick={() => setView('campaigns')}
          className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ease-in-out capitalize tracking-wide ${
            view === 'campaigns'
              ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border border-indigo-500/30 shadow-lg`
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-2 border-[var(--border-default)] hover:bg-[var(--glass-hover)]'
          }`}
        >
          Campaigns
        </button>
        <button
          type="button"
          onClick={() => setView('pendingReview')}
          className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ease-in-out capitalize tracking-wide ${
            view === 'pendingReview'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border border-orange-400/30 shadow-lg'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-2 border-[var(--border-default)] hover:bg-[var(--glass-hover)]'
          }`}
        >
          Pending Review
        </button>
      </div>

      {/* Filters with gradient when selected — only when view='campaigns' */}
      {view === 'campaigns' && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ease-in-out capitalize tracking-wide ${
                filterStatus === status
                  ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border border-indigo-500/30 shadow-lg hover:shadow-xl hover:scale-105`
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-2 border-[var(--border-default)] hover:bg-[var(--glass-hover)] hover:border-[var(--border-default)] hover:scale-105 shadow-sm'
              }`}
            >
              {status === 'all' ? 'All Campaigns' : status}
            </button>
          ))}
        </div>
      )}

      {/* Pending Review tab body */}
      {view === 'pendingReview' && (
        <PendingReviewQueue refreshKey={pendingRefreshKey} />
      )}

      {/* Campaigns List */}
      {view === 'campaigns' && (filteredCampaigns.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] rounded-xl shadow-lg border border-[var(--border-default)]">
          <div className="p-12 text-center">
            <MegaphoneIcon className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">No campaigns found</h3>
            <p className="text-[var(--text-secondary)] mb-6 text-lg">
              {filterStatus === 'all'
                ? 'Create your first campaign to get started'
                : `No ${filterStatus} campaigns found`}
            </p>
            {filterStatus === 'all' && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 mx-auto tracking-wide border border-indigo-500/30`}
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Campaign
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-[var(--bg-elevated)] rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 border border-[var(--border-default)]"
              onClick={() => {
                // Navigate to analytics page if campaign has been sent
                if (campaign.sentCount > 0) {
                  navigate(`/campaigns/${campaign.id}/analytics`);
                } else {
                  setSelectedCampaign(campaign);
                  setShowDetailModal(true);
                }
              }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {campaign.name.startsWith('Follow-up:') && (
                        <span className="px-2 py-1 rounded-md text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          FOLLOW-UP
                        </span>
                      )}
                      <h3 className="text-2xl font-bold text-[var(--text-primary)]">{campaign.name}</h3>
                      <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
                      {sendResult?.id === campaign.id && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                          ✓ Sent to {sendResult.sent}/{sendResult.total} contacts
                        </span>
                      )}
                    </div>
                    {campaign.subject && (
                      <p className="text-base text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                        <EnvelopeIcon className="h-5 w-5 inline" />
                        {campaign.subject}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] font-medium">
                      <span>Created {formatDate(campaign.createdAt)}</span>
                      {campaign.scheduledDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4 inline" />
                            Scheduled for {formatDate(campaign.scheduledDate)}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>by {campaign.createdBy}</span>
                    </div>
                  </div>
                  {/* Send Now button — shown for draft/scheduled campaigns */}
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <button
                      onClick={(e) => handleSendNow(e, campaign.id)}
                      disabled={sendingCampaignId === campaign.id}
                      className={`ml-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-semibold text-sm shadow hover:shadow-lg disabled:opacity-60 transition-all whitespace-nowrap`}
                    >
                      {sendingCampaignId === campaign.id ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Send Now
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Campaign Stats */}
                {campaign.sentCount > 0 && (
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-medium uppercase tracking-wider">Sent</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.sentCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Opened</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.openedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Clicked</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.clickedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)] mb-1 font-bold uppercase tracking-wider">Converted</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                          {campaign.convertedCount.toLocaleString()}
                          <span className="text-sm text-[var(--text-secondary)] ml-2 font-medium">
                            ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-[var(--glass-bg)] rounded-full h-3 shadow-inner">
                        <div className="flex h-3 rounded-full overflow-hidden">
                          <div
                            className={`bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.openedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.clickedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                          <div
                            className={`bg-gradient-to-r ${gradients.brand.primary.gradient} shadow-sm`}
                            style={{
                              width: `${calculateRate(campaign.convertedCount, campaign.sentCount)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Campaign Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCampaign(null);
          }}
          navigate={navigate}
        />
      )}

      {/* Create Campaign Wizard */}
      {showCreateModal && (
        <CampaignWizard
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadCampaigns();
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editCampaign && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditCampaign(null);
          }}
          campaignId={editCampaign.id}
          campaignName={editCampaign.name}
          onSuccess={() => {
            loadCampaigns();
          }}
        />
      )}

      {/* Help Guide */}
      {showHelpGuide && (
        <CampaignsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}

// Campaign Detail Modal Component
interface CampaignDetailModalProps {
  campaign: Campaign;
  onClose: () => void;
  navigate: (path: string) => void;
}

function CampaignDetailModal({ campaign, onClose, navigate }: CampaignDetailModalProps) {
  const { gradients } = useTheme();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadCampaignCompanies();
  }, [campaign.id]);

  const loadCampaignCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/${campaign.id}/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load companies');
      }

      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error('Error loading campaign companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]',
      scheduled: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      active: `bg-gradient-to-r ${gradients.semantic.success?.gradient || gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      completed: `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-2 border-transparent`,
      paused: 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]',
    };
    return `px-3 py-1 rounded-full text-xs font-bold shadow-sm ${badges[status] || 'bg-[#12121f] text-[#CBD5E1] border-2 border-[#33335a]'}`;
  };

  const calculateRate = (count: number, total: number) => {
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#161625] rounded-xl shadow-xl border-2 border-[#2a2a44] max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} text-white p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">{campaign.name}</h2>
                <span className={getStatusBadge(campaign.status)}>{campaign.status}</span>
              </div>
              {campaign.subject && (
                <p className="text-lg opacity-90 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  {campaign.subject}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-[#161625] hover:bg-opacity-20 rounded-xl transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Campaign Stats */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Campaign Performance</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Sent</div>
                <div className="text-2xl font-bold">
                  {campaign.sentCount.toLocaleString()}
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Opened</div>
                <div className="text-2xl font-bold">
                  {campaign.openedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.openedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Clicked</div>
                <div className="text-2xl font-bold">
                  {campaign.clickedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.clickedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
              <div className={`inline-flex flex-col items-start p-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg`}>
                <div className="text-xs font-bold uppercase tracking-wider opacity-90 mb-2">Converted</div>
                <div className="text-2xl font-bold">
                  {campaign.convertedCount.toLocaleString()}
                  <span className="text-base font-medium ml-1 opacity-90">
                    ({calculateRate(campaign.convertedCount, campaign.sentCount)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Companies List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <BuildingOfficeIcon className="h-6 w-6" />
                Companies in Campaign
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl border border-indigo-500/30 transition-all shadow-md hover:scale-105"
              >
                <PencilIcon className="h-5 w-5" />
                <span>Edit Companies</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-500`}></div>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border-2 border-red-300 rounded-xl p-4 text-center shadow-md">
                <p className="text-red-600 font-bold">{error}</p>
                <button
                  onClick={loadCampaignCompanies}
                  className="mt-2 text-red-600 hover:text-red-400 font-bold underline"
                >
                  Try Again
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="bg-[#12121f] rounded-xl p-8 text-center shadow-sm">
                <BuildingOfficeIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
                <p className="text-[var(--text-secondary)] font-bold">No companies in this campaign</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-[#161625] border-2 border-[#2a2a44] rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradients.brand.primary.gradient.replace('to-r', 'to-br')} rounded-xl flex items-center justify-center shadow-md`}>
                        <BuildingOfficeIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-bold text-[var(--text-primary)]">{company.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/companies/${company.id}`);
                      }}
                      className={`px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:shadow-lg tracking-wide`}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#2a2a44] p-4 bg-[#12121f]">
          <button
            onClick={onClose}
            className={`w-full px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 tracking-wide`}
          >
            Close
          </button>
        </div>
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <EditCampaignModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          campaignId={campaign.id}
          campaignName={campaign.name}
          onSuccess={() => {
            loadCampaignCompanies();
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
