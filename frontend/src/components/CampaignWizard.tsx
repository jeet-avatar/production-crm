import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselect?: { subject: string; campaignType: string } | null;
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
  industry?: string;
  vertical?: string;  // normalized backend vertical
  _count: { contacts: number };
  contacts?: Contact[];
}

interface Vertical {
  name: string;
  count: number;
  totalContacts: number;
}

interface StaffingTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  id?: string;
  color?: string;
  subjects?: string[];
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

export function CampaignWizard({ isOpen, onClose, onSuccess, preselect }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'persuasive'>('professional');
  const [generating, setGenerating] = useState(false);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]); // current page full data
  const [allCompaniesSlim, setAllCompaniesSlim] = useState<any[]>([]); // all companies, no contacts
  const [stableSortedCompanies, setStableSortedCompanies] = useState<any[]>([]); // fixed page order, computed once
  const [companySentCounts, setCompanySentCounts] = useState<Record<string, number>>({});
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
  const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());
  const [sendSpeed, setSendSpeed] = useState<number>(5); // minutes between emails
  const [showConfirm, setShowConfirm] = useState(false);
  const [sendCampaignId, setSendCampaignId] = useState<string>('');
  const [sendProgress, setSendProgress] = useState<{ status: string; sent: number; failed: number; total: number; remaining: number; nextSendInSeconds: number } | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>('all');
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [companyPage, setCompanyPage] = useState(1);
  const [emailFolder, setEmailFolder] = useState<'with-email' | 'no-email'>('with-email');
  const [apolloEnriching, setApolloEnriching] = useState(false);
  const [apolloResult, setApolloResult] = useState<{ enriched: any[]; notFound: any[]; creditsUsed: number } | null>(null);
  const [apolloModalOpen, setApolloModalOpen] = useState(false);
  const [apolloSelected, setApolloSelected] = useState<Set<string>>(new Set()); // contactIds to save
  const [apolloEnrichedCompanyIds, setApolloEnrichedCompanyIds] = useState<Set<string>>(new Set()); // green highlight
  const [showApolloPage, setShowApolloPage] = useState(false); // Apollo saved contacts page
  const [apolloSavedContacts, setApolloSavedContacts] = useState<any[]>([]); // all Apollo-saved contacts from DB
  const [apolloPageSelected, setApolloPageSelected] = useState<Set<string>>(new Set()); // selected contactIds on Apollo page
  const [apolloPageLoading, setApolloPageLoading] = useState(false);
  const [loadingMoreCompanies, setLoadingMoreCompanies] = useState(false);
  const [totalCompanyCount, setTotalCompanyCount] = useState(0);

  const COMPANIES_PER_PAGE = 50;
  const INTERNAL_COMPANY_REGEX = /techcloudpro/i;
  const INTERNAL_EMAILS = new Set(['raj.manohran@gmail.com', 'jeetnair.in@gmail.com', 'jm@techcloudpro.com']);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Email validation — only contacts with valid emails are selectable
  const isValidEmail = (email?: string) => !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isSelectable = (contact: Contact) => isValidEmail(contact.email) && !sentContactIds.has(contact.id);

  // Normalize industry to clean vertical (mirrors backend normalizeVertical)
  const getVertical = (industry?: string | null): string => {
    if (!industry) return 'Uncategorized';
    const l = industry.toLowerCase().trim();
    if (/saas|software|app dev|enterprise software|productivity/i.test(l)) return 'Software & SaaS';
    if (/cyber|security|identity|infosec/i.test(l)) return 'Cybersecurity';
    if (/ai|ml|machine learning|data science|big data|data analytics|data eng|database/i.test(l)) return 'AI & Data';
    if (/cloud|devops|platform|hosting|infrastructure/i.test(l)) return 'Cloud & Infrastructure';
    if (/health|medical|pharma|biotech|hospital|wellness|diagnostics/i.test(l)) return 'Healthcare & Life Sciences';
    if (/fintech|banking|finance|insurance|payment|lending|mortgage/i.test(l)) return 'Financial Services';
    if (/retail|e-?commerce|consumer goods|beauty|fashion|apparel|food.*bev|restaurant|grocery/i.test(l)) return 'Retail & Consumer';
    if (/manufactur|industrial|automotive|aerospace|construction|engineering|energy|chemical/i.test(l)) return 'Manufacturing & Industrial';
    if (/educat|edtech|e-?learn|training|school/i.test(l)) return 'Education';
    if (/consult|professional serv|staffing|recruit|hr |human resource/i.test(l)) return 'Consulting & Staffing';
    if (/media|entertain|gaming|music|publish|advertis|marketing|pr\b/i.test(l)) return 'Media & Marketing';
    if (/telecom|network|iot|semiconductor|hardware|electronics/i.test(l)) return 'Telecom & Hardware';
    if (/logistics|transport|supply chain|shipping|warehouse/i.test(l)) return 'Logistics & Supply Chain';
    if (/non-?profit|ngo|social|civic|charity|foundation/i.test(l)) return 'Non-Profit';
    if (/real estate|property|housing/i.test(l)) return 'Real Estate';
    if (/legal|law|government|public/i.test(l)) return 'Legal & Government';
    if (/it |it$|information tech|tech serv|tech$|technology$/i.test(l)) return 'IT Services';
    if (/travel|hospitality|hotel|tourism|airline/i.test(l)) return 'Travel & Hospitality';
    return 'Other';
  };

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

  // Poll send progress every 10 seconds (Step 4)
  useEffect(() => {
    if (!sendCampaignId || sendProgress?.status === 'complete') return;
    const token = localStorage.getItem('crmToken');
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/campaigns/${sendCampaignId}/send-progress`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSendProgress(data);
        }
      } catch { /* ignore */ }
    };
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [sendCampaignId, sendProgress?.status]);

  // Reset to page 1 when search changes
  useEffect(() => { setCompanyPage(1); }, [companySearch]);

  // Save last visited page to localStorage whenever user navigates in Step 2
  useEffect(() => {
    if (step === 2 && companyPage > 1) {
      localStorage.setItem('bm_last_campaign_page', String(companyPage));
    }
  }, [step, companyPage]);

  // Compute stable page order — waits for ALL batches to finish loading + sentCounts loaded.
  // loadingMoreCompanies=false means all 16k+ companies are in allCompaniesSlim.
  // Freezes after full computation so pages don't shuffle mid-session.
  useEffect(() => {
    if (loadingMoreCompanies) return; // still loading batches
    if (allCompaniesSlim.length === 0 || Object.keys(companySentCounts).length === 0) return;
    const tcp              = allCompaniesSlim.filter((c: any) =>  INTERNAL_COMPANY_REGEX.test(c.name || ''));
    // Companies that HAVE been sent to (have valid email contacts)
    const sent             = allCompaniesSlim.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (companySentCounts[c.id] || 0) > 0 && (c.contacts?.length || 0) > 0);
    // Unsent companies WITH at least one valid email contact — main working zone
    const unsentWithEmail  = allCompaniesSlim.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (companySentCounts[c.id] || 0) === 0 && (c.contacts?.length || 0) > 0);
    // Companies that HAVE contacts but NONE have a valid email — pushed to last pages (red/disabled)
    const noEmailContacts  = allCompaniesSlim.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (c._count?.contacts || 0) > 0 && (c.contacts?.length || 0) === 0);
    // Companies with zero contacts — absolute last
    const noContacts       = allCompaniesSlim.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (c._count?.contacts || 0) === 0);
    setStableSortedCompanies([...tcp, ...sent, ...unsentWithEmail, ...noEmailContacts, ...noContacts]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMoreCompanies, Object.keys(companySentCounts).length]);

  // Load contacts for current page whenever page or slim data changes
  useEffect(() => {
    if (!isOpen || allCompaniesSlim.length === 0) return;
    // Use stable sort for page contacts — same order as display
    const base = stableSortedCompanies.length > 0 ? stableSortedCompanies : allCompaniesSlim;
    const searchLower = companySearch.toLowerCase();
    const filtered = searchLower ? base.filter((c: any) => c.name?.toLowerCase().includes(searchLower)) : base;
    const pageIds = filtered
      .slice((companyPage - 1) * COMPANIES_PER_PAGE, companyPage * COMPANIES_PER_PAGE)
      .map((c: any) => c.id);
    if (pageIds.length) loadPageContacts(pageIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyPage, stableSortedCompanies.length, companySearch, isOpen]);

  // Load companies + templates when wizard opens
  useEffect(() => {
    if (isOpen) {
      loadCompanies();   // Phase 1: slim metadata (fast)
      loadSentCounts();  // Phase 1b: sent counts per company (parallel)
      // Restore Apollo-enriched company IDs from localStorage (green indicator persists across sessions)
      try {
        const saved = JSON.parse(localStorage.getItem('bm_apollo_enriched_ids') || '[]');
        if (saved.length > 0) setApolloEnrichedCompanyIds(new Set(saved));
      } catch { /* ignore */ }
      loadTemplates();
      loadStaffingTemplates();
      // Fetch contacts already sent any campaign
      (async () => {
        try {
          const token = localStorage.getItem('crmToken');
          const res = await fetch(`${API_URL}/api/campaigns/sent-contact-ids`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setSentContactIds(new Set(data.sentContactIds || []));
          }
        } catch { /* ignore — badges just won't show */ }
      })();
      // Reset state for fresh wizard
      setStep(1);
      setSendResult(null);
      setShowPreview(false);
      setError('');

      // Check for follow-up campaign data
      try {
        const followUpRaw = sessionStorage.getItem('followUpCampaign');
        if (followUpRaw) {
          const followUp = JSON.parse(followUpRaw);
          sessionStorage.removeItem('followUpCampaign');
          if (followUp.isFollowUp) {
            setCampaignName(`Follow-up: ${followUp.originalName}`);
            setSubject(`Re: ${followUp.originalSubject}`);
            setEmailBody(`<div style='font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
  <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;'>
    <h1 style='color: #ffffff; margin: 0; font-size: 22px;'>Follow-up: ${followUp.originalName}</h1>
    <p style='color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;'>Following up on our previous outreach</p>
  </div>
  <div style='padding: 24px; background: #ffffff; color: #333;'>
    <p style='font-size: 15px; line-height: 1.6;'>Hi {{firstName}},</p>
    <p style='font-size: 15px; line-height: 1.6;'>I wanted to follow up on my previous email about technology staffing for {{companyName}}.</p>
    <p style='font-size: 15px; line-height: 1.6;'>I understand how busy things can get, so I\\'ll keep this brief — we still have <strong>pre-vetted engineers</strong> ready for immediate engagement across AI/ML, Cloud, Full-Stack, and DevOps.</p>
    <p style='font-size: 15px; line-height: 1.6;'>Would a quick 10-minute call this week work for you?</p>
    <div style='text-align: center; margin: 24px 0;'>
      <a href='#' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;'>Schedule a Quick Call</a>
    </div>
    <p style='font-size: 15px; line-height: 1.6;'>Best regards,<br/><strong>BrandMonkz Staffing Team</strong></p>
  </div>
</div>`);
            setContentSource('staffing');
          }
        }
      } catch {
        // ignore
      }

      // Pre-select template + subject from hot campaign banner
      if (preselect) {
        setSubject(preselect.subject);
        setContentSource('staffing');
        // Load the matching template from the API
        const token = localStorage.getItem('crmToken');
        const apiUrl = import.meta.env.VITE_API_URL || '';
        fetch(`${apiUrl}/api/campaigns/all-templates`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.json()).then(data => {
          const tmpl = data.templates?.find((t: any) => t.id === preselect.campaignType);
          if (tmpl) {
            setCampaignName(`${tmpl.name} Campaign`);
          }
        }).catch(() => {});
        // Skip to step 2 (company selection) since template + subject are pre-loaded
        // Content will be loaded from staffing templates
      }
    }
  }, [isOpen, preselect]);

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

  // Phase 1: load all company metadata (no contacts) — fast single request
  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      setLoadingMoreCompanies(true);
      const res = await fetch(`${API_URL}/api/companies?slim=true&limit=20000&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoadingMoreCompanies(false); return; }
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data.companies || data.data || [];
      list.forEach((c: any) => { c.vertical = getVertical(c.industry); });
      setAllCompaniesSlim(list);
      setTotalCompanyCount(data.total || list.length);
      setLoadingMoreCompanies(false);
    } catch { setLoadingMoreCompanies(false); }
  };

  // Phase 1b: load sent counts per company (parallel with loadCompanies)
  const loadSentCounts = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(`${API_URL}/api/campaigns/sent-counts-by-company`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanySentCounts(data.companySentCounts || {});
      }
    } catch { /* ignore */ }
  };

  // Phase 2: load full contact data for the current page's companies only
  const loadPageContacts = async (pageCompanyIds: string[]) => {
    if (!pageCompanyIds.length) return;
    try {
      const token = localStorage.getItem('crmToken');
      const res = await fetch(
        `${API_URL}/api/companies?ids=${pageCompanyIds.join(',')}&limit=${pageCompanyIds.length}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.companies || [];
        list.forEach((c: any) => { c.vertical = getVertical(c.industry); });
        setCompanies(list);
        // Auto-deselect any companies on this page that have no valid email contacts
        const noEmailIds = list
          .filter((c: any) => {
            const validEmails = (c.contacts || []).filter((ct: any) => isValidEmail(ct.email)).length;
            return (c._count?.contacts || 0) > 0 && validEmails === 0;
          })
          .map((c: any) => c.id);
        if (noEmailIds.length > 0) {
          setSelectedCompanyIds(prev => prev.filter(id => !noEmailIds.includes(id)));
          setSelectedContactIds(prev => {
            const next = new Set(prev);
            noEmailIds.forEach((cid: string) => {
              const company = list.find((c: any) => c.id === cid);
              (company?.contacts || []).forEach((ct: any) => next.delete(ct.id));
            });
            return next;
          });
        }
      }
    } catch { /* ignore */ }
  };

  const loadStaffingTemplates = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      // Load our 8 campaign templates with HTML content
      const res = await fetch(`${API_URL}/api/campaigns/all-templates?html=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const templates = (data.templates || [])
          .filter((t: any) => !t.wip) // Hide WIP templates
          .map((t: any) => ({
            name: t.name,
            subject: t.subjects[0] || '',
            htmlContent: t.htmlContent || '',
            color: t.color,
            id: t.id,
            subjects: t.subjects,
          }));
        setStaffingTemplates(templates);
      }
    } catch {
      // Silently fail — templates are optional
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
    if (!token) {
      setError('Not logged in. Please refresh and log in again.');
      setSending(false);
      return;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    try {
      // Step 1: Create campaign
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
      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok || !createData?.campaign?.id) {
        throw new Error(createData?.error || createData?.message || `Server returned ${createRes.status}. Please try again.`);
      }
      const campaignId = createData.campaign.id;

      // Step 2: Link companies (continue even if some fail)
      let linkedCount = 0;
      for (const companyId of selectedCompanyIds) {
        try {
          const linkRes = await fetch(`${API_URL}/api/campaigns/${campaignId}/companies/${companyId}`, {
            method: 'POST',
            headers,
          });
          if (linkRes.ok) linkedCount++;
        } catch {
          // Skip failed links, continue
        }
      }

      // Step 3: Start throttled send
      const sendRes = await fetch(`${API_URL}/api/campaigns/${campaignId}/send-throttled`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ intervalMinutes: sendSpeed }),
      });
      const sendData = await sendRes.json().catch(() => null);

      if (!sendRes.ok) {
        throw new Error(sendData?.error || 'Failed to start campaign send');
      }

      setSendCampaignId(campaignId);
      setSendResult({
        success: true,
        sent: 1,
        total: sendData?.total || totalSelectedContacts,
        failed: 0,
        mode: 'throttled',
        message: sendData?.message || `Sending ${totalSelectedContacts} emails, 1 every ${sendSpeed} min.`,
        recipients: [],
      });
      setSendProgress({
        status: 'sending',
        sent: 1,
        failed: 0,
        total: sendData?.total || totalSelectedContacts,
        remaining: (sendData?.total || totalSelectedContacts) - 1,
        nextSendInSeconds: sendSpeed * 60,
      });
      setStep(4 as any);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        // Selecting company — auto-select contacts with valid emails, skip sent
        const company = companies.find(c => c.id === id);
        if (company?.contacts) {
          setSelectedContactIds(prevContacts => {
            const next = new Set(prevContacts);
            company.contacts!.forEach(c => {
              if (isSelectable(c)) next.add(c.id);
            });
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
    const selectableContacts = contacts.filter(c => isSelectable(c));
    const allSelected = selectableContacts.length > 0 && selectableContacts.every(c => selectedContactIds.has(c.id));
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        contacts.forEach(c => next.delete(c.id)); // deselect ALL (including manually selected sent ones)
      } else {
        selectableContacts.forEach(c => next.add(c.id)); // only select non-sent
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

  // Apollo Saved Contacts page — full overlay
  const renderApolloPage = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: '#1a1a2e', border: '2px solid rgba(16,185,129,0.5)', borderRadius: '16px', width: '860px', maxWidth: '95vw', color: '#F1F5F9', position: 'relative' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #2d2d4a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#10B981' }}>🟢 Apollo Saved Contacts</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>Contacts enriched via Apollo — saved to your database. Newest first.</p>
          </div>
          <button onClick={() => setShowApolloPage(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '22px', padding: '4px' }}>×</button>
        </div>
        {/* Content */}
        <div style={{ padding: '16px 24px' }}>
          {apolloPageLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Loading Apollo contacts...</div>
          ) : apolloSavedContacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No Apollo contacts yet</p>
              <p style={{ fontSize: '13px' }}>Go to 🚫 No Email tab → click Apollo Enrich All → save found contacts</p>
            </div>
          ) : (
            <>
              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ color: '#10B981', fontWeight: 700, fontSize: '14px' }}>{apolloSavedContacts.length} contacts found by Apollo</span>
                <button onClick={() => setApolloPageSelected(new Set(apolloSavedContacts.map((c: any) => c.id)))}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)', background: 'none', color: '#10B981', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ☑ Select All
                </button>
                <button onClick={() => setApolloPageSelected(new Set())}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid #3d3d5c', background: 'none', color: '#94A3B8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ☐ Deselect All
                </button>
                <span style={{ color: '#64748B', fontSize: '12px' }}>{apolloPageSelected.size} selected</span>
              </div>
              {/* Contact list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto', marginBottom: '16px' }}>
                {apolloSavedContacts.map((c: any) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: apolloPageSelected.has(c.id) ? 'rgba(16,185,129,0.08)' : '#1e1e36', border: `1px solid ${apolloPageSelected.has(c.id) ? 'rgba(16,185,129,0.35)' : '#2d2d4a'}`, cursor: 'pointer' }}>
                    <input type="checkbox" checked={apolloPageSelected.has(c.id)} onChange={() => setApolloPageSelected(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '13px' }}>{c.firstName} {c.lastName}</span>
                      {c.role && <span style={{ color: '#64748B', fontSize: '12px', marginLeft: '6px' }}>· {c.role}</span>}
                      <span style={{ color: '#64748B', fontSize: '12px', marginLeft: '8px' }}>{c.company?.name}</span>
                    </div>
                    <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>✉ {c.email}</span>
                  </label>
                ))}
              </div>
              {/* Send button */}
              <button
                disabled={apolloPageSelected.size === 0}
                onClick={() => {
                  // Build selectedCompanyIds from selected contacts' company IDs
                  const selContacts = apolloSavedContacts.filter((c: any) => apolloPageSelected.has(c.id));
                  const companyIds = [...new Set(selContacts.map((c: any) => c.company?.id).filter(Boolean))] as string[];
                  // Mark green + add to selection
                  setApolloEnrichedCompanyIds(prev => { const n = new Set(prev); companyIds.forEach(id => n.add(id)); return n; });
                  setSelectedCompanyIds(prev => [...new Set([...prev, ...companyIds])]);
                  setShowApolloPage(false);
                  setStep(3); // go straight to Review & Send
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: apolloPageSelected.size === 0 ? 'rgba(16,185,129,0.3)' : 'linear-gradient(to right,#10B981,#059669)', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: apolloPageSelected.size === 0 ? 'not-allowed' : 'pointer' }}
              >
                🚀 Send to {apolloPageSelected.size} Selected Contact{apolloPageSelected.size !== 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

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
  if (showApolloPage) return renderApolloPage();

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
              {step === 4 && (sendProgress?.status === 'complete' ? 'Campaign Complete!' : 'Sending Campaign...')}
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
              {step === 1 && 'Describe your campaign — AI writes the email, or pick a staffing template'}
              {step === 2 && 'Select companies and pick the contacts to email'}
              {step === 3 && 'Preview the email, confirm details, and send'}
              {step === 4 && (sendProgress?.status === 'complete' ? 'All emails delivered' : 'Emails are being sent in the background')}
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
                    /* Template selection cards — 8 campaign templates */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                      {staffingTemplates.map((t: any, idx: number) => {
                        const descriptions: Record<string, string> = {
                          'NetSuite + NetSuite Next': 'NetSuite 2026.1 + NetSuite Next — AI Canvas, SuiteScript 2.1, Solution Architects',
                          'AI Consulting': 'AI agents, GenAI/LLM, RAG systems, ML pipelines — target companies stuck in pilot mode',
                          'Cloud & Platform Engineering': 'Kubernetes, Platform Engineering, DevOps, SRE — 90% of orgs face cloud skills gaps',
                          'Cybersecurity': '$4.88M per breach — pen testers, SOC analysts, Zero Trust, compliance (SOC2/HIPAA)',
                          'Data Engineering': 'Spark, Snowflake, real-time pipelines, dbt, analytics — every AI project starts with data',
                          'Full-Stack Engineering': 'React + Next.js + AI-augmented dev — engineers who ship product, not just code',
                          'Mobile Engineering': 'iOS SwiftUI, Android Jetpack Compose, React Native, Flutter — on-device AI ready',
                        };
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedStaffingIdx(idx);
                              setSubject(t.subjects?.[0] || t.subject);
                              setEmailBody(t.htmlContent);
                              setCampaignName(t.name + ' Campaign');
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
                              background: `linear-gradient(135deg, ${t.color || '#667eea'}, ${t.color || '#667eea'}CC)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '16px', color: '#fff', fontWeight: 700, flexShrink: 0,
                            }}>
                              {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: '#F1F5F9', marginBottom: '4px' }}>
                                {t.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
                                {descriptions[t.name] || t.subject?.replace(/\{\{companyName\}\}/g, '[Company]').slice(0, 100)}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: t.color || '#6366F1', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {(t as any).subjects?.length || 0} subjects
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

                      {/* Subject line picker — uses selected template's own subjects */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose a subject line (A/B test different ones)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {(staffingTemplates[selectedStaffingIdx]?.subjects || [staffingTemplates[selectedStaffingIdx]?.subject]).filter(Boolean).map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSubject(s)}
                            style={{
                              padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                              border: subject === s ? '2px solid #6366F1' : '1px solid #3d3d5c',
                              background: subject === s ? 'rgba(99,102,241,0.1)' : '#1e1e36',
                              display: 'flex', alignItems: 'center', gap: '10px',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                              border: subject === s ? '2px solid #6366F1' : '2px solid #3d3d5c',
                              background: subject === s ? '#6366F1' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {subject === s && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            <span style={{ fontSize: '13px', color: subject === s ? '#A5B4FC' : '#94A3B8', fontWeight: subject === s ? 600 : 400 }}>
                              {s.replace(/\{\{companyName\}\}/g, '[Company]')}
                            </span>
                          </div>
                        ))}
                        <div style={{ marginTop: '4px' }}>
                          <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Or type a custom subject line..."
                            style={{ ...inputStyle, fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px', fontStyle: 'italic' }}>
                        Tip: Send different subject lines to different company batches, then compare open rates in Analytics.
                      </p>

                      {/* Rendered email preview — what the recipient actually sees */}
                      <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview (names auto-filled per contact)</label>
                      <div style={{
                        border: '1px solid #3d3d5c',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        maxHeight: '450px',
                        overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff', color: '#333333', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
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
                            style={{ color: '#333333' }}
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
                        border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden', maxHeight: '450px', overflowY: 'auto',
                      }}>
                        <div style={{ background: '#ffffff', color: '#333333', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
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
                            style={{ color: '#333333' }}
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

                {/* Right panel — rendered preview after generation */}
                {subject && emailBody && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        AI Draft — Ready to Send
                      </p>
                      <button
                        onClick={runGeneration}
                        disabled={generating}
                        style={{ background: 'none', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', color: '#A5B4FC', fontSize: '11px', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        🔄 Regenerate
                      </button>
                    </div>

                    {/* Subject line — editable */}
                    <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject line</label>
                    <input type="text" value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputStyle, marginBottom: '10px' }} />

                    {/* Rendered email preview */}
                    <label style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email preview</label>
                    <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                      <div style={{ background: '#ffffff', color: '#333333', padding: '12px', fontSize: '14px', lineHeight: '1.6' }}>
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
                          style={{ color: '#333333' }}
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: '10px', color: '#64748B', margin: '4px 0 0', fontStyle: 'italic' }}>
                      Names auto-filled per recipient when sent.
                    </p>
                  </div>
                )}
              </div>
              )}

              {/* Universal email preview — shows for ANY tab once email content exists */}
              {emailBody && (
                <div style={{ marginTop: '16px', borderTop: '1px solid #3d3d5c', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      style={{
                        background: showPreview ? 'rgba(99,102,241,0.15)' : 'transparent',
                        border: '1px solid rgba(99,102,241,0.3)',
                        color: '#A5B4FC',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {showPreview ? '🔽 Hide Preview' : '👁️ Preview Email'}
                    </button>
                    {subject && (
                      <span style={{ fontSize: '12px', color: '#64748B' }}>
                        Subject: <span style={{ color: '#F1F5F9' }}>{subject.replace(/\{\{companyName\}\}/g, 'Deloitte').slice(0, 50)}{subject.length > 50 ? '...' : ''}</span>
                      </span>
                    )}
                  </div>

                  {showPreview && (
                    <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ background: '#1e1e36', padding: '8px 14px', borderBottom: '1px solid #3d3d5c' }}>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          <strong style={{ color: '#CBD5E1' }}>Subject:</strong> {subject.replace(/\{\{companyName\}\}/g, 'Deloitte').replace(/\{\{firstName\}\}/g, 'Sarah')}
                        </div>
                      </div>
                      <div style={{ background: '#ffffff', color: '#333333', maxHeight: '400px', overflowY: 'auto', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
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
                          style={{ color: '#333333' }}
                        />
                      </div>
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
            const base = stableSortedCompanies.length > 0 ? stableSortedCompanies : allCompaniesSlim;
            const searchBase = companySearch
              ? base.filter((c: any) => c.name?.toLowerCase().includes(companySearch.toLowerCase()))
              : base;

            // Split into two folders using slim contacts array
            // Backend returns contacts=[{id}] only for contacts with non-empty emails in slim mode
            // So contacts.length > 0 = company has at least 1 contact with an email address
            const hasEmailContact = (c: any) => INTERNAL_COMPANY_REGEX.test(c.name || '') || (c.contacts?.length || 0) > 0;
            const withEmailList = searchBase.filter((c: any) =>  hasEmailContact(c));
            const noEmailList   = searchBase.filter((c: any) => !hasEmailContact(c));
            const filteredSorted = emailFolder === 'with-email' ? withEmailList : noEmailList;
            const allFilteredSelected = filteredSorted.length > 0 && filteredSorted.every((c: any) => selectedCompanyIds.includes(c.id));

            // Banner counts — uses sentCounts but does NOT affect page order
            const sentGroup   = filteredSorted.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (companySentCounts[c.id] || 0) > 0);
            const unsentGroup = filteredSorted.filter((c: any) => !INTERNAL_COMPANY_REGEX.test(c.name || '') && (companySentCounts[c.id] || 0) === 0 && (c._count?.contacts || 0) > 0);

            // Jump page = first page where ANY company has unsent emailable contacts
            // sentCount < emailableCount catches both: fully unsent (0) AND partially sent (some sent, some not)
            const firstUnsentIdx = filteredSorted.findIndex((c: any) => {
              if (INTERNAL_COMPANY_REGEX.test(c.name || '')) return false;
              const emailableCount = c.contacts?.length || 0; // slim: contacts with non-empty email
              if (emailableCount === 0) return false;
              return (companySentCounts[c.id] || 0) < emailableCount;
            });
            const firstUnsentPageNum = firstUnsentIdx >= 0 ? Math.ceil((firstUnsentIdx + 1) / COMPANIES_PER_PAGE) : null;
            // Last visited page from localStorage — takes priority over first-unsent calculation
            const storedPage = parseInt(localStorage.getItem('bm_last_campaign_page') || '0') || null;
            const lastSentPageNum = storedPage || firstUnsentPageNum;
            const totalPages = Math.ceil(filteredSorted.length / COMPANIES_PER_PAGE);
            const pagedSlim = filteredSorted.slice((companyPage - 1) * COMPANIES_PER_PAGE, companyPage * COMPANIES_PER_PAGE);
            const showingFrom = filteredSorted.length === 0 ? 0 : (companyPage - 1) * COMPANIES_PER_PAGE + 1;
            const showingTo = Math.min(companyPage * COMPANIES_PER_PAGE, filteredSorted.length);

            // Merge slim page data with loaded contacts for current page
            const contactsMap = new Map(companies.map(c => [c.id, c.contacts || []]));
            const pagedCompanies = pagedSlim.map((c: any) => ({ ...c, contacts: contactsMap.get(c.id) || [] }));
            const filtered = filteredSorted; // alias for Select All logic

            return (
            <div>
              {/* Folder toggle + Apollo buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Apollo Saved Contacts button — opens dedicated Apollo page */}
                <button
                  onClick={async () => {
                    setApolloPageLoading(true);
                    setShowApolloPage(true);
                    try {
                      const token = localStorage.getItem('crmToken');
                      const res = await fetch(`${API_URL}/api/apollo/enriched-contacts`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setApolloSavedContacts(data.contacts || []);
                        // Pre-select all
                        setApolloPageSelected(new Set((data.contacts || []).map((c: any) => c.id)));
                      }
                    } catch { /* ignore */ } finally { setApolloPageLoading(false); }
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: '2px solid rgba(16,185,129,0.5)',
                    background: 'rgba(16,185,129,0.1)', color: '#10B981',
                  }}
                >
                  🟢 Apollo Contacts
                </button>
                <button
                  onClick={() => { setEmailFolder('with-email'); setCompanyPage(1); }}
                  style={{
                    padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: 'none',
                    background: emailFolder === 'with-email' ? 'linear-gradient(to right,#6366F1,#8B5CF6)' : 'rgba(99,102,241,0.1)',
                    color: emailFolder === 'with-email' ? '#fff' : '#A5B4FC',
                  }}
                >
                  📧 With Email ({withEmailList.length})
                </button>
                <button
                  onClick={() => { setEmailFolder('no-email'); setCompanyPage(1); }}
                  style={{
                    padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: 'none',
                    background: emailFolder === 'no-email' ? 'rgba(234,88,12,0.85)' : 'rgba(234,88,12,0.1)',
                    color: emailFolder === 'no-email' ? '#fff' : '#EA580C',
                  }}
                >
                  🚫 No Email ({noEmailList.length})
                </button>

                {/* Apollo Enrich button — enriches ALL no-email companies */}
                <button
                  onClick={async () => {
                    if (emailFolder === 'with-email') {
                      setEmailFolder('no-email'); setCompanyPage(1); return;
                    }
                    // Get ALL no-email company IDs (entire list, not just current page)
                    const allNoEmailIds = noEmailList.map((c: any) => c.id);
                    if (allNoEmailIds.length === 0) {
                      alert('No companies in the No Email list.');
                      return;
                    }
                    setApolloEnriching(true);
                    setApolloResult(null);
                    setApolloModalOpen(true); // Open modal immediately to show progress
                    const token = localStorage.getItem('crmToken');
                    const allEnriched: any[] = [];
                    const allNotFound: any[] = [];
                    // Process in batches of 50
                    const BATCH = 50;
                    for (let i = 0; i < allNoEmailIds.length; i += BATCH) {
                      const batch = allNoEmailIds.slice(i, i + BATCH);
                      try {
                        const res = await fetch(`${API_URL}/api/apollo/enrich-contacts`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ companyIds: batch }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          allEnriched.push(...(data.enriched || []));
                          allNotFound.push(...(data.notFound || []));
                          // Update modal progressively
                          setApolloResult({ enriched: [...allEnriched], notFound: [...allNotFound], creditsUsed: allEnriched.length });
                        }
                      } catch { /* continue with next batch */ }
                    }
                    const allContactIds = new Set<string>(allEnriched.map((e: any) => e.contactId));
                    setApolloSelected(allContactIds);
                    setApolloEnriching(false);
                  }}
                  disabled={apolloEnriching}
                  style={{
                    padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                    cursor: apolloEnriching ? 'not-allowed' : 'pointer', border: 'none',
                    background: apolloEnriching ? 'rgba(251,191,36,0.3)' : 'linear-gradient(to right,#F59E0B,#D97706)',
                    color: '#fff', marginLeft: 'auto',
                  }}
                >
                  {apolloEnriching ? `⏳ Enriching all ${noEmailList.length}...` : `🔍 Apollo Enrich All (${noEmailList.length})`}
                </button>
              </div>

              {/* Apollo Results Modal */}
              {apolloModalOpen && apolloResult && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: '#1e1e36', border: '1px solid #3d3d5c', borderRadius: '14px', padding: '24px', maxWidth: '560px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ color: '#F1F5F9', margin: 0, fontSize: '16px', fontWeight: 700 }}>🔍 Apollo Enrichment Results</h3>
                      <button onClick={() => setApolloModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>×</button>
                    </div>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 16px' }}>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>✅ {apolloResult.enriched.length} emails found</span>
                      {apolloResult.notFound.length > 0 && <span style={{ marginLeft: '12px' }}>❌ {apolloResult.notFound.length} not found</span>}
                      <span style={{ marginLeft: '12px', color: '#F59E0B' }}>Credits used: {apolloResult.creditsUsed}</span>
                    </p>
                    {apolloResult.enriched.length > 0 && (
                      <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <button onClick={() => setApolloSelected(new Set(apolloResult.enriched.map((e: any) => e.contactId)))}
                            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)', background: 'none', color: '#10B981', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            ☑ Select All
                          </button>
                          <button onClick={() => setApolloSelected(new Set())}
                            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #3d3d5c', background: 'none', color: '#94A3B8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            ☐ Deselect All
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          {apolloResult.enriched.map((e: any) => (
                            <label key={e.contactId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: apolloSelected.has(e.contactId) ? 'rgba(16,185,129,0.08)' : '#252540', border: `1px solid ${apolloSelected.has(e.contactId) ? 'rgba(16,185,129,0.3)' : '#3d3d5c'}`, cursor: 'pointer' }}>
                              <input type="checkbox" checked={apolloSelected.has(e.contactId)} onChange={() => {
                                setApolloSelected(prev => { const n = new Set(prev); n.has(e.contactId) ? n.delete(e.contactId) : n.add(e.contactId); return n; });
                              }} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                              <div style={{ flex: 1 }}>
                                <span style={{ color: '#F1F5F9', fontWeight: 600, fontSize: '13px' }}>{e.name}</span>
                                <span style={{ color: '#64748B', fontSize: '12px', marginLeft: '8px' }}>{e.company}</span>
                              </div>
                              <span style={{ color: '#10B981', fontSize: '12px', fontWeight: 600 }}>{e.email}</span>
                            </label>
                          ))}
                        </div>
                        <button
                          disabled={apolloSelected.size === 0}
                          onClick={async () => {
                            // Find the company IDs for selected contacts
                            const selEnriched = apolloResult.enriched.filter((e: any) => apolloSelected.has(e.contactId));
                            const selCompanyIds = [...new Set(selEnriched.map((e: any) => e.companyId).filter(Boolean))];
                            // Reload page contacts to get fresh email data
                            const token = localStorage.getItem('crmToken');
                            const base2 = stableSortedCompanies.length > 0 ? stableSortedCompanies : allCompaniesSlim;
                            const ids2 = base2.slice((companyPage-1)*COMPANIES_PER_PAGE, companyPage*COMPANIES_PER_PAGE).map((c: any) => c.id);
                            if (ids2.length) {
                              const r2 = await fetch(`${API_URL}/api/companies?ids=${ids2.join(',')}&limit=${ids2.length}`, { headers: { Authorization: `Bearer ${token}` } });
                              if (r2.ok) { const d2 = await r2.json(); setCompanies(Array.isArray(d2) ? d2 : d2.companies || []); }
                            }
                            // Mark companies as Apollo-enriched (green) — save to localStorage for persistence
                            setApolloEnrichedCompanyIds(prev => {
                              const n = new Set(prev);
                              selCompanyIds.forEach(id => n.add(id));
                              // Persist to localStorage so green survives wizard close/reopen
                              try { localStorage.setItem('bm_apollo_enriched_ids', JSON.stringify([...n])); } catch { /* ignore */ }
                              return n;
                            });
                            setSelectedCompanyIds(prev => [...new Set([...prev, ...selCompanyIds])]);
                            setApolloModalOpen(false);
                            setApolloResult(null);
                            setStep(3); // go straight to Review & Send
                          }}
                          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: apolloSelected.size === 0 ? 'rgba(16,185,129,0.3)' : 'linear-gradient(to right,#10B981,#059669)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: apolloSelected.size === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          🚀 Save & Send {apolloSelected.size} Contact{apolloSelected.size !== 1 ? 's' : ''}
                        </button>
                      </>
                    )}
                    {apolloResult.notFound.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not found ({apolloResult.notFound.length})</p>
                        {apolloResult.notFound.map((e: any, i: number) => (
                          <span key={i} style={{ color: '#64748B', fontSize: '12px', marginRight: '12px' }}>❌ {e.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      // Also remove contacts from deselected companies
                      setSelectedContactIds(prev => {
                        const next = new Set(prev);
                        filtered.forEach(company => {
                          (company.contacts || []).forEach(c => next.delete(c.id));
                        });
                        return next;
                      });
                    } else {
                      const newIds = [...new Set([...selectedCompanyIds, ...filtered.map(c => c.id)])];
                      setSelectedCompanyIds(newIds);
                      // Auto-select contacts with valid emails, skip sent
                      setSelectedContactIds(prev => {
                        const next = new Set(prev);
                        filtered.forEach(company => {
                          (company.contacts || []).forEach(c => {
                            if (isSelectable(c)) next.add(c.id);
                          });
                        });
                        return next;
                      });
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
                  <span>
                    {loadingMoreCompanies
                      ? `Loading... ${companies.length} of ${totalCompanyCount} companies`
                      : `${companies.length} total groups`}
                  </span>
                  <span>•</span>
                  <span>Showing {showingFrom}–{showingTo} of {filteredSorted.length}</span>
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
                <>
                  {/* Jump banner — last visited page takes priority over first-unsent */}
                  {lastSentPageNum && (
                    <div
                      onClick={() => lastSentPageNum !== companyPage && setCompanyPage(lastSentPageNum)}
                      style={{ cursor: lastSentPageNum !== companyPage ? 'pointer' : 'default', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '8px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}
                    >
                      <span>📍</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>
                        {sentGroup.length} sent · {unsentGroup.length} unsent
                      </span>
                      <span style={{ color: '#64748B' }}>·</span>
                      {lastSentPageNum !== companyPage
                        ? <span style={{ color: '#10B981' }}>
                            {storedPage ? `Continue from Page ${lastSentPageNum} (last visited) →` : `Jump to Page ${lastSentPageNum} →`}
                          </span>
                        : <span style={{ color: '#64748B' }}>You are on Page {lastSentPageNum}</span>}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginBottom: '16px',
                      paddingRight: '4px',
                    }}
                  >
                  {pagedCompanies.map((company) => {
                    const isSelected = selectedCompanyIds.includes(company.id);
                    const isExpanded = expandedCompanyId === company.id;
                    const contactCount = company._count?.contacts || 0;
                    const contacts = company.contacts || [];
                    const selectedInCompany = contacts.filter(c => selectedContactIds.has(c.id)).length;
                    const hasNoContacts = contactCount === 0;
                    const validEmailCount = contacts.filter(c => isValidEmail(c.email)).length;
                    const noValidEmail = contactCount > 0 && validEmailCount === 0;
                    const isApolloEnriched = apolloEnrichedCompanyIds.has(company.id);

                    return (
                      <div key={company.id} style={{ borderRadius: '10px', border: isApolloEnriched ? '2px solid rgba(16,185,129,0.7)' : isSelected ? '2px solid #6366F1' : noValidEmail ? '1px solid rgba(239,68,68,0.5)' : hasNoContacts ? '1px solid rgba(234,88,12,0.5)' : '1px solid #3d3d5c', background: isApolloEnriched ? 'rgba(16,185,129,0.08)' : isSelected ? 'rgba(99,102,241,0.1)' : noValidEmail ? 'rgba(239,68,68,0.06)' : hasNoContacts ? 'rgba(234,88,12,0.08)' : '#20203a', transition: 'all 0.15s' }}>
                        {/* Company header row */}
                        <div
                          onClick={() => !noValidEmail && toggleCompany(company.id)}
                          style={{ minHeight: '56px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: noValidEmail ? 'not-allowed' : 'pointer', boxSizing: 'border-box' }}
                        >
                          {/* Checkbox — red + disabled if no valid email contacts */}
                          <div style={{
                            width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px',
                            border: noValidEmail ? '2px solid rgba(239,68,68,0.6)' : isSelected ? 'none' : '2px solid #4a4a6a',
                            background: noValidEmail ? 'rgba(239,68,68,0.12)' : isSelected ? '#6366F1' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: noValidEmail ? '#EF4444' : '#fff', fontSize: noValidEmail ? '14px' : '11px', fontWeight: 800, lineHeight: '1',
                          }}>
                            {noValidEmail ? '✕' : isSelected ? '✓' : ''}
                          </div>

                          {/* Company name + vertical + contact count */}
                          <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: '#F1F5F9' }}>
                                {company.name || '(unnamed)'}
                              </span>
                              {company.vertical && company.vertical !== 'Uncategorized' && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600,
                                  background: 'rgba(99,102,241,0.12)', color: '#818CF8', whiteSpace: 'nowrap',
                                }}>{company.vertical}</span>
                              )}
                              {hasNoContacts && (
                                <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: 'rgba(234,88,12,0.2)', color: '#EA580C', whiteSpace: 'nowrap' }}>No email</span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>
                              {contacts.filter(c => isValidEmail(c.email)).length}/{contactCount} with email
                              {selectedInCompany > 0 && <span style={{ color: '#A5B4FC' }}> ({selectedInCompany} selected)</span>}
                              {(() => {
                                const sentInCompany = companySentCounts[company.id] || 0;
                                return sentInCompany > 0 ? (
                                  <span style={{ color: '#C4B5FD', marginLeft: '6px', fontSize: '11px' }}>
                                    ({sentInCompany} already sent)
                                  </span>
                                ) : null;
                              })()}
                            </span>
                          </div>

                          {/* Expand button */}
                          {contactCount > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedCompanyId(isExpanded ? null : company.id); }}
                              style={{
                                background: isExpanded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                border: 'none', cursor: 'pointer',
                                color: isExpanded ? '#A5B4FC' : '#94A3B8',
                                fontSize: '11px', padding: '5px 10px', minWidth: '50px',
                                borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
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
                              const hasValidEmail = isValidEmail(contact.email);
                              const isSent = sentContactIds.has(contact.id);
                              return (
                                <div
                                  key={contact.id}
                                  onClick={(e) => { e.stopPropagation(); if (hasValidEmail) toggleContact(contact.id, company.id); }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 10px', borderRadius: '6px',
                                    cursor: hasValidEmail ? 'pointer' : 'not-allowed',
                                    opacity: hasValidEmail ? 1 : 0.45,
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
                                      {isSent && (
                                        <span style={{
                                          display: 'inline-block', marginLeft: '8px', padding: '1px 7px', borderRadius: '4px',
                                          background: 'rgba(139,92,246,0.25)', color: '#C4B5FD',
                                          fontSize: '10px', fontWeight: 700, verticalAlign: 'middle',
                                        }}>Sent</span>
                                      )}
                                      {!hasValidEmail && (
                                        <span style={{
                                          display: 'inline-block', marginLeft: '8px', padding: '1px 7px', borderRadius: '4px',
                                          background: 'rgba(239,68,68,0.2)', color: '#F87171',
                                          fontSize: '10px', fontWeight: 700, verticalAlign: 'middle',
                                        }}>No email</span>
                                      )}
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
                  {/* Numbered pagination — matches old setup: 1  2  ...  50  → */}
                  {totalPages > 1 && (() => {
                    const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
                      padding: '5px 10px', borderRadius: '6px', border: active ? '1px solid #6366F1' : '1px solid #3d3d5c',
                      background: active ? '#6366F1' : disabled ? 'transparent' : 'rgba(99,102,241,0.1)',
                      color: active ? '#fff' : disabled ? '#4a4a6a' : '#A5B4FC',
                      cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', minWidth: '34px',
                    });
                    const pages: (number | '...')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (companyPage > 3) pages.push('...');
                      for (let i = Math.max(2, companyPage - 1); i <= Math.min(totalPages - 1, companyPage + 1); i++) pages.push(i);
                      if (companyPage < totalPages - 2) pages.push('...');
                      pages.push(totalPages);
                    }
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <button onClick={() => setCompanyPage(p => Math.max(1, p - 1))} disabled={companyPage === 1} style={btnStyle(false, companyPage === 1)}>←</button>
                        {pages.map((p, i) =>
                          p === '...' ? <span key={`e${i}`} style={{ color: '#64748B', padding: '0 4px' }}>...</span>
                            : <button key={p} onClick={() => setCompanyPage(p as number)} style={btnStyle(p === companyPage)}>{p}</button>
                        )}
                        <button onClick={() => setCompanyPage(p => Math.min(totalPages, p + 1))} disabled={companyPage === totalPages} style={btnStyle(false, companyPage === totalPages)}>→</button>
                        {/* Direct page number input */}
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          placeholder="Go to page"
                          style={{ width: '90px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #3d3d5c', background: '#1e1e36', color: '#F1F5F9', fontSize: '12px', textAlign: 'center', marginLeft: '8px' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value);
                              if (val >= 1 && val <= totalPages) { setCompanyPage(val); (e.target as HTMLInputElement).value = ''; }
                            }
                          }}
                        />
                      </div>
                    );
                  })()}
                </>
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
          {step === 3 && (() => {
            // Build recipient list from ALL selected companies (not just current page)
            // contactsMap covers current page; for cross-page selections we show count from selectedContactIds
            const contactsMap = new Map(companies.map(c => [c.id, c.contacts || []]));
            const allRecipients: { firstName: string; lastName: string; email: string; companyName: string }[] = [];
            selectedCompanyIds.forEach(companyId => {
              const slim = allCompaniesSlim.find((c: any) => c.id === companyId);
              const contacts = contactsMap.get(companyId) || [];
              contacts.forEach(contact => {
                // Only include contacts with a valid email — matches backend validation
                if (!isValidEmail(contact.email)) return;
                if (selectedContactIds.size === 0 || selectedContactIds.has(contact.id)) {
                  allRecipients.push({
                    firstName: contact.firstName || '',
                    lastName: contact.lastName || '',
                    email: contact.email || '',
                    companyName: slim?.name || '',
                  });
                }
              });
            });
            const hasNoValidRecipients = allRecipients.length === 0;

            // Use first recipient for preview, fallback to sample
            const previewRecipient = allRecipients[0] || { firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah@example.com', companyName: 'Deloitte' };

            // Replace template variables with real recipient data
            const fillVars = (text: string) => text
              .replace(/\{\{firstName\}\}/g, previewRecipient.firstName)
              .replace(/\{\{lastName\}\}/g, previewRecipient.lastName)
              .replace(/\{\{companyName\}\}/g, previewRecipient.companyName)
              .replace(/\{\{email\}\}/g, previewRecipient.email)
              .replace(/\{\{fromName\}\}/g, 'BrandMonkz');

            return (
            <div>
              {/* Recipient list — who exactly gets this email */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Sending to {allRecipients.length} {allRecipients.length === 1 ? 'person' : 'people'}
                </p>
                <div style={{ maxHeight: '120px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #3d3d5c', background: '#1e1e36' }}>
                  {allRecipients.map((r, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: idx < allRecipients.length - 1 ? '1px solid #2d2d4a' : 'none',
                      fontSize: '12px',
                    }}>
                      <div>
                        <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{r.firstName} {r.lastName}</span>
                        <span style={{ color: '#64748B', marginLeft: '6px' }}>{r.email}</span>
                      </div>
                      <span style={{ color: '#6366F1', fontSize: '11px', fontWeight: 500 }}>{r.companyName}</span>
                    </div>
                  ))}
                  {allRecipients.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No contacts selected — go back and select contacts
                    </div>
                  )}
                </div>
              </div>

              {/* 2-column summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={cardStyle}>
                  <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Campaign name</p>
                  <input type="text" value={campaignName} onChange={e => setCampaignName(e.target.value)} style={{ ...inputStyle }} />
                </div>
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>From address</p>
                    <button onClick={() => setEditingFrom(f => !f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: '12px' }}>
                      ✏️ edit
                    </button>
                  </div>
                  {editingFrom ? (
                    <input type="email" value={fromAddress} onChange={e => setFromAddress(e.target.value)} style={{ ...inputStyle }} />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#F1F5F9', margin: 0 }}>{fromAddress}</p>
                  )}
                </div>
              </div>

              {/* Email preview — auto-populated with REAL recipient data */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Email preview — showing how <span style={{ color: '#A5B4FC' }}>{previewRecipient.firstName} {previewRecipient.lastName}</span> at <span style={{ color: '#A5B4FC' }}>{previewRecipient.companyName}</span> will see it
                </p>

                <div style={{ border: '1px solid #3d3d5c', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Email header */}
                  <div style={{ background: '#1e1e36', padding: '10px 14px', borderBottom: '1px solid #3d3d5c' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px' }}>
                      <strong style={{ color: '#CBD5E1' }}>From:</strong> {fromAddress || 'campaigns@brandmonkz.com'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px' }}>
                      <strong style={{ color: '#CBD5E1' }}>To:</strong> {previewRecipient.firstName} {previewRecipient.lastName} &lt;{previewRecipient.email}&gt;
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      <strong style={{ color: '#CBD5E1' }}>Subject:</strong> {fillVars(subject)}
                    </div>
                  </div>
                  {/* Email body — with real names filled in */}
                  <div style={{ background: '#ffffff', color: '#333333', maxHeight: '450px', overflowY: 'auto', padding: '16px', fontSize: '14px', lineHeight: '1.6' }}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fillVars(emailBody)) }} style={{ color: '#333333' }} />
                  </div>
                </div>

                {allRecipients.length > 1 && (
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0', fontStyle: 'italic' }}>
                    Each of the {allRecipients.length} recipients gets their own personalized version with their name and company.
                  </p>
                )}
              </div>

              {/* Send speed selector */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>
                  Send speed
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 1, label: '1 min', desc: 'Fast' },
                    { value: 3, label: '3 min', desc: 'Normal' },
                    { value: 5, label: '5 min', desc: 'Slow' },
                    { value: 0, label: 'Instant', desc: 'All at once' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSendSpeed(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: sendSpeed === opt.value ? '2px solid #6366F1' : '1px solid #3d3d5c',
                        background: sendSpeed === opt.value ? 'rgba(99,102,241,0.15)' : '#20203a',
                        color: sendSpeed === opt.value ? '#A5B4FC' : '#94A3B8',
                        cursor: 'pointer',
                        textAlign: 'center' as const,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0' }}>
                  {sendSpeed === 0
                    ? `All ${totalSelectedContacts} emails sent immediately`
                    : `1 email every ${sendSpeed} min — ~${(totalSelectedContacts - 1) * sendSpeed} min total for ${totalSelectedContacts} contacts`}
                </p>
              </div>

              {/* Warning when all selected contacts have no email */}
              {hasNoValidRecipients && (
                <div style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.4)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#EA580C' }}>
                  ⚠️ <strong>No valid email addresses found</strong> in the selected companies. All contacts have blank emails. Go back and select companies that show email addresses.
                </div>
              )}

              {/* Send button — shows confirmation first */}
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={sending || totalSelectedContacts === 0 || hasNoValidRecipients}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                    background: (totalSelectedContacts === 0 || hasNoValidRecipients) ? 'rgba(100,100,120,0.3)' : 'linear-gradient(to right, #10B981, #059669)',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    cursor: (totalSelectedContacts === 0 || hasNoValidRecipients) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {sendSpeed === 0
                    ? `🚀 Send All ${totalSelectedContacts} Emails Now`
                    : `🚀 Start Sending — 1 every ${sendSpeed} min`}
                </button>
              ) : (
                <div style={{
                  border: '2px solid #F59E0B', borderRadius: '12px', padding: '20px',
                  background: 'rgba(245,158,11,0.06)', marginBottom: '0',
                }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#F59E0B', margin: '0 0 12px', textAlign: 'center' }}>
                    Confirm Campaign Send
                  </p>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.7, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Recipients</span>
                      <span style={{ fontWeight: 700 }}>{totalSelectedContacts} contacts</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Speed</span>
                      <span style={{ fontWeight: 700 }}>{sendSpeed === 0 ? 'Instant (all at once)' : `1 every ${sendSpeed} min`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#94A3B8' }}>Estimated time</span>
                      <span style={{ fontWeight: 700 }}>{sendSpeed === 0 ? 'Immediate' : `~${(totalSelectedContacts - 1) * sendSpeed} min`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                      <span style={{ color: '#94A3B8' }}>Subject</span>
                      <span style={{ fontWeight: 700, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.replace(/\{\{companyName\}\}/g, '[Co]').slice(0, 50)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '12px', color: '#F59E0B', margin: '0 0 16px', textAlign: 'center', fontWeight: 600 }}>
                    Real emails will be sent from peter@techcloudpro.com. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setShowConfirm(false)}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                        color: '#94A3B8', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setShowConfirm(false); handleSend(); }}
                      disabled={sending}
                      style={{
                        flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                        background: sending ? 'rgba(16,185,129,0.4)' : 'linear-gradient(to right, #10B981, #059669)',
                        color: '#fff', fontWeight: 700, fontSize: '14px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {sending ? 'Sending...' : `Confirm — Send ${totalSelectedContacts} Emails`}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div style={{
                  marginTop: '12px', padding: '14px 16px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}>
                  <p style={{ color: '#F87171', fontSize: '13px', margin: 0, flex: 1 }}>
                    {error}
                  </p>
                  <button
                    onClick={() => { setShowConfirm(false); handleSend(); }}
                    disabled={sending}
                    style={{
                      background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                      color: '#F87171', padding: '6px 14px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Retry
                  </button>
                </div>
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
            );
          })()}

          {/* ======================== STEP 4: LIVE PROGRESS ======================== */}
          {step === 4 && sendResult && (() => {
            const p = sendProgress;
            const isComplete = p?.status === 'complete';
            const progressPct = p && p.total > 0 ? Math.round((p.sent / p.total) * 100) : 0;
            const nextMin = p ? Math.floor(p.nextSendInSeconds / 60) : 0;
            const nextSec = p ? p.nextSendInSeconds % 60 : 0;

            return (
            <div style={{ textAlign: 'center' }}>
              {/* Status icon */}
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: isComplete
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: isComplete ? '0 0 30px rgba(16,185,129,0.3)' : '0 0 30px rgba(99,102,241,0.3)',
              }}>
                <span style={{ fontSize: '36px' }}>{isComplete ? '✓' : '📨'}</span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 8px' }}>
                {isComplete ? 'Campaign Complete!' : 'Sending Campaign...'}
              </h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px' }}>
                {isComplete
                  ? `All ${p?.sent || 0} emails delivered successfully`
                  : `Sending 1 email every ${sendSpeed} min — ${p?.remaining || 0} remaining`}
              </p>

              {/* Progress bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  height: '8px', borderRadius: '4px', background: '#252540', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    background: isComplete
                      ? 'linear-gradient(to right, #10B981, #059669)'
                      : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                    width: `${progressPct}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{progressPct}%</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{p?.sent || 0} / {p?.total || 0}</span>
                </div>
              </div>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981' }}>{p?.sent || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Sent</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366F1' }}>{p?.remaining || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Remaining</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>{p?.failed || 0}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Failed</div>
                </div>
                <div style={{ background: '#20203a', border: '1px solid #3d3d5c', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#A5B4FC' }}>
                    {isComplete ? '—' : `${nextMin}:${nextSec.toString().padStart(2, '0')}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Next send</div>
                </div>
              </div>

              {/* Live indicator */}
              {!isComplete && (
                <div style={{
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#A5B4FC',
                  marginBottom: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%', background: '#10B981',
                    display: 'inline-block', animation: 'pulse 2s infinite',
                  }} />
                  Sending in progress — this page updates every 10 seconds. You can close and check back later.
                </div>
              )}

              {/* Done button */}
              <button
                onClick={() => { onClose(); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                  background: isComplete
                    ? 'linear-gradient(to right, #10B981, #059669)'
                    : 'linear-gradient(to right, #6366F1, #8B5CF6)',
                  color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                {isComplete ? 'Done — View Campaigns' : 'Close — Sending Continues in Background'}
              </button>
            </div>
            );
          })()}
        </div>

        {/* CSS for spinner */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default CampaignWizard;
