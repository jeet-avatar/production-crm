# CRM API Reference - Complete Guide

## Overview

Complete API reference for all company and contact management endpoints in your CRM system.

**Base URL**: `http://sandbox.brandmonkz.com:3000`

**Authentication**: All endpoints require JWT Bearer token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Companies API](#companies-api)
3. [Contacts API](#contacts-api)
4. [Status Codes](#status-codes)
5. [Error Handling](#error-handling)

---

## Authentication

All API requests require authentication using JWT Bearer tokens.

**Header Format**:
```http
Authorization: Bearer {JWT_TOKEN}
```

**Getting a Token**:
```bash
curl -X POST 'http://sandbox.brandmonkz.com:3000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

---

## Companies API

### List Companies

**GET** `/api/companies`

Get paginated list of companies with optional search.

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search in name, domain, industry |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |

**Example Request**:
```bash
curl -X GET \
  'http://sandbox.brandmonkz.com:3000/api/companies?page=1&limit=10&search=tech' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "companies": [
    {
      "id": "cm2efhj8v00043b6l4u5fqrn7",
      "name": "Tech Company Inc",
      "domain": "techcompany.com",
      "industry": "Technology",
      "size": "50-100",
      "description": "A technology company",
      "website": "https://techcompany.com",
      "location": "San Francisco, CA",
      "linkedin": "https://linkedin.com/company/techcompany",
      "employeeCount": "75",
      "revenue": "$10M",
      "foundedYear": 2020,
      "phone": "+1-555-0100",
      "dataSource": "csv_import",
      "fieldSources": {
        "website": "csv_upload",
        "industry": "manual_research"
      },
      "userId": "user-id",
      "isActive": true,
      "createdAt": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-11T18:30:00.000Z",
      "_count": {
        "contacts": 5
      },
      "contacts": [
        {
          "id": "contact-id-1",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@techcompany.com",
          "phone": "+1-555-0101",
          "role": "CEO",
          "status": "CUSTOMER"
        }
      ]
    }
  ],
  "total": 61,
  "page": 1,
  "limit": 10,
  "totalPages": 7
}
```

---

### Get Single Company

**GET** `/api/companies/:id`

Get detailed information about a specific company.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Company ID |

**Example Request**:
```bash
curl -X GET \
  'http://sandbox.brandmonkz.com:3000/api/companies/cm2efhj8v00043b6l4u5fqrn7' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn7",
    "name": "Tech Company Inc",
    "domain": "techcompany.com",
    "industry": "Technology",
    "size": "50-100",
    "description": "A technology company",
    "website": "https://techcompany.com",
    "location": "San Francisco, CA",
    "linkedin": "https://linkedin.com/company/techcompany",
    "employeeCount": "75",
    "revenue": "$10M",
    "foundedYear": 2020,
    "phone": "+1-555-0100",
    "dataSource": "csv_import",
    "fieldSources": {},
    "userId": "user-id",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z",
    "contacts": [],
    "_count": {
      "contacts": 5,
      "deals": 2
    }
  }
}
```

---

### Create Company

**POST** `/api/companies`

Create a new company.

**Request Body**:
```json
{
  "name": "New Company",
  "domain": "newcompany.com",
  "industry": "Technology",
  "size": "10-50",
  "description": "A new company",
  "website": "https://newcompany.com",
  "location": "New York, NY"
}
```

**Required Fields**:
- `name` (string)

**Optional Fields**:
- `domain` (string)
- `industry` (string)
- `size` (string)
- `description` (string)
- `website` (string)
- `location` (string)

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "New Company",
    "industry": "Technology",
    "size": "10-50"
  }'
```

**Response**:
```json
{
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn9",
    "name": "New Company",
    "domain": null,
    "industry": "Technology",
    "size": "10-50",
    "description": null,
    "website": null,
    "location": null,
    "userId": "user-id",
    "isActive": true,
    "createdAt": "2025-10-11T19:00:00.000Z",
    "updatedAt": "2025-10-11T19:00:00.000Z",
    "_count": {
      "contacts": 0
    }
  }
}
```

---

### Update Company

**PUT** `/api/companies/:id`

Update an existing company.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Company ID |

**Request Body**:
```json
{
  "name": "Updated Company Name",
  "domain": "updated.com",
  "industry": "Software",
  "size": "100-200",
  "description": "Updated description",
  "website": "https://updated.com",
  "location": "San Francisco, CA"
}
```

**Example Request**:
```bash
curl -X PUT \
  'http://sandbox.brandmonkz.com:3000/api/companies/cm2efhj8v00043b6l4u5fqrn7' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Updated Company Name",
    "industry": "Software"
  }'
```

**Response**:
```json
{
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn7",
    "name": "Updated Company Name",
    "domain": "techcompany.com",
    "industry": "Software",
    "size": "50-100",
    "description": "A technology company",
    "website": "https://techcompany.com",
    "location": "San Francisco, CA",
    "userId": "user-id",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T19:05:00.000Z",
    "_count": {
      "contacts": 5
    }
  }
}
```

---

### Delete Company

**DELETE** `/api/companies/:id`

Soft delete a company (marks as inactive).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Company ID |

**Example Request**:
```bash
curl -X DELETE \
  'http://sandbox.brandmonkz.com:3000/api/companies/cm2efhj8v00043b6l4u5fqrn7' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "message": "Company deleted successfully"
}
```

**Note**: This is a soft delete. The company is marked as `isActive: false` but not permanently removed.

---

### Upload Company Details (CSV)

**POST** `/api/companies/:id/upload-details`

Upload company details via CSV file.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Company ID |

**Request**: `multipart/form-data`

**Form Fields**:
- `file` (file): CSV file with company details

**CSV Format**:
```csv
website,industry,size,location,description,linkedin,domain,employeeCount,revenue,foundedYear,phone
https://example.com,Technology,50-100,San Francisco CA,Description,https://linkedin.com/company/example,example.com,75,$10M,2020,+1-555-0100
```

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies/cm2efhj8v00043b6l4u5fqrn7/upload-details' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@company-details.csv'
```

**Response**:
```json
{
  "message": "Company details uploaded successfully from CSV",
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn7",
    "name": "Tech Company Inc",
    "website": "https://example.com",
    "industry": "Technology",
    "dataSource": "csv_upload",
    "fieldSources": {
      "website": "csv_upload",
      "industry": "csv_upload"
    },
    "importedAt": "2025-10-11T19:10:00.000Z"
  },
  "fieldsUpdated": ["website", "industry", "size", "location"],
  "dataSource": "csv_upload"
}
```

---

### Manual Company Update

**POST** `/api/companies/:id/manual-update`

Update company details manually (for research/manual entry).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Company ID |

**Request Body**:
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

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies/cm2efhj8v00043b6l4u5fqrn7/manual-update' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "website": "https://example.com",
    "industry": "Technology"
  }'
```

**Response**:
```json
{
  "message": "Company details updated manually",
  "company": {
    "id": "cm2efhj8v00043b6l4u5fqrn7",
    "name": "Tech Company Inc",
    "website": "https://example.com",
    "industry": "Technology",
    "dataSource": "manual_research",
    "fieldSources": {
      "website": "manual_research",
      "industry": "manual_research"
    },
    "updatedAt": "2025-10-11T19:15:00.000Z"
  },
  "fieldsUpdated": ["website", "industry"],
  "dataSource": "manual_research"
}
```

---

### Import Companies (CSV)

**POST** `/api/companies/import`

Bulk import companies from CSV file.

**Request**: `multipart/form-data`

**Form Fields**:
- `file` (file): CSV file with multiple companies

**CSV Format**:
```csv
name,domain,industry,size,location,description,website
Company 1,company1.com,Technology,50-100,San Francisco,Description,https://company1.com
Company 2,company2.com,Finance,100-200,New York,Description,https://company2.com
```

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/companies/import' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@companies.csv'
```

**Response**:
```json
{
  "message": "Company import completed",
  "totalProcessed": 100,
  "imported": 95,
  "duplicates": 5,
  "errors": null,
  "companies": [
    {
      "id": "company-id-1",
      "name": "Company 1",
      "domain": "company1.com"
    }
  ]
}
```

---

## Contacts API

### List Contacts

**GET** `/api/contacts`

Get paginated list of contacts with optional search and filters.

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Search in firstName, lastName, email |
| `status` | string | No | - | Filter by status (LEAD, PROSPECT, CUSTOMER, PARTNER) |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 10 | Items per page |

**Example Request**:
```bash
curl -X GET \
  'http://sandbox.brandmonkz.com:3000/api/contacts?page=1&limit=10&status=CUSTOMER' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "contacts": [
    {
      "id": "cm2efhj8v00053b6l4u5fqrn8",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123",
      "role": "CEO",
      "title": "Chief Executive Officer",
      "status": "CUSTOMER",
      "notes": "Important client",
      "customFields": {},
      "fieldSources": {},
      "userId": "user-id",
      "companyId": "company-id",
      "isActive": true,
      "createdAt": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-11T18:30:00.000Z",
      "company": {
        "id": "company-id",
        "name": "Tech Company Inc",
        "domain": "techcompany.com",
        "industry": "Technology"
      },
      "tags": [
        {
          "id": "tag-id-1",
          "name": "VIP",
          "color": "#FF5733"
        }
      ]
    }
  ],
  "total": 319,
  "page": 1,
  "limit": 10,
  "totalPages": 32
}
```

---

### Get Single Contact

**GET** `/api/contacts/:id`

Get detailed information about a specific contact.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Contact ID |

**Example Request**:
```bash
curl -X GET \
  'http://sandbox.brandmonkz.com:3000/api/contacts/cm2efhj8v00053b6l4u5fqrn8' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "contact": {
    "id": "cm2efhj8v00053b6l4u5fqrn8",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "role": "CEO",
    "title": "Chief Executive Officer",
    "status": "CUSTOMER",
    "notes": "Important client",
    "customFields": {},
    "fieldSources": {},
    "userId": "user-id",
    "companyId": "company-id",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T18:30:00.000Z",
    "company": {
      "id": "company-id",
      "name": "Tech Company Inc",
      "domain": "techcompany.com",
      "industry": "Technology",
      "size": "50-100",
      "location": "San Francisco, CA"
    },
    "tags": []
  }
}
```

---

### Create Contact

**POST** `/api/contacts`

Create a new contact.

**Request Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1-555-0456",
  "role": "CTO",
  "companyId": "company-id",
  "status": "LEAD",
  "tagIds": ["tag-id-1", "tag-id-2"]
}
```

**Required Fields**:
- `firstName` (string)
- `lastName` (string)

**Optional Fields**:
- `email` (string) - Must be unique
- `phone` (string)
- `role` (string)
- `companyId` (string)
- `status` (string) - One of: LEAD, PROSPECT, CUSTOMER, PARTNER
- `tagIds` (string[]) - Array of tag IDs

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/contacts' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "status": "LEAD"
  }'
```

**Response**:
```json
{
  "contact": {
    "id": "cm2efhj8v00053b6l4u5fqrna",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": null,
    "role": null,
    "title": null,
    "status": "LEAD",
    "userId": "user-id",
    "companyId": null,
    "isActive": true,
    "createdAt": "2025-10-11T19:20:00.000Z",
    "updatedAt": "2025-10-11T19:20:00.000Z",
    "company": null,
    "tags": []
  }
}
```

---

### Update Contact

**PUT** `/api/contacts/:id`

Update an existing contact.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Contact ID |

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1-555-0789",
  "companyId": "company-id",
  "status": "CUSTOMER",
  "tagIds": ["tag-id-1"]
}
```

**Example Request**:
```bash
curl -X PUT \
  'http://sandbox.brandmonkz.com:3000/api/contacts/cm2efhj8v00053b6l4u5fqrn8' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "status": "CUSTOMER"
  }'
```

**Response**:
```json
{
  "contact": {
    "id": "cm2efhj8v00053b6l4u5fqrn8",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "role": "CEO",
    "title": "Chief Executive Officer",
    "status": "CUSTOMER",
    "userId": "user-id",
    "companyId": "company-id",
    "isActive": true,
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-11T19:25:00.000Z",
    "company": {
      "id": "company-id",
      "name": "Tech Company Inc"
    },
    "tags": []
  }
}
```

---

### Delete Contact

**DELETE** `/api/contacts/:id`

Soft delete a contact (marks as inactive).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Contact ID |

**Example Request**:
```bash
curl -X DELETE \
  'http://sandbox.brandmonkz.com:3000/api/contacts/cm2efhj8v00053b6l4u5fqrn8' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response**:
```json
{
  "message": "Contact deleted successfully"
}
```

**Note**: This is a soft delete. The contact is marked as `isActive: false` but not permanently removed.

---

### Import Contacts (CSV)

**POST** `/api/contacts/csv-import`

Bulk import contacts from CSV file(s).

**Request**: `multipart/form-data`

**Form Fields**:
- `files` (file[]) - Up to 10 CSV files

**CSV Format**:
```csv
firstName,lastName,email,phone,title,company,industry,companySize
John,Doe,john@example.com,+1-555-0123,CEO,Tech Company Inc,Technology,50-100
Jane,Smith,jane@example.com,+1-555-0456,CTO,Tech Company Inc,Technology,50-100
```

**Example Request**:
```bash
curl -X POST \
  'http://sandbox.brandmonkz.com:3000/api/contacts/csv-import' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'files=@contacts1.csv' \
  -F 'files=@contacts2.csv'
```

**Response**:
```json
{
  "message": "CSV import completed",
  "totalProcessed": 200,
  "imported": 180,
  "duplicates": 20,
  "duplicatesList": [
    "john@example.com (from contacts1.csv)"
  ],
  "errors": null,
  "contacts": [
    {
      "id": "contact-id-1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  ]
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request (invalid input) |
| `401` | Unauthorized (invalid/missing token) |
| `404` | Not found (or not owned by user) |
| `409` | Conflict (duplicate email, etc.) |
| `500` | Internal server error |

---

## Error Handling

All errors return a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Errors**:

**401 Unauthorized**:
```json
{
  "error": "Authentication required"
}
```

**404 Not Found**:
```json
{
  "error": "Company not found"
}
```
or
```json
{
  "error": "Contact not found"
}
```

**409 Conflict**:
```json
{
  "error": "This email address is already in use. Please use a different email or leave it blank."
}
```

**400 Bad Request**:
```json
{
  "error": "First name is required"
}
```

---

## Data Models

### Company Model

```typescript
{
  id: string;                    // Unique identifier
  name: string;                  // Company name (required)
  domain: string | null;         // Company domain
  industry: string | null;       // Industry/sector
  size: string | null;           // Company size (e.g., "50-100")
  description: string | null;    // Company description
  website: string | null;        // Company website URL
  location: string | null;       // Company location
  linkedin: string | null;       // LinkedIn URL
  employeeCount: string | null;  // Number of employees
  revenue: string | null;        // Annual revenue
  foundedYear: number | null;    // Year founded
  phone: string | null;          // Company phone
  dataSource: string | null;     // Data source (csv_import, csv_upload, manual_research, etc.)
  fieldSources: JSON | null;     // Field-level source tracking
  importedAt: DateTime | null;   // Import timestamp
  userId: string;                // Owner user ID
  isActive: boolean;             // Active status (default: true)
  createdAt: DateTime;           // Creation timestamp
  updatedAt: DateTime;           // Last update timestamp
}
```

### Contact Model

```typescript
{
  id: string;                    // Unique identifier
  firstName: string;             // First name (required)
  lastName: string;              // Last name (required)
  email: string | null;          // Email (unique if provided)
  phone: string | null;          // Phone number
  role: string | null;           // Role in company
  title: string | null;          // Job title
  status: string;                // Status: LEAD, PROSPECT, CUSTOMER, PARTNER
  notes: string | null;          // Additional notes
  customFields: JSON | null;     // Custom fields
  fieldSources: JSON | null;     // Field-level source tracking
  userId: string;                // Owner user ID
  companyId: string | null;      // Associated company ID
  isActive: boolean;             // Active status (default: true)
  createdAt: DateTime;           // Creation timestamp
  updatedAt: DateTime;           // Last update timestamp
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. Use responsibly.

---

## Support

**Server**: sandbox.brandmonkz.com (18.212.225.252)
**API Base**: http://sandbox.brandmonkz.com:3000
**Status**: ✅ All endpoints operational

For issues:
1. Check server logs: `ssh ec2-user@18.212.225.252 && pm2 logs`
2. Verify authentication token is valid
3. Ensure user owns the resource being accessed

---

**Last Updated**: October 11, 2025
**Version**: 1.0
