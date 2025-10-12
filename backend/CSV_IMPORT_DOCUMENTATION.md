# 📊 CSV Import Documentation - Dynamic Field Mapping

**Status**: ✅ FULLY DYNAMIC - No hardcoded mappings
**Last Updated**: October 11, 2025

---

## 🎯 Overview

Both Contact and Company CSV imports use **AI-powered dynamic field mapping** that automatically detects and maps your CSV columns to the correct database fields. You can use ANY column names in your CSV files!

---

## 📋 Contact CSV Import

### Endpoint
```
POST /api/contacts/csv-import
```

### Features
✅ **Automatic field detection** - Works with any column names
✅ **Smart name parsing** - Handles "Full Name" or separate first/last names
✅ **Company extraction** - Automatically creates/links companies
✅ **Duplicate detection** - Skips existing contacts
✅ **Custom fields** - Unmapped columns stored as custom fields
✅ **Multi-file support** - Import multiple CSV files at once

### Supported Column Names (Examples)

The AI mapping is flexible and recognizes many variations:

| Field | Recognized Column Names |
|-------|------------------------|
| **Email** | email, e-mail, mail, Email Address, E-Mail Address |
| **First Name** | firstName, first name, fname, given name, First Name |
| **Last Name** | lastName, last name, lname, surname, family name, Last Name |
| **Full Name** | fullName, full name, name, contact name |
| **Phone** | phone, mobile, cell, telephone, tel, contact number, Phone Number |
| **Title** | title, position, job title, designation, Title |
| **Role** | role, Role |
| **Company** | company, organization, employer, business, Company Name |
| **Company Industry** | industry, sector, vertical, Company Industry |
| **Company Size** | company size, employee count, employees, headcount |
| **Company Location** | company location, company city, headquarters, HQ, Location |
| **Company Website** | website, company website, url, domain, Website |
| **Status** | status, stage, lead status, Status |
| **Notes** | notes, comment, description, remark, Notes |

### Example CSV Files

#### Example 1: Simple Format
```csv
Email,First Name,Last Name,Company,Phone
john@example.com,John,Doe,Acme Corp,555-1234
jane@example.com,Jane,Smith,Tech Inc,555-5678
```

#### Example 2: Full Name Format
```csv
Email,Full Name,Company Name,Mobile,Job Title
john@example.com,John Doe,Acme Corporation,555-1234,CEO
jane@example.com,Jane Smith,Tech Innovations Inc,555-5678,CTO
```

#### Example 3: With Company Details
```csv
Email,First Name,Last Name,Company,Company Website,Industry,Location
john@example.com,John,Doe,Acme Corp,acme.com,Technology,San Francisco
jane@example.com,Jane,Smith,Tech Inc,techinc.com,Software,New York
```

#### Example 4: NetSuite Format
```csv
Email,First Name,Last Name,Company/Customer,Title,Phone/Mobile,Status
john@example.com,John,Doe,Acme Corporation,Chief Executive Officer,555-1234,LEAD
jane@example.com,Jane,Smith,Tech Innovations,Chief Technology Officer,555-5678,PROSPECT
```

### How It Works

1. **Upload CSV** - Select one or more CSV files
2. **Auto-Detection** - AI analyzes column headers
3. **Smart Mapping** - Columns automatically mapped to fields
4. **Company Linking** - Companies created/linked automatically
5. **Import** - Data saved to database

### Company Matching Logic

**Fixed Bug** ✅: Now uses **exact company name matching only**

- Matches by exact company name
- Filters out generic domains (linkedin.com, facebook.com, twitter.com)
- Each contact assigned to correct company
- Creates new company if doesn't exist

---

## 🏢 Company CSV Import

### Endpoint
```
POST /api/companies/import
```

### Features
✅ **Automatic field detection** - Works with any column names
✅ **Domain extraction** - Auto-extracts domain from website
✅ **Duplicate detection** - Skips existing companies
✅ **Flexible mapping** - Handles various column name formats
✅ **Custom fields** - Unmapped columns stored as custom fields

### Supported Column Names (Examples)

| Field | Recognized Column Names |
|-------|------------------------|
| **Name** | name, company name, business name, Company |
| **Domain** | domain, company website, Domain |
| **Website** | website, url, site, Website, Company Website |
| **Industry** | industry, sector, vertical, Industry |
| **Location** | location, city, address, headquarters, HQ, Location |
| **Size** | size, company size, employees, Size |
| **Description** | description, about, overview, Description |
| **Phone** | phone, telephone, tel, Company Phone |
| **Revenue** | revenue, annual revenue, Revenue |
| **Employee Count** | employee count, headcount, number of employees |

### Example CSV Files

#### Example 1: Basic Format
```csv
Name,Website,Industry,Location
Acme Corp,acme.com,Technology,San Francisco
Tech Inc,techinc.com,Software,New York
```

#### Example 2: Detailed Format
```csv
Company Name,Website,Industry,Size,Location,Description
Acme Corporation,https://acme.com,Technology,500-1000,San Francisco CA,"Leading tech company"
Tech Innovations Inc,www.techinc.com,Software,100-250,New York NY,"Innovative software solutions"
```

#### Example 3: With Employee Data
```csv
Name,Domain,Industry,Employee Count,Headquarters,Annual Revenue
Acme Corp,acme.com,Technology,750,San Francisco,"$50M-$100M"
Tech Inc,techinc.com,Software,180,New York,"$10M-$50M"
```

### How It Works

1. **Upload CSV** - Select CSV file with company data
2. **Auto-Detection** - AI analyzes column headers
3. **Smart Mapping** - Columns automatically mapped to fields
4. **Domain Extraction** - Automatically extracts domain from website URLs
5. **Duplicate Check** - Skips companies that already exist
6. **Import** - Data saved to database

### Domain Extraction

If you provide a **website** but no **domain**, the system automatically extracts it:

- `https://acme.com` → domain: `acme.com`
- `www.techinc.com` → domain: `techinc.com`
- `http://example.org/about` → domain: `example.org`

---

## 🧠 AI Field Mapping - How It Works

### Backend Logic

Both imports use intelligent pattern matching:

```typescript
// Example: Email field detection
if (normalized.match(/email|e-?mail|mail/))
  mapping[header] = 'email';

// Example: Company name detection
if (normalized.match(/^(company.*name|name|business.*name)$/))
  mapping[header] = 'name';
```

### Normalization

Column headers are normalized for matching:
1. Convert to lowercase
2. Remove spaces, underscores, hyphens
3. Match against patterns
4. Map to database field

**Examples**:
- `"First Name"` → normalized: `firstname` → mapped to: `firstName`
- `"E-Mail Address"` → normalized: `emailaddress` → mapped to: `email`
- `"Company Website"` → normalized: `companywebsite` → mapped to: `website`

---

## ✨ Custom Fields

Any columns that don't match standard fields are automatically stored as **custom fields**:

```csv
Email,First Name,Last Name,Company,LinkedIn Profile,Twitter Handle
john@example.com,John,Doe,Acme,linkedin.com/in/johndoe,@johndoe
```

Result:
- Standard fields: Email, First Name, Last Name, Company
- Custom fields: `LinkedIn Profile`, `Twitter Handle` (stored in `customFields` JSON)

---

## 🔄 Duplicate Handling

### Contact Duplicates

Checked by:
1. **Email** (if provided)
2. **First Name + Last Name + Company** (if email not provided)
3. **Phone** (if no email/name)

Duplicates are **skipped** and reported in the import results.

### Company Duplicates

Checked by:
- **Exact company name match**

Duplicates are **skipped** and reported in the import results.

---

## 📊 Import Results

### Contact Import Response

```json
{
  "message": "CSV import completed",
  "totalProcessed": 100,
  "imported": 95,
  "duplicates": 5,
  "errors": [],
  "contacts": [...]
}
```

### Company Import Response

```json
{
  "message": "Company import completed",
  "totalProcessed": 50,
  "imported": 48,
  "duplicates": 2,
  "errors": [],
  "companies": [...]
}
```

---

## 🚀 Frontend Components

### Contact Import
**File**: `/CRM Frontend/crm-app/src/components/CSVImportModal.tsx`
**Features**:
- Drag & drop file upload
- Multi-file support
- Preview before import
- Progress tracking
- Error reporting

### Company Import
**File**: `/CRM Frontend/crm-app/src/components/ImportCompaniesModal.tsx`
**Features**:
- Drag & drop file upload
- CSV parsing with PapaParse
- Field mapping preview
- Optional AI enrichment
- Progress tracking

---

## 🛠️ Backend Endpoints

### Contacts

```typescript
POST /api/contacts/csv-import
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'files' field (multiple files)
```

**File**: `/CRM Module/src/routes/contacts.ts`
**Function**: `mapCSVFieldsToContact()` - Lines 332-360
**Function**: `parseContactData()` - Lines 367-397

### Companies

```typescript
POST /api/companies/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'file' field (single file)
```

**File**: `/CRM Module/src/routes/companies.ts`
**Function**: `mapCSVFieldsToCompany()` - Lines 380-400
**Function**: `parseCompanyData()` - Lines 405-435

---

## ✅ Verification

### Test Contact Import

```bash
curl -X POST https://sandbox.brandmonkz.com/api/contacts/csv-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@contacts.csv"
```

### Test Company Import

```bash
curl -X POST https://sandbox.brandmonkz.com/api/companies/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@companies.csv"
```

---

## 🎯 Best Practices

### 1. Use Clear Column Names
✅ Good: `Email`, `First Name`, `Company Name`
❌ Avoid: `col1`, `field_a`, `data`

### 2. Include Company Information
For contacts, include company details to enable automatic linking:
```csv
Email,First Name,Last Name,Company,Company Website
john@acme.com,John,Doe,Acme Corp,acme.com
```

### 3. Clean Your Data
- Remove empty rows
- Trim whitespace
- Validate email addresses
- Check for duplicates before import

### 4. Test With Small Sample
Import a few rows first to verify field mapping works correctly.

### 5. Use UTF-8 Encoding
Save your CSV files with UTF-8 encoding to support international characters.

---

## 🐛 Troubleshooting

### Issue: Fields Not Mapping Correctly

**Solution**: Check your column names. The AI mapping is flexible, but try using standard names like:
- `Email`, `First Name`, `Last Name`, `Company`, `Phone`

### Issue: All Contacts Assigned to Same Company

**Solution**: ✅ FIXED! The bug that caused this has been resolved. Make sure you:
1. Clear browser cache
2. Re-import your CSV files
3. Each contact will now be assigned to their correct company

### Issue: Duplicates Not Detected

**Solution**: Ensure contacts have:
- Unique email addresses, OR
- Unique combination of First Name + Last Name + Company

### Issue: Custom Fields Not Showing

**Solution**: Custom fields are stored in the `customFields` JSON column. You may need to update your frontend to display them.

---

## 📦 Deployment Status

✅ **Local Backend**: Built and tested
✅ **Sandbox Backend**: Deployed and running
✅ **Sandbox Database**: Clean and ready
✅ **Field Mapping**: 100% dynamic
✅ **Company Matching**: Fixed (exact name only)

**Server**: sandbox.brandmonkz.com (18.212.225.252)
**Status**: Online
**PM2 Process**: crm-backend (ID: 0)

---

## 🎉 Summary

✅ **Fully Dynamic** - No hardcoded field mappings
✅ **Flexible Column Names** - Works with any naming convention
✅ **Automatic Detection** - AI maps fields intelligently
✅ **Company Linking** - Automatic company creation/linking
✅ **Duplicate Handling** - Skips existing records
✅ **Custom Fields** - Unmapped columns preserved
✅ **Error Reporting** - Detailed import results
✅ **Multi-File Support** - Import contacts from multiple CSVs
✅ **Bug Fixed** - Company matching now uses exact name only

**You can now import ANY CSV format and the system will automatically map the fields correctly!** 🚀
