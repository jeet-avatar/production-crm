# Standalone Scripts Collection

All standalone .js utility scripts that don't affect production functionality.

## 📂 Folder Structure

```
scripts/
├── README.md (this file)
│
├── tests/ (25 scripts)
│   └── Test and verification scripts
│
├── templates/ (7 scripts)
│   └── Email template creation scripts
│
├── company-enrichment/ (7 scripts)
│   └── Data enrichment and population
│
├── data-management/ (3 scripts)
│   └── Data analysis and extraction
│
└── utilities/ (16 scripts)
    └── General utility scripts
```

## 📊 Statistics

- **Total Scripts**: 58 standalone .js files
- **Safe to Run**: Yes (no production impact)
- **Dependencies**: All require Prisma and environment variables

## 📁 Categories

### 🧪 Tests (25 files)

Test and verification scripts for various features:

**Testing:**
- `test-api-endpoint.js` - API endpoint testing
- `test-companies.js` - Company data tests
- `test-csv-upload.js` - CSV import testing
- `test-cto-login.js` - CTO authentication tests
- `test-enrichment.js` - Enrichment service tests
- `test-get-company-api.js` - Company API tests
- `test-kling-direct.js` - Kling AI video tests
- `test-login.js` - Login functionality tests
- `test-oauth-error.js` - OAuth error testing
- `test-templates-orderby.js` - Template sorting tests
- `test-templates-query.js` - Template query tests
- `test-twilio-sms.js` - Twilio SMS tests
- `test-url-blocking.js` - URL blocking tests

**Verification:**
- `check-7nation-data.js` - 7Nation company check
- `check-company-by-id.js` - Company ID lookup
- `check-company-fields.js` - Company field verification
- `check-enrichment.js` - Enrichment status check
- `check-kling-balance.js` - Kling AI balance check
- `check-slingsports-contacts.js` - SlingSports data check
- `check-twilio-account.js` - Twilio account status
- `check-visits.js` - Visit tracking verification
- `verify-company-data.js` - Company data validation

**Analysis:**
- `clear-browser-cache.js` - Browser cache clearing
- `sonar-scan.js` - SonarQube scanning

### 📧 Templates (7 files)

Email template creation and management:

- `create-apple-quality-template.js` - Apple quality template
- `create-authentic-brandmonkz-template.js` - Authentic BrandMonkz template
- `create-brandmonkz-join-template.js` - Join template
- `create-invitation-template.js` - Generic invitation template
- `create-sharp-invitation-template.js` - Sharp invitation template
- `update-template-colors.js` - Update template colors
- `update-template-urls.js` - Update template URLs

### 🏢 Company Enrichment (7 files)

Data enrichment and population scripts:

- `add-company-websites.js` - Add website data
- `enrich-all-companies.js` - Bulk enrichment
- `enrich-trane.js` - Enrich Trane Technologies
- `populate-any-real-company.js` - Populate generic company
- `populate-flexport-intent.js` - Flexport intent data
- `populate-real-company-intent.js` - Generic intent population
- `fix-linkedin-urls.js` - Fix LinkedIn URL format

### 📊 Data Management (3 files)

Data analysis and extraction:

- `analyze-data.js` - General data analysis
- `extract-data.js` - Data extraction utility
- `find-company-owner.js` - Find company ownership

### 🛠️ Utilities (16 files)

General utility and setup scripts:

**User Management:**
- `create-cto-employee.js` - Create CTO employee
- `create-ethan-on-sandbox.js` - Create Ethan on sandbox
- `create-ethan-sandbox-direct.js` - Direct Ethan creation
- `update-cto-password.js` - Update CTO password
- `update-cto-to-ethan.js` - Update CTO to Ethan
- `email-ethan-password-fix.js` - Email Ethan password

**Communication:**
- `send-activities-update-to-ethan.js` - Send activity updates
- `send-cto-onboarding-email.js` - CTO onboarding email
- `send-tracked-test-email.js` - Tracked email test
- `send-via-crm-api.js` - Send via API

**API/Integration:**
- `get-token.js` - Generate auth tokens
- `sample-api-key-generation.js` - API key examples
- `add-twilio-txt-record.js` - Twilio DNS setup

**Utilities:**
- `calendar-simple.js` - Simple calendar integration
- `clear-browser-cache.js` - Cache clearing
- `sonar-scan.js` - Code quality scan

## ⚙️ Usage

### Running Scripts

All scripts require environment variables and Prisma setup:

```bash
# From project root
cd "/Users/jeet/Documents/CRM Module"

# Run a test script
node scripts/tests/test-companies.js

# Run an enrichment script
node scripts/company-enrichment/enrich-trane.js

# Run a utility
node scripts/utilities/get-token.js
```

### Prerequisites

1. **Environment Variables**: `.env` file configured
2. **Database**: PostgreSQL running and accessible
3. **Prisma**: `npx prisma generate` completed
4. **Dependencies**: `npm install` completed

### Environment Setup

```bash
# Ensure Prisma client is generated
npx prisma generate

# Check database connection
npx prisma db pull

# Run script
node scripts/tests/test-login.js
```

## 🔒 Safety Notes

### ✅ Safe to Run
- All scripts in `tests/` folder
- All scripts in `data-management/` folder (read-only analysis)
- Verification scripts (`check-*.js`, `verify-*.js`)

### ⚠️ Use with Caution
- `company-enrichment/` - Modifies company data
- `templates/` - Creates/modifies email templates
- `utilities/send-*.js` - Sends actual emails
- `utilities/create-*.js` - Creates database records
- `utilities/update-*.js` - Updates database records

### 🚫 Production Impact
**None** - These scripts:
- Don't modify production server code
- Don't affect deployed applications
- Don't change server configuration
- Are for local development/testing only

## 📝 Adding New Scripts

When adding new standalone scripts:

1. **Categorize** by purpose:
   - Testing? → `tests/`
   - Template? → `templates/`
   - Enrichment? → `company-enrichment/`
   - Data analysis? → `data-management/`
   - Other? → `utilities/`

2. **Name clearly**:
   - Tests: `test-[feature].js`
   - Checks: `check-[what].js`
   - Creation: `create-[what].js`
   - Updates: `update-[what].js`

3. **Document** in script header:
   ```javascript
   /**
    * Script: test-feature.js
    * Purpose: Test the feature functionality
    * Usage: node scripts/tests/test-feature.js
    * Safety: Read-only, safe to run
    */
   ```

## 🔍 Finding Scripts

### By Purpose
```bash
# All test scripts
ls scripts/tests/

# All enrichment scripts
ls scripts/company-enrichment/

# All templates
ls scripts/templates/
```

### By Name Pattern
```bash
# Find all test scripts
find scripts -name "test-*.js"

# Find all check scripts
find scripts -name "check-*.js"

# Find all create scripts
find scripts -name "create-*.js"
```

### By Keyword
```bash
# Find scripts related to companies
grep -r "company" scripts/ -l

# Find scripts using Twilio
grep -r "twilio" scripts/ -l

# Find scripts sending emails
grep -r "sendEmail" scripts/ -l
```

## 📊 Script Inventory

### By Type
- **Testing/Verification**: 25 scripts (43%)
- **Utilities**: 16 scripts (28%)
- **Templates**: 7 scripts (12%)
- **Enrichment**: 7 scripts (12%)
- **Data Management**: 3 scripts (5%)

### By Risk Level
- **Safe (Read-only)**: 28 scripts (48%)
- **Caution (Writes data)**: 30 scripts (52%)

## 🎯 Common Tasks

### Test API Endpoint
```bash
node scripts/tests/test-api-endpoint.js
```

### Enrich Company Data
```bash
node scripts/company-enrichment/enrich-trane.js
```

### Create Email Template
```bash
node scripts/templates/create-invitation-template.js
```

### Verify Company Data
```bash
node scripts/tests/verify-company-data.js
```

### Get Auth Token
```bash
node scripts/utilities/get-token.js
```

## 📞 Support

**Script not working?**
1. Check environment variables (`.env`)
2. Verify database connection
3. Run `npx prisma generate`
4. Check script dependencies

**Need to create a new script?**
1. Choose appropriate category folder
2. Follow naming convention
3. Add documentation header
4. Update this README

---

**Last Updated**: $(date '+%Y-%m-%d')
**Total Scripts**: 58
**Safe to Delete**: No (may be needed for testing/setup)
**Production Impact**: None
