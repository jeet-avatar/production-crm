# Company Details CSV Upload - Frontend Implementation Guide

## Overview
This guide provides everything needed to implement the CSV upload and manual update functionality for company details in the frontend application.

## Backend APIs Deployed

### 1. CSV Upload Endpoint
**Endpoint**: `POST /api/companies/:id/upload-details`

**Authentication**: Required (JWT Bearer token)

**Request Type**: `multipart/form-data`

**Parameters**:
- `id` (path parameter): Company ID
- `file` (form-data): CSV file

**Response**:
```json
{
  "message": "Company details uploaded successfully from CSV",
  "company": {
    "id": "company-id",
    "name": "Company Name",
    "website": "https://example.com",
    "industry": "Technology",
    "size": "50-100",
    "location": "San Francisco, CA",
    "description": "Company description",
    "linkedin": "https://linkedin.com/company/example",
    "domain": "example.com",
    "employeeCount": "75",
    "revenue": "$10M",
    "foundedYear": 2020,
    "phone": "+1-555-0100",
    "dataSource": "csv_upload",
    "fieldSources": {
      "website": "csv_upload",
      "industry": "csv_upload",
      "size": "csv_upload"
    },
    "importedAt": "2025-10-11T18:30:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z"
  },
  "fieldsUpdated": ["website", "industry", "size", "location", "description"],
  "dataSource": "csv_upload"
}
```

### 2. Manual Update Endpoint
**Endpoint**: `POST /api/companies/:id/manual-update`

**Authentication**: Required (JWT Bearer token)

**Request Type**: `application/json`

**Parameters**:
```json
{
  "website": "https://example.com",
  "industry": "Technology",
  "size": "50-100",
  "location": "San Francisco, CA",
  "description": "Company description",
  "linkedin": "https://linkedin.com/company/example",
  "domain": "example.com",
  "employeeCount": "75",
  "revenue": "$10M",
  "foundedYear": 2020,
  "phone": "+1-555-0100"
}
```

**Response**:
```json
{
  "message": "Company details updated manually",
  "company": { /* Same structure as above */ },
  "fieldsUpdated": ["website", "industry", "size"],
  "dataSource": "manual_research"
}
```

## CSV File Format

### Supported Column Headers
The API supports multiple variations of column names (case-insensitive):

| Field | Supported Headers |
|-------|------------------|
| Website | `website`, `Website`, `WEBSITE`, `url`, `site` |
| Industry | `industry`, `Industry`, `INDUSTRY`, `sector`, `vertical` |
| Size | `size`, `Size`, `SIZE`, `companySize`, `company size` |
| Location | `location`, `Location`, `LOCATION`, `headquarters`, `hq`, `city`, `address` |
| Description | `description`, `Description`, `DESCRIPTION`, `about`, `overview` |
| LinkedIn | `linkedin`, `LinkedIn`, `LINKEDIN` |
| Domain | `domain`, `Domain`, `DOMAIN` |
| Employee Count | `employeeCount`, `Employee Count`, `employees` |
| Revenue | `revenue`, `Revenue`, `REVENUE`, `annualRevenue` |
| Founded Year | `foundedYear`, `Founded Year`, `founded` |
| Phone | `phone`, `Phone`, `PHONE`, `telephone`, `tel` |

### Example CSV Template

```csv
website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone
https://example.com,Technology,50-100,San Francisco CA,Example company description,https://linkedin.com/company/example,example.com,75,$10M,2020,+1-555-0100
```

### Download Template
Create a CSV template file that users can download:

```csv
website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone
```

## React Component Example

### CompanyDetailsUpload.tsx
```tsx
import React, { useState } from 'react';
import axios from 'axios';

interface CompanyDetailsUploadProps {
  companyId: string;
  onSuccess?: () => void;
  authToken: string;
}

export const CompanyDetailsUpload: React.FC<CompanyDetailsUploadProps> = ({
  companyId,
  onSuccess,
  authToken
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/companies/${companyId}/upload-details`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSuccess(response.data.message);
      setFile(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload CSV');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'company-details-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="company-details-upload">
      <h3>Upload Company Details from CSV</h3>

      <div className="upload-section">
        <button
          onClick={downloadTemplate}
          className="btn-secondary"
        >
          Download CSV Template
        </button>

        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && <span className="file-name">{file.name}</span>}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-primary"
        >
          {loading ? 'Uploading...' : 'Upload CSV'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
    </div>
  );
};
```

### CompanyManualUpdate.tsx
```tsx
import React, { useState } from 'react';
import axios from 'axios';

interface CompanyManualUpdateProps {
  companyId: string;
  initialData?: Partial<CompanyData>;
  onSuccess?: () => void;
  authToken: string;
}

interface CompanyData {
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  linkedin?: string;
  domain?: string;
  employeeCount?: string;
  revenue?: string;
  foundedYear?: number;
  phone?: string;
}

export const CompanyManualUpdate: React.FC<CompanyManualUpdateProps> = ({
  companyId,
  initialData = {},
  onSuccess,
  authToken
}) => {
  const [formData, setFormData] = useState<CompanyData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'foundedYear' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/companies/${companyId}/manual-update`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSuccess(response.data.message);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="company-manual-update">
      <h3>Update Company Details Manually</h3>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website || ''}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="domain">Domain</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain || ''}
            onChange={handleChange}
            placeholder="example.com"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="industry">Industry</label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={formData.industry || ''}
            onChange={handleChange}
            placeholder="Technology"
          />
        </div>

        <div className="form-group">
          <label htmlFor="size">Company Size</label>
          <input
            type="text"
            id="size"
            name="size"
            value={formData.size || ''}
            onChange={handleChange}
            placeholder="50-100"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="location">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location || ''}
          onChange={handleChange}
          placeholder="San Francisco, CA"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={4}
          placeholder="Company description..."
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="linkedin">LinkedIn</label>
          <input
            type="url"
            id="linkedin"
            name="linkedin"
            value={formData.linkedin || ''}
            onChange={handleChange}
            placeholder="https://linkedin.com/company/example"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            placeholder="+1-555-0100"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="employeeCount">Employee Count</label>
          <input
            type="text"
            id="employeeCount"
            name="employeeCount"
            value={formData.employeeCount || ''}
            onChange={handleChange}
            placeholder="75"
          />
        </div>

        <div className="form-group">
          <label htmlFor="revenue">Revenue</label>
          <input
            type="text"
            id="revenue"
            name="revenue"
            value={formData.revenue || ''}
            onChange={handleChange}
            placeholder="$10M"
          />
        </div>

        <div className="form-group">
          <label htmlFor="foundedYear">Founded Year</label>
          <input
            type="number"
            id="foundedYear"
            name="foundedYear"
            value={formData.foundedYear || ''}
            onChange={handleChange}
            placeholder="2020"
            min="1800"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Updating...' : 'Update Company Details'}
      </button>
    </form>
  );
};
```

### DataSourceBadge.tsx
```tsx
import React from 'react';

interface DataSourceBadgeProps {
  source: 'csv_upload' | 'manual_research' | 'ai_enrichment' | 'api_import' | 'csv_import';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source }) => {
  const badgeConfig = {
    csv_upload: {
      label: 'CSV Upload',
      color: 'blue',
      icon: '📄'
    },
    manual_research: {
      label: 'Manual Research',
      color: 'green',
      icon: '✏️'
    },
    ai_enrichment: {
      label: 'AI Enriched',
      color: 'purple',
      icon: '🤖'
    },
    api_import: {
      label: 'API Import',
      color: 'orange',
      icon: '🔄'
    },
    csv_import: {
      label: 'CSV Import',
      color: 'teal',
      icon: '📊'
    }
  };

  const config = badgeConfig[source] || badgeConfig.manual_research;

  return (
    <span className={`badge badge-${config.color}`}>
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-label">{config.label}</span>
    </span>
  );
};
```

### CompanyDetailsPage.tsx (Integration Example)
```tsx
import React, { useState, useEffect } from 'react';
import { CompanyDetailsUpload } from './CompanyDetailsUpload';
import { CompanyManualUpdate } from './CompanyManualUpdate';
import { DataSourceBadge } from './DataSourceBadge';
import axios from 'axios';

interface CompanyDetailsPageProps {
  companyId: string;
  authToken: string;
}

export const CompanyDetailsPage: React.FC<CompanyDetailsPageProps> = ({
  companyId,
  authToken
}) => {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'csv' | 'manual'>('view');

  const fetchCompany = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/companies/${companyId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      setCompany(response.data.company);
    } catch (error) {
      console.error('Failed to fetch company', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="company-details-page">
      <div className="page-header">
        <h1>{company.name}</h1>
        {company.dataSource && (
          <DataSourceBadge source={company.dataSource} />
        )}
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'view' ? 'active' : ''}
          onClick={() => setActiveTab('view')}
        >
          View Details
        </button>
        <button
          className={activeTab === 'csv' ? 'active' : ''}
          onClick={() => setActiveTab('csv')}
        >
          Upload CSV
        </button>
        <button
          className={activeTab === 'manual' ? 'active' : ''}
          onClick={() => setActiveTab('manual')}
        >
          Manual Update
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'view' && (
          <div className="company-details">
            <div className="detail-row">
              <label>Website:</label>
              <span>{company.website || 'N/A'}</span>
              {company.fieldSources?.website && (
                <DataSourceBadge source={company.fieldSources.website} />
              )}
            </div>

            <div className="detail-row">
              <label>Industry:</label>
              <span>{company.industry || 'N/A'}</span>
              {company.fieldSources?.industry && (
                <DataSourceBadge source={company.fieldSources.industry} />
              )}
            </div>

            <div className="detail-row">
              <label>Size:</label>
              <span>{company.size || 'N/A'}</span>
              {company.fieldSources?.size && (
                <DataSourceBadge source={company.fieldSources.size} />
              )}
            </div>

            <div className="detail-row">
              <label>Location:</label>
              <span>{company.location || 'N/A'}</span>
              {company.fieldSources?.location && (
                <DataSourceBadge source={company.fieldSources.location} />
              )}
            </div>

            <div className="detail-row">
              <label>LinkedIn:</label>
              <span>
                {company.linkedin ? (
                  <a href={company.linkedin} target="_blank" rel="noopener noreferrer">
                    {company.linkedin}
                  </a>
                ) : 'N/A'}
              </span>
              {company.fieldSources?.linkedin && (
                <DataSourceBadge source={company.fieldSources.linkedin} />
              )}
            </div>

            <div className="detail-row">
              <label>Phone:</label>
              <span>{company.phone || 'N/A'}</span>
              {company.fieldSources?.phone && (
                <DataSourceBadge source={company.fieldSources.phone} />
              )}
            </div>

            <div className="detail-row">
              <label>Employee Count:</label>
              <span>{company.employeeCount || 'N/A'}</span>
              {company.fieldSources?.employeeCount && (
                <DataSourceBadge source={company.fieldSources.employeeCount} />
              )}
            </div>

            <div className="detail-row">
              <label>Revenue:</label>
              <span>{company.revenue || 'N/A'}</span>
              {company.fieldSources?.revenue && (
                <DataSourceBadge source={company.fieldSources.revenue} />
              )}
            </div>

            <div className="detail-row">
              <label>Founded Year:</label>
              <span>{company.foundedYear || 'N/A'}</span>
              {company.fieldSources?.foundedYear && (
                <DataSourceBadge source={company.fieldSources.foundedYear} />
              )}
            </div>

            <div className="detail-row full-width">
              <label>Description:</label>
              <p>{company.description || 'N/A'}</p>
              {company.fieldSources?.description && (
                <DataSourceBadge source={company.fieldSources.description} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'csv' && (
          <CompanyDetailsUpload
            companyId={companyId}
            authToken={authToken}
            onSuccess={() => {
              fetchCompany();
              setActiveTab('view');
            }}
          />
        )}

        {activeTab === 'manual' && (
          <CompanyManualUpdate
            companyId={companyId}
            initialData={company}
            authToken={authToken}
            onSuccess={() => {
              fetchCompany();
              setActiveTab('view');
            }}
          />
        )}
      </div>
    </div>
  );
};
```

## CSS Styling Example

```css
.company-details-upload,
.company-manual-update {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-size: 14px;
  color: #666;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.form-group input,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #45a049;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.alert {
  padding: 12px 16px;
  border-radius: 4px;
  margin-top: 16px;
  font-size: 14px;
}

.alert-error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef5350;
}

.alert-success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #66bb6a;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-blue {
  background-color: #e3f2fd;
  color: #1976d2;
}

.badge-green {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.badge-purple {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.badge-orange {
  background-color: #fff3e0;
  color: #ef6c00;
}

.badge-teal {
  background-color: #e0f2f1;
  color: #00695c;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e0e0e0;
}

.tabs button {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  transition: all 0.3s;
  margin-bottom: -2px;
}

.tabs button.active {
  color: #4CAF50;
  border-bottom-color: #4CAF50;
}

.tabs button:hover {
  color: #4CAF50;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row label {
  font-weight: 600;
  min-width: 150px;
  color: #666;
}

.detail-row span {
  flex: 1;
  color: #333;
}

.detail-row.full-width {
  flex-direction: column;
  align-items: flex-start;
}

.detail-row.full-width p {
  margin: 8px 0;
  line-height: 1.6;
}
```

## Testing

### Test with cURL

**CSV Upload:**
```bash
curl -X POST \
  http://sandbox.brandmonkz.com:3000/api/companies/{COMPANY_ID}/upload-details \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'file=@company-details.csv'
```

**Manual Update:**
```bash
curl -X POST \
  http://sandbox.brandmonkz.com:3000/api/companies/{COMPANY_ID}/manual-update \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "website": "https://example.com",
    "industry": "Technology",
    "size": "50-100",
    "location": "San Francisco, CA"
  }'
```

## Environment Variables

Add to your frontend `.env` file:

```env
REACT_APP_API_URL=http://sandbox.brandmonkz.com:3000
```

For production:
```env
REACT_APP_API_URL=https://api.brandmonkz.com
```

## Implementation Checklist

- [ ] Install axios for API calls: `npm install axios`
- [ ] Create `CompanyDetailsUpload` component
- [ ] Create `CompanyManualUpdate` component
- [ ] Create `DataSourceBadge` component
- [ ] Integrate into company details page
- [ ] Add CSV template download functionality
- [ ] Add file validation (CSV only, max 10MB)
- [ ] Add loading states during upload/update
- [ ] Add error handling and user feedback
- [ ] Add success messages
- [ ] Style components to match existing design
- [ ] Test CSV upload with sample data
- [ ] Test manual update with various fields
- [ ] Test authentication flow
- [ ] Test error scenarios (invalid file, network errors, etc.)

## Notes

1. **File Size Limit**: Backend accepts files up to 10MB
2. **CSV Parsing**: Only the first row of CSV is used for single company updates
3. **Data Source Tracking**: Each field tracks its origin independently in `fieldSources` JSON
4. **Company-Level Source**: `dataSource` field tracks the most recent update method
5. **Case Insensitive**: Column headers are case-insensitive
6. **Authentication**: All endpoints require JWT Bearer token
7. **User Isolation**: Users can only update their own companies

## Support

For backend issues or questions, refer to:
- API source code: `/src/routes/companies.ts` lines 350-549
- Deployed server: `ec2-user@18.212.225.252:~/crm-backend`
- Server URL: `http://sandbox.brandmonkz.com:3000`
