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
  getAll: async (params?: { search?: string; status?: string; source?: string; page?: number; limit?: number }) => {
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

  // Fetch a specific batch of contacts by ID — used by NetSuiteCampaignWizard after Apollo import
  getByIds: async (ids: string[]) => {
    if (ids.length === 0) return { contacts: [] };
    const response = await apiClient.get('/contacts', { params: { ids: ids.join(',') } });
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

  // AI body generation — used by NetSuiteCampaignWizard's "Let AI write it for me" button.
  // Hits the existing /api/campaigns/ai/generate-content endpoint (content-only — does NOT send).
  aiGenerateContent: async (goal: string, tone: string, companyName: string) => {
    const response = await apiClient.post('/campaigns/ai/generate-content', { goal, tone, companyName });
    return response.data;
  },
};

// Email Templates API
export const emailTemplatesApi = {
  // First-match lookup by category — used by NetSuiteCampaignWizard for per-stream template pre-fill.
  // Backend: GET /api/email-templates?category=Stream:<x> (extended in plan 04-03 Task 2).
  findByCategory: async (category: string) => {
    const response = await apiClient.get('/email-templates', { params: { category } });
    return response.data?.templates?.[0] || null;
  },
};

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

// Apollo Prospecting API
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
  // quick-7: Claude normalization output (when autoNormalize was true on the backend, default).
  corrections?: Array<{ field: string; from: string; to: string; reason: string }>;
  warning?: string;   // present when Claude was unavailable / timed out / errored — search still ran with raw filters
}

// quick-7: Standalone normalization response (from POST /api/apollo/normalize-filters).
export interface ApolloNormalizeResponse {
  normalized: ApolloSearchFilters;
  corrections: Array<{ field: string; from: string; to: string; reason: string }>;
  warning?: string;
}

export interface ApolloSendCampaignFailure {
  contactId: string;
  email: string | null;
  error: string;
}

export interface ApolloSendCampaignResponse {
  sent: number;
  failed: number;
  failureDetails: ApolloSendCampaignFailure[];
}

// Phase 05 plan 05-02: per-contact AI-personalized send response shapes.
export interface ApolloPersonalizeAITokens {
  intentHook: string | null;
  companyContext: string | null;
  painPoint: string | null;
  cta: string | null;
}

export interface ApolloPersonalizeAuditEntry {
  contactId: string;
  email: string;
  auditId: string;
  subject?: string;
  renderedBody?: string;
  aiTokens?: ApolloPersonalizeAITokens | null;
  aiWarning?: string | null;
  claudeInputTokens?: number;
  claudeOutputTokens?: number;
  webSearchUses?: number;
  resendMessageId?: string | null;
  status: 'sent' | 'preview' | 'failed';
}

export interface ApolloPersonalizedCampaignCost {
  claudeInputTokens: number;
  claudeOutputTokens: number;
  webSearchRequests: number;
  claudeCostUSD: number;
  resendSendsCounted: number;
  resendCostUSD: number;
  totalCostUSD: number;
}

export interface ApolloPersonalizedCampaignResponse {
  sent: number;
  failed: number;
  personalized: number;
  personalizeFailures: number;
  failureDetails: Array<{ contactId: string; email: string; error: string }>;
  audit: ApolloPersonalizeAuditEntry[];
  cost: ApolloPersonalizedCampaignCost;
}

export interface ApolloSendPersonalizedRequest {
  contactIds: string[];
  templateId: string;
  suggestedStream: string;
  testRecipient?: string;
  previewOnly?: boolean;
  confirmedLargeBatch?: boolean;
}

export const apolloApi = {
  import: async (
    filters: ApolloSearchFilters,
    enrich = true,
  ): Promise<ApolloImportResponse> => {
    // apiClient baseURL already includes `/api`, so path here is `/apollo/import`.
    // Per-call 120s timeout: Apollo search + enrichment can take 30-60s for perPage=25
    // (each enrichPerson is ~1s + 1500ms pacing per Apollo rate-limit pitfall). Default 10s
    // makes axios throw 'Network error' before backend responds — bug surfaced 2026-05-30
    // when user clicked Search with NetSuite keyword. Other *Api clients keep the 10s default.
    const response = await apiClient.post(
      '/apollo/import',
      { filters, enrich },
      { timeout: 120000 },
    );
    return response.data;
  },

  // quick-7: Standalone Claude normalization preview — no Apollo search performed.
  // Returns { normalized, corrections, warning? } so the UI can preview the corrections
  // BEFORE clicking Search. (Optional method — current Search flow piggybacks corrections
  // on /import's response. Kept here for future "preview" button or scripted callers.)
  normalize: async (
    filters: ApolloSearchFilters,
  ): Promise<ApolloNormalizeResponse> => {
    // Claude has its own 3s server-side budget — 10s axios default is plenty.
    const response = await apiClient.post('/apollo/normalize-filters', { filters });
    return response.data;
  },

  // Phase 4 USER-LOCKED send path: hits the Resend dispatcher built in plan 04-03 Task 3,
  // NOT the existing campaigns.ts SES path. Server-side handles {{firstName}}/{{companyName}}
  // variable substitution per recipient and pacing.
  // Per-call 120s timeout: Resend dispatcher paces 100ms between recipients per contact;
  // a 25-contact batch can take ~5s but 100-contact batches push past 10s. Cap at 120s.
  sendCampaign: async (
    contactIds: string[],
    templateId: string,
    suggestedStream: string,
  ): Promise<ApolloSendCampaignResponse> => {
    const response = await apiClient.post(
      '/apollo/send-campaign',
      { contactIds, templateId, suggestedStream },
      { timeout: 120000 },
    );
    return response.data;
  },

  // Phase 05 plan 05-02: per-contact AI-personalized send.
  // Calls Claude once per contact (web_search_20250305) and dispatches via Resend.
  // AI personalization + Resend serial send needs a generous per-call cap.
  // 25 contacts × (12s Claude + 250ms pacing + send) ≈ 6 min worst case.
  // Use 600s (10 min) to cover up to the 50-contact cap with margin.
  sendPersonalizedCampaign: (
    params: ApolloSendPersonalizedRequest,
  ): Promise<{ data: ApolloPersonalizedCampaignResponse }> =>
    apiClient.post('/apollo/send-personalized-campaign', params, {
      timeout: 600_000,
    }),
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
