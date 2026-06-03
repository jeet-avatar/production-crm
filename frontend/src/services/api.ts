import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('crmToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error - backend server may be down');
      return Promise.reject(new Error('Network error - please check if the backend server is running'));
    }
    
    // Handle specific HTTP errors
    if (error.response.status === 404) {
      console.error('API endpoint not found:', error.config.url);
    }
    
    return Promise.reject(error);
  }
);

// Contacts API
export const contactsApi = {
  getAll: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/contacts', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/contacts/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/contacts', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/contacts/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/contacts/${id}`);
    return response.data;
  },
};

// Companies API
export const companiesApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/companies', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/companies/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/companies', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/companies/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/companies/${id}`);
    return response.data;
  },

  // LinkedIn Employee Data
  getCompanyEmployees: async (id: string, params?: { limit?: number; enrich?: boolean }) => {
    const response = await apiClient.get(`/companies/${id}/employees`, { params });
    return response.data;
  },

  importEmployeesAsContacts: async (id: string, employeeUrls: string[]) => {
    const response = await apiClient.post(`/companies/${id}/employees/import`, { employeeUrls });
    return response.data;
  },

  checkRapidAPIUsage: async () => {
    const response = await apiClient.get('/companies/rapidapi/usage');
    return response.data;
  },
};

// Deals API
export const dealsApi = {
  getAll: async (params?: { search?: string; stage?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/deals', { params });
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/deals/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await apiClient.post('/deals', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/deals/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/deals/${id}`);
    return response.data;
  },
  
  updateStage: async (id: string, stage: string) => {
    const response = await apiClient.patch(`/deals/${id}/stage`, { stage });
    return response.data;
  },
};

// Activities API
export const activitiesApi = {
  getAll: async (params?: { type?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/activities', { params });
    return response.data;
  },

  getByContact: async (contactId: string) => {
    const response = await apiClient.get(`/activities/contacts/${contactId}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/activities', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/activities/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/activities/${id}`);
    return response.data;
  },
};

// Tags API
export const tagsApi = {
  getAll: async () => {
    const response = await apiClient.get('/tags');
    return response.data;
  },

  create: async (data: { name: string; color?: string }) => {
    const response = await apiClient.post('/tags', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; color?: string }) => {
    const response = await apiClient.put(`/tags/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/tags/${id}`);
    return response.data;
  },
};

// Campaigns API
export const campaignsApi = {
  getAll: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/campaigns', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/campaigns/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/campaigns/${id}`);
    return response.data;
  },

  // Phase 10 — fetch merged NetSuite subject options (5 hardcoded + N DB templates).
  // Returns { subjects: NetsuiteSubjectOption[] } where each option carries either
  // `index` (code source → maps to POST quick-send subjectVariant) or `templateId`
  // (db source → maps to POST quick-send templateId). The wizard uses this to let
  // Rajesh pick exactly which subject + body to dispatch.
  getNetsuiteSubjects: async (): Promise<{ subjects: NetsuiteSubjectOption[] }> => {
    const response = await apiClient.get('/campaigns/netsuite-subjects');
    return response.data;
  },
};

// Phase 10 — option shape returned by /api/campaigns/netsuite-subjects.
// `source` discriminates which dispatch field to pass to POST quick-send:
//   - source='code'  → pass subjectVariant: option.index
//   - source='db'    → pass templateId: option.templateId
export interface NetsuiteSubjectOption {
  id: string;
  subject: string;
  source: 'code' | 'db';
  bodySource: 'hardcoded' | 'db-template';
  index?: number;
  templateId?: string;
  templateName?: string;
}

// Analytics API
export const analyticsApi = {
  getDashboard: async (timeRange?: string) => {
    const response = await apiClient.get('/analytics/dashboard', { params: { timeRange } });
    return response.data;
  },

  getRevenue: async (timeRange?: string) => {
    const response = await apiClient.get('/analytics/revenue', { params: { timeRange } });
    return response.data;
  },

  getPipeline: async () => {
    const response = await apiClient.get('/analytics/pipeline');
    return response.data;
  },

  getLeadSources: async () => {
    const response = await apiClient.get('/analytics/lead-sources');
    return response.data;
  },
};

// Email Composer API
export const emailComposerApi = {
  getAll: async () => {
    const response = await apiClient.get('/email-composer');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/email-composer/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/email-composer', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/email-composer/${id}`, data);
    return response.data;
  },

  send: async (id: string) => {
    const response = await apiClient.post(`/email-composer/${id}/send`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/email-composer/${id}`);
    return response.data;
  },
};

// Enrichment API
export const enrichmentApi = {
  enrichCompany: async (companyId: string) => {
    const response = await apiClient.post(`/enrichment/companies/${companyId}/enrich`);
    return response.data;
  },

  bulkEnrich: async (companyIds: string[]) => {
    const response = await apiClient.post('/enrichment/companies/bulk-enrich', { companyIds });
    return response.data;
  },
};

// CSV Import API
export const csvImportApi = {
  getAll: async () => {
    const response = await apiClient.get('/csv-import');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/csv-import/${id}`);
    return response.data;
  },

  upload: async (file: File, entityType: string, mapping?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    const response = await apiClient.post('/csv-import/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  process: async (id: string, data: any[], mapping: any) => {
    const response = await apiClient.post(`/csv-import/${id}/process`, { data, mapping });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/csv-import/${id}`);
    return response.data;
  },
};

// Quotes API
export const quotesApi = {
  getAll: async () => {
    const response = await apiClient.get('/quotes');
    return response.data;
  },
  getByDeal: async (dealId: string) => {
    const response = await apiClient.get('/quotes', { params: { dealId } });
    return response.data;
  },
  create: async (data: { dealId: string; title: string; lineItems: any[]; subtotal: number; tax?: number; total: number; notes?: string; validUntil?: string }) => {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ title: string; lineItems: any[]; subtotal: number; tax?: number; total: number; notes?: string; validUntil?: string }>) => {
    const response = await apiClient.put(`/quotes/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/quotes/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/quotes/${id}`);
    return response.data;
  },
};

// Contracts API
export const contractsApi = {
  getAll: async () => {
    const response = await apiClient.get('/contracts');
    return response.data;
  },
  getByDeal: async (dealId: string) => {
    const response = await apiClient.get('/contracts', { params: { dealId } });
    return response.data;
  },
  create: async (data: { dealId: string; title: string; content: string; quoteId?: string; variables?: Record<string, string> }) => {
    const response = await apiClient.post('/contracts', data);
    return response.data;
  },
  update: async (id: string, data: Partial<{ title: string; content: string; variables?: Record<string, string> }>) => {
    const response = await apiClient.put(`/contracts/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: string, status: string, signedBy?: string) => {
    const response = await apiClient.patch(`/contracts/${id}/status`, { status, signedBy });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/contracts/${id}`);
    return response.data;
  },
};

// ============================================================================
// Apollo Prospecting API (Phase 04-02 — ported from production b005169)
// ----------------------------------------------------------------------------
// Backed by backend/src/routes/apollo.ts (shipped 04-01):
//   POST /api/apollo/import         body: { filters, apiKey?, enrich?, limit? }
//   POST /api/apollo/send-campaign  body: { contactIds, stream, fromEmail? }
//
// /send-campaign uses Resend (NOT SES) with 3-layer template fallback:
//   Stream:<x> -> Stream:Other -> hardcoded default. fromEmail/fromName are
//   ignored by the backend (Sara protection — APOLLO_FROM_EMAIL is hardcoded).
// ============================================================================
export interface ApolloSearchFilters {
  personTitles?: string[];
  personLocations?: string[];
  organizationKeywordTags?: string[];
  organizationDomains?: string[];
  minEmployees?: number;
  maxEmployees?: number;
  page?: number;
  perPage?: number;
}

export interface ApolloImportResponse {
  imported: number;
  skipped: number;
  total: number;
  contactIds: string[];
  suggestedStream: string;
  errors: Array<{ apolloPersonId: string; reason: string }>;
}

export interface ApolloSendCampaignFailure {
  contactId: string;
  email: string | null;
  error: string;
}

export interface ApolloSendCampaignResponse {
  sent: number;
  failed: number;
  failureDetails?: ApolloSendCampaignFailure[];
  // Phase 04-08 — scheduled-send fields (present when scheduledAt was in the future)
  scheduled?: boolean;
  scheduledAt?: string;
  count?: number;
  campaignId?: string;
}

// -----------------------------------------------------------------------
// Phase 04-05 — AI personalization types
// -----------------------------------------------------------------------

export interface ApolloPersonalizedSendRow {
  id: string;
  contactId: string;
  templateId: string;
  stream: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  renderedBody: string;
  aiTokens: {
    intentHook: string | null;
    companyContext: string | null;
    painPoint: string | null;
    cta: string | null;
  } | null;
  aiWarning: string | null;
  claudeInputTokens: number;
  claudeOutputTokens: number;
  webSearchUses: number;
  claudeCostUSD: string | number; // Prisma Decimal serializes as string over JSON
  status: 'pending' | 'preview' | 'sent' | 'failed';
  createdAt: string;
}

export interface ApolloPersonalizedPreviewResponse {
  preview: ApolloPersonalizedSendRow;
  cached: boolean;
}

export interface ApolloPersonalizedSendCost {
  claudeInputTokens: number;
  claudeOutputTokens: number;
  webSearchRequests: number;
  claudeCostUSD: number;
  resendSendsCounted: number;
  resendCostUSD: number;
  totalCostUSD: number;
}

export interface ApolloPersonalizedSendResponse {
  sent: number;
  failed: number;
  personalized: number;
  personalizeFailures: number;
  campaignId: string;
  failureDetails: ApolloSendCampaignFailure[];
  audit: any[];
  cost: ApolloPersonalizedSendCost;
  // Phase 04-08 — scheduled-send fields (present when scheduledAt was in the future)
  scheduled?: boolean;
  scheduledAt?: string;
  count?: number;
}

export interface ApolloSendPersonalizedRequest {
  contactIds: string[];
  templateId: string;
  mode: 'preview' | 'send';
  scheduledAt?: string; // Phase 04-08 — ISO datetime; honored in 'send' mode only.
}

export const apolloApi = {
  // POST /api/apollo/import — search Apollo, optionally enrich, classify by stream,
  // dedupe by apolloPersonId, upsert Contact + Company.
  import: async (
    filters: ApolloSearchFilters,
    enrich = true,
  ): Promise<ApolloImportResponse> => {
    const response = await apiClient.post('/apollo/import', { filters, enrich });
    return response.data;
  },

  // POST /api/apollo/send-campaign — dispatches via Resend with stream-based
  // template fallback. Body shape MUST match backend (04-01 apollo.ts:317):
  // { contactIds, stream }. fromEmail is accepted but ignored server-side.
  //
  // Phase 04-08 — optional scheduledAt (ISO datetime). If in the future, backend
  // stages EmailLog rows with status='SCHEDULED' and returns immediately;
  // scheduledDispatcher polls every 30s and dispatches at scheduleTime.
  sendCampaign: async (
    contactIds: string[],
    stream: string,
    scheduledAt?: string,
  ): Promise<ApolloSendCampaignResponse> => {
    const response = await apiClient.post('/apollo/send-campaign', {
      contactIds,
      stream,
      ...(scheduledAt ? { scheduledAt } : {}),
    });
    return response.data;
  },

  // GET /api/apollo/stream-template/:stream — Phase 04-05 helper.
  // Resolves a Stream:<x> template id for the wizard's AI Personalize block.
  // 3-layer fallback: Stream:<x> -> Stream:Other -> 404. Frontend hides the
  // AI Preview block when 404 (means no template seed for this user yet).
  getStreamTemplate: async (
    stream: string,
  ): Promise<{
    template: { id: string; name: string; subject: string; category: string | null };
    source: 'stream' | 'stream-other';
  }> => {
    const response = await apiClient.get(
      `/apollo/stream-template/${encodeURIComponent(stream)}`,
    );
    return response.data;
  },

  // GET /api/apollo/icp-presets/:name — Phase 08 plan 08-02 helper.
  // Returns a named Apollo ICP filter preset (e.g. 'arthabuild'). Used by the
  // wizard's 'arthabuild' mode to pre-populate the Apollo search form so the
  // user doesn't re-type the NetSuite-admin/dev titles + US/Canada filter.
  // Backend: backend/src/routes/apollo.ts:755 (404 if preset name unknown).
  getIcpPreset: async (
    name: string,
  ): Promise<{ name: string; preset: ApolloSearchFilters }> => {
    const response = await apiClient.get(
      `/apollo/icp-presets/${encodeURIComponent(name)}`,
    );
    return response.data;
  },

  // POST /api/apollo/send-personalized-campaign — Phase 04-05 AI personalization.
  // mode='preview' → personalize FIRST contact only, cached per (firstContactId, templateId).
  // mode='send'    → personalize all (max 100), dispatch via Resend, create Campaign + EmailLog
  //                  rows linked via campaignId (visible in /campaigns/:id/analytics with
  //                  source='apollo-ai').
  //
  // 600s axios timeout per call — covers up to 100-contact batch (~14s/contact + 250ms pacing).
  sendPersonalizedCampaign: async (
    params: ApolloSendPersonalizedRequest,
  ): Promise<ApolloPersonalizedPreviewResponse | ApolloPersonalizedSendResponse> => {
    const response = await apiClient.post(
      '/apollo/send-personalized-campaign',
      params,
      { timeout: 600_000 },
    );
    return response.data;
  },
};

// Job Leads Pipeline API
export const jobLeadsApi = {
  fetch: async (stream?: string, forceRefresh?: boolean): Promise<{ leads: any[]; total: number; streams: Record<string, number>; error?: string; cached?: boolean }> => {
    const params = new URLSearchParams();
    if (stream) params.set('stream', stream);
    if (forceRefresh) params.set('refresh', 'true');
    const qs = params.toString();
    const url = `/job-leads/fetch${qs ? `?${qs}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },
  import: async (leads: any[]): Promise<{ imported: number; companies: string[] }> => {
    const response = await apiClient.post('/job-leads/import', { leads });
    return response.data;
  },
};

export default apiClient;
