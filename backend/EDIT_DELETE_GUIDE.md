# Company & Contact Edit/Delete - Complete Guide

## Overview

Good news! The backend APIs for editing and deleting both companies and contacts are **already implemented and deployed**. This guide provides everything you need to integrate these features into your frontend.

**Status**: ✅ **ALL ENDPOINTS LIVE AND OPERATIONAL**

---

## Table of Contents

1. [Company Endpoints](#company-endpoints)
2. [Contact Endpoints](#contact-endpoints)
3. [Frontend Components](#frontend-components)
4. [Testing Guide](#testing-guide)
5. [Security Notes](#security-notes)

---

## Company Endpoints

### 1. Edit Company (PUT)

**Endpoint**: `PUT /api/companies/:id`

**Description**: Update company details

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
PUT /api/companies/{COMPANY_ID}
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

Body:
{
  "name": "Updated Company Name",
  "domain": "company.com",
  "industry": "Technology",
  "size": "100-200",
  "description": "Updated description",
  "website": "https://company.com",
  "location": "San Francisco, CA"
}
```

**Response**:
```json
{
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn7",
    "name": "Updated Company Name",
    "domain": "company.com",
    "industry": "Technology",
    "size": "100-200",
    "description": "Updated description",
    "website": "https://company.com",
    "location": "San Francisco, CA",
    "userId": "user-id",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z",
    "_count": {
      "contacts": 5
    }
  }
}
```

**Error Responses**:
- `404 Not Found` - Company not found or not owned by user
- `401 Unauthorized` - Invalid or missing JWT token

---

### 2. Delete Company (DELETE)

**Endpoint**: `DELETE /api/companies/:id`

**Description**: Soft delete a company (marks as inactive, doesn't permanently delete)

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
DELETE /api/companies/{COMPANY_ID}
Authorization: Bearer {JWT_TOKEN}
```

**Response**:
```json
{
  "message": "Company deleted successfully"
}
```

**Error Responses**:
- `404 Not Found` - Company not found or not owned by user
- `401 Unauthorized` - Invalid or missing JWT token

**Note**: This is a soft delete. The company is marked as `isActive: false` but not removed from the database. Associated contacts remain but won't show the company in lists.

---

## Contact Endpoints

### 1. Edit Contact (PUT)

**Endpoint**: `PUT /api/contacts/:id`

**Description**: Update contact details

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
PUT /api/contacts/{CONTACT_ID}
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

Body:
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1-555-0123",
  "companyId": "cm2efhj8v00043b6l4u5fqrn7",
  "status": "CUSTOMER",
  "tagIds": ["tag-id-1", "tag-id-2"]
}
```

**Response**:
```json
{
  "contact": {
    "id": "cm2efhj8v00053b6l4u5fqrn8",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "phone": "+1-555-0123",
    "role": "CEO",
    "title": "Chief Executive Officer",
    "status": "CUSTOMER",
    "userId": "user-id",
    "companyId": "cm2efhj8v00043b6l4u5fqrn7",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z",
    "company": {
      "id": "cm2efhj8v00043b6l4u5fqrn7",
      "name": "Company Name",
      "domain": "company.com",
      "industry": "Technology"
    },
    "tags": [
      {
        "id": "tag-id-1",
        "name": "VIP",
        "color": "#FF5733"
      },
      {
        "id": "tag-id-2",
        "name": "Hot Lead",
        "color": "#33FF57"
      }
    ]
  }
}
```

**Error Responses**:
- `404 Not Found` - Contact not found or not owned by user
- `401 Unauthorized` - Invalid or missing JWT token
- `409 Conflict` - Email already in use by another contact

---

### 2. Delete Contact (DELETE)

**Endpoint**: `DELETE /api/contacts/:id`

**Description**: Soft delete a contact (marks as inactive, doesn't permanently delete)

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
DELETE /api/contacts/{CONTACT_ID}
Authorization: Bearer {JWT_TOKEN}
```

**Response**:
```json
{
  "message": "Contact deleted successfully"
}
```

**Error Responses**:
- `404 Not Found` - Contact not found or not owned by user
- `401 Unauthorized` - Invalid or missing JWT token

**Note**: This is a soft delete. The contact is marked as `isActive: false` but not removed from the database.

---

## Frontend Components

### React Component: CompanyEditForm.tsx

```tsx
import React, { useState } from 'react';
import axios from 'axios';

interface CompanyEditFormProps {
  company: any;
  authToken: string;
  onSuccess?: (updatedCompany: any) => void;
  onCancel?: () => void;
}

export const CompanyEditForm: React.FC<CompanyEditFormProps> = ({
  company,
  authToken,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: company.name || '',
    domain: company.domain || '',
    industry: company.industry || '',
    size: company.size || '',
    description: company.description || '',
    website: company.website || '',
    location: company.location || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/companies/${company.id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (onSuccess) {
        onSuccess(response.data.company);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="company-edit-form">
      <h2>Edit Company</h2>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Company Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="domain">Domain</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value={formData.domain}
            onChange={handleChange}
            placeholder="company.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://company.com"
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
            value={formData.industry}
            onChange={handleChange}
            placeholder="Technology"
          />
        </div>

        <div className="form-group">
          <label htmlFor="size">Company Size</label>
          <select
            id="size"
            name="size"
            value={formData.size}
            onChange={handleChange}
          >
            <option value="">Select size</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="501-1000">501-1000</option>
            <option value="1001-5000">1001-5000</option>
            <option value="5001+">5001+</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="location">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="San Francisco, CA"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Company description..."
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};
```

---

### React Component: ContactEditForm.tsx

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ContactEditFormProps {
  contact: any;
  authToken: string;
  onSuccess?: (updatedContact: any) => void;
  onCancel?: () => void;
}

export const ContactEditForm: React.FC<ContactEditFormProps> = ({
  contact,
  authToken,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    firstName: contact.firstName || '',
    lastName: contact.lastName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    companyId: contact.companyId || '',
    status: contact.status || 'LEAD',
    tagIds: contact.tags?.map((t: any) => t.id) || [],
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies and tags for dropdowns
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, tagsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/companies?limit=100`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/tags`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
        ]);

        setCompanies(companiesRes.data.companies || []);
        setTags(tagsRes.data.tags || []);
      } catch (err) {
        console.error('Failed to fetch dropdown data', err);
      }
    };

    fetchData();
  }, [authToken]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/contacts/${contact.id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (onSuccess) {
        onSuccess(response.data.contact);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-edit-form">
      <h2>Edit Contact</h2>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1-555-0123"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="companyId">Company</label>
          <select
            id="companyId"
            name="companyId"
            value={formData.companyId}
            onChange={handleChange}
          >
            <option value="">Select company</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="LEAD">Lead</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PARTNER">Partner</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Tags</label>
        <div className="tag-selector">
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              className={`tag-chip ${formData.tagIds.includes(tag.id) ? 'selected' : ''}`}
              onClick={() => handleTagToggle(tag.id)}
              style={{ backgroundColor: formData.tagIds.includes(tag.id) ? tag.color : '#f0f0f0' }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};
```

---

### React Component: DeleteConfirmationModal.tsx

```tsx
import React, { useState } from 'react';
import axios from 'axios';

interface DeleteConfirmationModalProps {
  type: 'company' | 'contact';
  item: any;
  authToken: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  type,
  item,
  authToken,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = type === 'company'
        ? `${process.env.REACT_APP_API_URL}/api/companies/${item.id}`
        : `${process.env.REACT_APP_API_URL}/api/contacts/${item.id}`;

      await axios.delete(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to delete ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const itemName = type === 'company'
    ? item.name
    : `${item.firstName} ${item.lastName}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-modal">
        <div className="modal-header">
          <h2>Delete {type === 'company' ? 'Company' : 'Contact'}</h2>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <p>
            Are you sure you want to delete <strong>{itemName}</strong>?
          </p>

          {type === 'company' && item._count?.contacts > 0 && (
            <div className="alert alert-warning">
              This company has {item._count.contacts} associated contact(s).
              They will remain in your CRM but won't be linked to this company.
            </div>
          )}

          <p className="text-muted">
            This action cannot be undone. The {type} will be permanently removed.
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn-danger"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### React Component: ActionButtons.tsx

```tsx
import React, { useState } from 'react';

interface ActionButtonsProps {
  type: 'company' | 'contact';
  item: any;
  authToken: string;
  onEditClick: () => void;
  onDeleteSuccess: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  type,
  item,
  authToken,
  onEditClick,
  onDeleteSuccess
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      <div className="action-buttons">
        <button
          onClick={onEditClick}
          className="btn-icon btn-edit"
          title={`Edit ${type}`}
        >
          ✏️ Edit
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn-icon btn-delete"
          title={`Delete ${type}`}
        >
          🗑️ Delete
        </button>
      </div>

      {showDeleteModal && (
        <DeleteConfirmationModal
          type={type}
          item={item}
          authToken={authToken}
          onSuccess={() => {
            setShowDeleteModal(false);
            onDeleteSuccess();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
};
```

---

## CSS Styling

```css
/* Form Styles */
.company-edit-form,
.contact-edit-form {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 800px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

/* Tag Selector */
.tag-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.tag-chip.selected {
  color: white;
  transform: scale(1.05);
}

.tag-chip:not(.selected) {
  color: #666;
  border: 1px solid #ddd;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}

/* Button Styles */
.btn-primary,
.btn-secondary,
.btn-danger,
.btn-icon {
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

.btn-secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
}

.btn-edit {
  background-color: #2196F3;
  color: white;
}

.btn-edit:hover {
  background-color: #1976D2;
}

.btn-delete {
  background-color: #f44336;
  color: white;
}

.btn-delete:hover {
  background-color: #d32f2f;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

/* Alert Styles */
.alert {
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.alert-error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef5350;
}

.alert-warning {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ff9800;
}

.text-muted {
  color: #666;
  font-size: 13px;
}
```

---

## Testing Guide

### Test with cURL

**Edit Company**:
```bash
curl -X PUT \
  'http://sandbox.brandmonkz.com:3000/api/companies/COMPANY_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Updated Company Name",
    "industry": "Technology",
    "size": "100-200"
  }'
```

**Delete Company**:
```bash
curl -X DELETE \
  'http://sandbox.brandmonkz.com:3000/api/companies/COMPANY_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Edit Contact**:
```bash
curl -X PUT \
  'http://sandbox.brandmonkz.com:3000/api/contacts/CONTACT_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "status": "CUSTOMER"
  }'
```

**Delete Contact**:
```bash
curl -X DELETE \
  'http://sandbox.brandmonkz.com:3000/api/contacts/CONTACT_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## Security Notes

### User Isolation
- All endpoints verify ownership before allowing edit/delete operations
- Users can only edit/delete their own companies and contacts
- Attempting to edit/delete another user's data returns `404 Not Found`

### Soft Deletes
- Both companies and contacts use soft delete (marked as `isActive: false`)
- Data is not permanently removed from the database
- Deleted items won't appear in normal queries
- Can be recovered if needed by setting `isActive: true` in the database

### Authentication
- All endpoints require valid JWT Bearer token
- Token must be passed in `Authorization` header
- Invalid or expired tokens return `401 Unauthorized`

### Validation
- Company name is required for edit
- Contact first name and last name are required for edit
- Email uniqueness is enforced for contacts
- Invalid email formats are rejected

---

## Status Summary

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/companies/:id` | PUT | ✅ Live | Edit company |
| `/api/companies/:id` | DELETE | ✅ Live | Delete company (soft) |
| `/api/contacts/:id` | PUT | ✅ Live | Edit contact |
| `/api/contacts/:id` | DELETE | ✅ Live | Delete contact (soft) |

**All endpoints are deployed and operational on**: `http://sandbox.brandmonkz.com:3000`

---

## Implementation Checklist

- [ ] Copy edit form components (CompanyEditForm, ContactEditForm)
- [ ] Copy delete confirmation modal (DeleteConfirmationModal)
- [ ] Copy action buttons component (ActionButtons)
- [ ] Add CSS styling
- [ ] Integrate into company list/details pages
- [ ] Integrate into contact list/details pages
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test edit functionality
- [ ] Test delete functionality
- [ ] Test error scenarios
- [ ] Deploy to production

---

## Quick Reference

**Edit Company**: `PUT /api/companies/:id`
**Delete Company**: `DELETE /api/companies/:id`
**Edit Contact**: `PUT /api/contacts/:id`
**Delete Contact**: `DELETE /api/contacts/:id`

All endpoints require:
- JWT Bearer token in Authorization header
- User ownership verification
- Returns 404 if not found or not owned

---

**Last Updated**: October 11, 2025
**Server**: sandbox.brandmonkz.com:3000
**Status**: ✅ All endpoints operational
