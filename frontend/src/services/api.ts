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

  checkProxycurlCredits: async () => {
    const response = await apiClient.get('/companies/proxycurl/credits');
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

export default apiClient;
