# Phase 3: CRM Migration Wizard - Research

**Researched:** 2026-03-18
**Domain:** CSV import wizard, field mapping, multi-entity bulk import
**Confidence:** HIGH (all findings from direct codebase inspection)

---

## Summary

The BrandMonkz codebase already has deep CSV import infrastructure for both contacts and companies. Two existing modal components handle step-by-step import flows, and two backend endpoints (`POST /api/contacts/csv-import` and `POST /api/companies/import`) already do bulk import with auto field-mapping. The `csvImport.ts` route has a more generic two-phase upload+process flow that supports entityType selection (contacts/companies/deals).

The Migration Wizard is primarily a **frontend orchestration layer** on top of these existing endpoints. The main new work is: (1) a CRM source selector step, (2) downloadable field-mapping templates per source CRM, (3) a manual column-mapping UI for when auto-mapping misses fields, and (4) deals import (no existing bulk endpoint — must call `POST /api/deals` in a loop or add a new bulk endpoint).

**Primary recommendation:** Build a new `MigrationWizardModal.tsx` component with 6 steps. Reuse the auto-mapping logic from `contacts.ts` and `companies.ts`. Add a `POST /api/deals/bulk-import` backend endpoint. Surface the wizard from a new "Data Import" tab in SettingsPage.

---

## Existing Infrastructure (Critical Findings)

### Q1: What does CSVImportModal do? Can it be reused?

**File:** `frontend/src/components/CSVImportModal.tsx`

- 5-step wizard: Upload → Preview → Enrich (optional) → Importing → Complete
- Contacts-only — hardcoded to `POST /api/contacts/csv-import`
- Parses CSV client-side (splits on commas, not using papaparse — fragile)
- Step indicators rendered via inline `StepIndicator` + `ProgressBar` helper components
- No field mapping UI — relies entirely on server-side auto-mapping
- State: `currentStep` (1-5), `selectedFiles`, `previewData`, `importResults`, `error`

**Verdict:** Do NOT reuse directly. Extract the `StepIndicator`/`ProgressBar` pattern as a shared component. The wizard needs CRM source selection and manual column mapping that this modal doesn't have.

### Q2: What does ImportCompaniesModal do?

**File:** `frontend/src/components/ImportCompaniesModal.tsx`

- 3-step wizard: Upload CSV → AI Processing → Review & Import
- Uses `papaparse` for CSV parsing (dependency already installed)
- Client-side maps: `name/Name/'Company Name'`, `domain/Domain`, `industry/Industry`, `location/Location/Headquarters`, `size/Size/'Company Size'`, `description/Description`, `website/Website`, `employeeCount/Employees/'Employee Count'`
- Calls `POST /api/companies/enrich` for AI enrichment, then `POST /api/companies/import` (rebuilds CSV and uploads as FormData)
- Has drag-and-drop support

**Verdict:** `papaparse` is already a dependency. The client-side column name parsing pattern here is a good reference for building the column-mapping step.

---

## Exact Prisma Field Names (Critical for Templates)

### Contact Model (`schema.prisma:202`)
| Prisma Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | String | YES | |
| `lastName` | String | YES | Defaults to `''` in import |
| `email` | String? | NO | Unique constraint — duplicates rejected |
| `phone` | String? | NO | Validated via `validatePhoneNumber()` |
| `title` | String? | NO | Job title |
| `role` | String? | NO | CEO/CFO/CTO/etc. |
| `status` | ContactStatus | NO | LEAD/PROSPECT/CUSTOMER/COLD/WARM/HOT/CLOSED_WON/CLOSED_LOST — defaults to LEAD |
| `notes` | String? | NO | |
| `linkedin` | String? | NO | Profile URL |
| `location` | String? | NO | City, State/Country |
| `source` | String? | NO | |
| `companyId` | String? | NO | Resolved via company name lookup |

### Company Model (`schema.prisma:258`)
| Prisma Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | YES | Required — records without name are skipped |
| `domain` | String? | NO | Unique constraint — auto-extracted from website |
| `industry` | String? | NO | |
| `size` | String? | NO | Supports ranges like "51-200" |
| `location` | String? | NO | |
| `website` | String? | NO | Social media URLs auto-routed to linkedin/twitter/facebook |
| `description` | String? | NO | |
| `phone` | String? | NO | |
| `revenue` | String? | NO | |
| `employeeCount` | String? | NO | |
| `linkedin` | String? | NO | |
| `twitter` | String? | NO | |
| `facebook` | String? | NO | |
| `foundedYear` | Int? | NO | |

### Deal Model (`schema.prisma:350`)
| Prisma Field | Type | Required | Notes |
|---|---|---|---|
| `title` | String | YES | |
| `value` | Decimal(12,2) | YES | Parsed as `parseFloat()` |
| `stage` | DealStage | NO | PROSPECTING/QUALIFICATION/PROPOSAL/NEGOTIATION/CLOSED_WON/CLOSED_LOST — defaults to PROSPECTING |
| `probability` | Int | NO | 0-100 — defaults to 10 |
| `expectedCloseDate` | DateTime? | NO | |
| `description` | String? | NO | |
| `contactId` | String? | NO | Needs lookup by email/name |
| `companyId` | String? | NO | Needs lookup by name |

---

## Backend Endpoints Inventory

### Existing Import Endpoints

| Endpoint | Method | Accepts | Returns | Notes |
|---|---|---|---|---|
| `/api/contacts/csv-import` | POST | `FormData` with `files[]` (up to 10 CSV files) | `{ contactsImported, companiesImported, duplicates, duplicatesList, errors, contacts }` | Full auto-mapping + duplicate detection. Server-side CSV parsing via `csv-parse/sync`. |
| `/api/companies/import` | POST | `FormData` with `file` (single CSV) | `{ imported, duplicates, skipped, errors, companies }` | Auto-mapping + duplicate check by name. |
| `/api/csv-import/upload` | POST | `FormData` with `file` + `entityType` + `mapping` | `{ import, preview, headers }` | Generic upload+preview. Supports contacts/companies/deals. Does NOT create records yet. |
| `/api/csv-import/:id/process` | POST | `{ data, mapping }` JSON | `{ import }` | Processes previously uploaded file. Supports contacts and companies. Deal support is missing. |

### Single-Create Endpoints (for deals bulk import loop)

| Endpoint | Method | Body | Notes |
|---|---|---|---|
| `/api/deals` | POST | `{ title, value, stage, probability, expectedCloseDate, contactId, companyId, description }` | No bulk endpoint exists |
| `/api/contacts` | POST | `{ firstName, lastName, email, phone, role, companyId, companyName, status, tagIds }` | `companyName` triggers find-or-create |

### No Bulk Deals Endpoint
There is no `POST /api/deals/bulk-import` or equivalent. The `csvImport.ts` `/:id/process` handler has a `deals` branch in its `entityType` check (line 67) but the `if/else if` in the processing loop only handles contacts and companies — the deals branch falls through silently.

---

## SettingsPage Tab Structure

**File:** `frontend/src/pages/Settings/SettingsPage.tsx:16`

```typescript
type SettingsTab = 'profile' | 'account' | 'notifications' | 'security' | 'preferences' | 'billing';
```

Tab array defined at line 448:
```typescript
const tabs = [
  { id: 'profile' as SettingsTab, name: 'Profile', icon: UserCircleIcon },
  { id: 'account' as SettingsTab, name: 'Account', icon: EnvelopeIcon },
  { id: 'notifications' as SettingsTab, name: 'Notifications', icon: BellIcon },
  { id: 'security' as SettingsTab, name: 'Security', icon: ShieldCheckIcon },
  { id: 'preferences' as SettingsTab, name: 'Preferences', icon: GlobeAltIcon },
  { id: 'billing' as SettingsTab, name: 'Billing', icon: CreditCardIcon },
];
```

Content rendered via `{activeTab === 'profile' && (...)}` pattern (line 505 onward).

To add a "Data Import" tab: extend the `SettingsTab` union type, add an entry to the `tabs` array, and add a `{activeTab === 'data-import' && (...)}` block. The wizard can be launched from within this tab or opened as a standalone modal. The sidebar icon is from `@heroicons/react/24/outline` (already imported throughout).

---

## CSS Classes Available for Wizard UI

No Tailwind — all classes are hand-defined in `frontend/src/index.css`. Key classes verified:

**Step indicators:**
- `.flex`, `.items-center`, `.gap-2`, `.gap-4`
- `.rounded-full` for circle step numbers
- `.bg-primary-600` (indigo active), `.bg-gray-200` (inactive)
- `.text-white`, `.text-gray-400`
- `.font-semibold`, `.text-sm`

**Progress connector:**
- `.flex-1`, `.h-0.5` (use inline style `height: 2px` — `.h-0\.5` likely not defined)
- Alternative: use `<div style={{height:'2px', flex:1, background: active ? 'var(--accent-primary)' : 'var(--border-default)'}} />`

**File upload zone:**
- `.border-2`, `.border-dashed`, `.rounded-lg`, `.p-12`, `.text-center`, `.cursor-pointer`
- `.border-gray-300`, `.hover:border-rose-500` (indigo in dark theme due to remapping)

**Modals:**
- `.fixed.inset-0.bg-black\/60.backdrop-blur-sm.flex.items-center.justify-center.z-50.p-4`
- `.bg-white.rounded-2xl.shadow-2xl.w-full.max-w-4xl.max-h-\[90vh\].flex.flex-col`
- In dark theme: `.bg-white` = `var(--bg-elevated)` (#161625)

**Tables (for preview/mapping):**
- `.overflow-x-auto` wrapper
- `<table>` with `.w-full.text-sm`
- `.border-b-2.border-gray-300` on `<thead>`
- `.px-4.py-2.font-semibold.text-gray-700.bg-gray-100` on `<th>`

**Buttons:**
- Primary: `bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-500/30 rounded-xl font-semibold`
- Secondary: `border-2 border-gray-300 rounded-xl text-gray-700`
- Note: Tailwind gradient classes like `from-indigo-600` require Tailwind — check if these are supported or if inline `style` is needed

**Important:** The existing modals use inline Tailwind-style class names that happen to work because they are defined in `index.css`. The gradient buttons use `bg-gradient-to-r from-indigo-600 to-purple-600` — these are NOT defined as utilities in index.css. They work because the file uses `@layer` or because Vite/PostCSS is processing them. **Verify before using gradient classes not explicitly listed above.** Safe alternative: use `background: var(--accent-gradient)` inline style.

---

## Backend CSV Parsing

**The backend does all real CSV parsing** — server-side via `csv-parse/sync`. The frontend only does a lightweight preview parse (split on commas, fragile). For the wizard:

- Use `papaparse` (already installed — used in `ImportCompaniesModal.tsx`) for frontend preview and column detection
- Upload the raw CSV file to the existing backend endpoints
- The backend `mapCSVFieldsToContact()` and `mapCSVFieldsToCompany()` functions handle auto-mapping

**Auto-mapping coverage in contacts.ts (line 447):**
Handles: email, firstName, lastName, fullName, phone, title, company, companyIndustry, companySize, companyLocation, companyWebsite, companyDescription, companyRevenue, companyLinkedIn, companyFoundedYear, companyPhone, status, notes. Unmapped → `custom_` prefix.

**Auto-mapping coverage in companies.ts (line 836):**
Handles: name, domain, website, linkedin, twitter, facebook, industry, location, size, description, phone, revenue, employeeCount. Unmapped → `custom_` prefix (skipped in parseCompanyData).

---

## Salesforce / HubSpot / NetSuite / Pipedrive Field Mapping

Standard export columns from each CRM vs BrandMonkz field names (confidence: MEDIUM — from common knowledge of these CRMs' default export formats):

### Contacts

| Source | Export Column Name | BrandMonkz Field |
|---|---|---|
| Salesforce | `First Name` | `firstName` |
| Salesforce | `Last Name` | `lastName` |
| Salesforce | `Email` | `email` |
| Salesforce | `Mobile` / `Phone` | `phone` |
| Salesforce | `Title` | `title` |
| Salesforce | `Account Name` | `company` |
| Salesforce | `Lead Status` | `status` |
| HubSpot | `First Name` | `firstName` |
| HubSpot | `Last Name` | `lastName` |
| HubSpot | `Email Address` | `email` |
| HubSpot | `Phone Number` | `phone` |
| HubSpot | `Job Title` | `title` |
| HubSpot | `Company Name` | `company` |
| HubSpot | `Lifecycle Stage` | `status` (needs normalization) |
| NetSuite | `First Name` | `firstName` |
| NetSuite | `Last Name` | `lastName` |
| NetSuite | `Email` | `email` |
| NetSuite | `Phone` | `phone` |
| NetSuite | `Title` | `title` |
| NetSuite | `Company` | `company` |
| Pipedrive | `First name` | `firstName` |
| Pipedrive | `Last name` | `lastName` |
| Pipedrive | `Email` | `email` |
| Pipedrive | `Phone` | `phone` |
| Pipedrive | `Job title` | `title` |
| Pipedrive | `Organization name` | `company` |

### Companies

| Source | Export Column | BrandMonkz Field |
|---|---|---|
| Salesforce | `Account Name` | `name` |
| Salesforce | `Website` | `website` |
| Salesforce | `Industry` | `industry` |
| Salesforce | `Employees` | `employeeCount` |
| Salesforce | `Billing City` / `Billing State` | `location` |
| HubSpot | `Company name` | `name` |
| HubSpot | `Company Domain Name` | `domain` |
| HubSpot | `Industry` | `industry` |
| HubSpot | `Number of Employees` | `employeeCount` |
| HubSpot | `City` / `State/Region` | `location` |
| Pipedrive | `Name` | `name` |
| Pipedrive | `Address` | `location` |

**Key insight:** Most of these will be auto-mapped by the existing backend `mapCSVFieldsToContact()` and `mapCSVFieldsToCompany()` functions because they already handle variations like `First Name`, `Company Name`, `Employees`, `Address`. The column-mapping UI step is a fallback for edge cases.

### Deals

| Source | Export Column | BrandMonkz Field |
|---|---|---|
| Salesforce | `Opportunity Name` | `title` |
| Salesforce | `Amount` | `value` |
| Salesforce | `Stage` | `stage` (needs normalization to enum) |
| Salesforce | `Close Date` | `expectedCloseDate` |
| HubSpot | `Deal Name` | `title` |
| HubSpot | `Amount` | `value` |
| HubSpot | `Deal Stage` | `stage` |
| HubSpot | `Close Date` | `expectedCloseDate` |
| Pipedrive | `Title` | `title` |
| Pipedrive | `Value` | `value` |
| Pipedrive | `Stage` | `stage` |
| Pipedrive | `Expected Close Date` | `expectedCloseDate` |

**Stage normalization required:** Salesforce uses "Prospecting", "Qualification", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost". HubSpot uses "appointmentscheduled", "qualifiedtobuy", "presentationscheduled", "decisionmakerboughtin", "contractsent", "closedwon", "closedlost". These need normalization to the `DealStage` enum.

---

## Architecture Patterns

### Recommended Wizard Flow (6 Steps)

```
Step 1: Choose Source CRM
  → Salesforce / HubSpot / NetSuite / Pipedrive / Generic CSV
  → Show what data types can be imported from each source

Step 2: Choose Entity Type
  → Contacts / Companies / Deals (or "All" where applicable)
  → Show download link for field-mapping template CSV

Step 3: Upload CSV
  → Drag-and-drop upload zone
  → Parse with papaparse for immediate column preview
  → Show detected column names

Step 4: Map Columns
  → Table: CSV column | BrandMonkz field (dropdown)
  → Pre-populate with auto-mapped suggestions from server or client-side logic
  → "Unmapped" columns shown but skippable
  → "Required field missing" validation before proceeding

Step 5: Preview
  → First 5 rows with mapped data shown
  → Row count, estimated import time
  → Warning if duplicates likely

Step 6: Import + Results
  → Upload to appropriate endpoint
  → Show progress (spinner)
  → Display results: imported/duplicates/errors
```

### Component Structure
```
frontend/src/components/
├── MigrationWizardModal.tsx     # Main wizard orchestrator (new)
├── wizard/
│   ├── WizardStepIndicator.tsx  # Reusable step indicator (extract from CSVImportModal)
│   ├── CrmSourceStep.tsx        # Step 1: choose source CRM
│   ├── EntityTypeStep.tsx       # Step 2: entity type + template download
│   ├── UploadStep.tsx           # Step 3: file upload
│   ├── ColumnMappingStep.tsx    # Step 4: column mapping table
│   ├── PreviewStep.tsx          # Step 5: data preview
│   └── ImportResultsStep.tsx    # Step 6: results
```

### Field Mapping Template Strategy
Generate CSV templates client-side using `Blob` + anchor download — no backend needed:
```typescript
const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company Name'];
const csv = headers.join(',') + '\nJohn,Doe,john@example.com,+1-555-0100,CEO,Acme Corp';
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// <a href={url} download="salesforce-contacts-template.csv">
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---|---|---|
| CSV parsing (frontend) | Custom split/parse logic | `papaparse` (already installed) |
| CSV parsing (backend) | Custom buffer parsing | `csv-parse/sync` (already used) |
| Field auto-mapping | New mapping logic | `mapCSVFieldsToContact()` in contacts.ts (already handles 20+ variations) |
| Duplicate detection | Custom comparison | existing `checkDuplicateContact()` in contacts.ts |
| Company find-or-create | Custom upsert | `findOrCreateCompany()` in contacts.ts |
| File upload | Custom XHR | existing `FormData` + `fetch` pattern used throughout |

---

## Common Pitfalls

### Pitfall 1: Deals Have No Bulk Import Endpoint
**What goes wrong:** Wizard tries to call a bulk deals endpoint that doesn't exist.
**Why it happens:** `csvImport.ts` process handler only handles contacts and companies, not deals.
**How to avoid:** Add `POST /api/deals/bulk-import` endpoint. Body: `{ deals: Array<{title, value, stage, expectedCloseDate, contactEmail, companyName, description}> }`. Or loop through `POST /api/deals` calls — but that's N round-trips, which is slow for large imports. Recommend adding a bulk endpoint.
**Warning signs:** Silent "success" with 0 imported deals.

### Pitfall 2: Company `domain` Unique Constraint
**What goes wrong:** Import fails with P2002 unique constraint violation on `domain` field.
**Why it happens:** Multiple companies in the same export may have the same website/domain. The `findOrCreateCompany()` in contacts.ts handles this (retries without domain), but `companies.ts` import does NOT have this retry logic.
**How to avoid:** The new wizard's company import path should either use the contacts.ts endpoint (which handles it) or replicate the domain retry logic.
**Warning signs:** `Prisma error P2002` for company domain field.

### Pitfall 3: CSV Parsing of Quoted Fields
**What goes wrong:** Fields containing commas (e.g., "Smith, John" or addresses like "123 Main St, Suite 4") break naive comma-split parsing.
**Why it happens:** `CSVImportModal` uses a manual `line.split(',')` for preview — this is broken for quoted fields.
**How to avoid:** Always use `papaparse` on the frontend. The backend uses `csv-parse/sync` which handles quotes correctly.
**Warning signs:** Columns shifted left, truncated data in preview.

### Pitfall 4: Deal Stage Normalization
**What goes wrong:** Deals imported with stages like "Closed Won" or "closed_won" fail Prisma enum validation.
**Why it happens:** DealStage enum expects `CLOSED_WON` uppercase format. Salesforce/HubSpot/Pipedrive export mixed-case stage names.
**How to avoid:** Add stage normalization in the bulk deals import endpoint: map common variations to enum values before Prisma create.
**Warning signs:** `Prisma validation error` on deal.stage field, 0 deals imported.

### Pitfall 5: SettingsPage Type Narrowing
**What goes wrong:** TypeScript error when adding `'data-import'` tab because `SettingsTab` type union doesn't include it.
**Why it happens:** The type is explicitly defined at line 16 of SettingsPage.tsx.
**How to avoid:** Update the type union: `type SettingsTab = 'profile' | 'account' | ... | 'data-import'`.
**Warning signs:** TypeScript compile error on `activeTab === 'data-import'`.

### Pitfall 6: Gradient CSS Classes Not in index.css
**What goes wrong:** `bg-gradient-to-r from-indigo-600 to-purple-600` class names not found, button renders without gradient.
**Why it happens:** `index.css` defines specific utility classes but NOT arbitrary gradient classes.
**Why existing modals work:** They work because the gradient classes ARE in the file through inline styles or because those class names somehow resolve. But new components should use `style={{ background: 'var(--accent-gradient)' }}` to be safe.
**How to avoid:** For new buttons, use `style={{ background: 'var(--accent-gradient)' }}` or check if the gradient classes are defined elsewhere in the codebase.

---

## Code Examples

### StepIndicator Pattern (from ImportCompaniesModal.tsx)
```typescript
// Source: frontend/src/components/ImportCompaniesModal.tsx:226
const Step = ({ number, label, active }: { number: number; label: string; active: boolean }) => (
  <div className="flex items-center">
    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
      active ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' : 'bg-gray-200 text-gray-600'
    } font-semibold`}>
      {number}
    </div>
    <span className={`ml-3 text-sm font-medium ${active ? 'text-purple-400' : 'text-gray-500'}`}>
      {label}
    </span>
  </div>
);
```

### Column Mapping Table Pattern (to build)
```typescript
// Recommended structure for Step 4: ColumnMappingStep
interface ColumnMapping {
  csvColumn: string;
  mappedTo: string; // BrandMonkz field name or 'skip'
}

const CONTACT_FIELDS = [
  { value: 'skip', label: '-- Skip --' },
  { value: 'firstName', label: 'First Name *' },
  { value: 'lastName', label: 'Last Name *' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'title', label: 'Job Title' },
  { value: 'company', label: 'Company Name' },
  { value: 'notes', label: 'Notes' },
  { value: 'status', label: 'Status' },
];
```

### papaparse Usage (from ImportCompaniesModal.tsx)
```typescript
// Source: frontend/src/components/ImportCompaniesModal.tsx:56
Papa.parse(selectedFile, {
  header: true,
  complete: (results) => {
    const parsedData = results.data;
    const headers = results.meta.fields; // Column names array
  },
  error: (error) => { console.error('CSV parsing error:', error); },
});
```

### Auth Pattern (consistent across all components)
```typescript
// All API calls use this pattern
const token = localStorage.getItem('crmToken');
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const response = await fetch(`${apiUrl}/api/contacts/csv-import`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Deals Bulk Import — New Backend Endpoint Needed
```typescript
// backend/src/routes/deals.ts — new endpoint to add
// POST /api/deals/bulk-import
// Body: { deals: Array<{ title, value, stage?, expectedCloseDate?, contactEmail?, companyName?, description? }> }
// Returns: { imported, failed, errors }
// Stage normalization map needed:
const STAGE_MAP: Record<string, string> = {
  'prospecting': 'PROSPECTING',
  'qualification': 'QUALIFICATION',
  'proposal': 'PROPOSAL',
  'proposal/price quote': 'PROPOSAL',
  'negotiation': 'NEGOTIATION',
  'negotiation/review': 'NEGOTIATION',
  'closed won': 'CLOSED_WON',
  'closedwon': 'CLOSED_WON',
  'closed lost': 'CLOSED_LOST',
  'closedlost': 'CLOSED_LOST',
};
```

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/components/
├── MigrationWizardModal.tsx          # NEW: main wizard container
└── (wizard steps inlined or split)

backend/src/routes/
├── deals.ts                          # ADD: POST /api/deals/bulk-import
└── (existing routes untouched)

frontend/src/pages/Settings/
└── SettingsPage.tsx                  # MODIFY: add 'data-import' tab
```

### Where to Mount the Wizard
Option A: "Data Import" tab in SettingsPage — launcher button opens `MigrationWizardModal`.
Option B: Standalone page at `/settings/data-import`.

Option A is simpler and consistent with how other import modals are used in the app (ImportCompaniesModal is opened from a button in the Companies page).

### Anti-Patterns to Avoid
- **Don't re-implement CSV parsing on the frontend:** Use papaparse for column detection, send raw file to backend.
- **Don't loop POST /api/deals for bulk deal import:** Add a bulk endpoint; even 100 deals = 100 sequential API calls.
- **Don't embed source-CRM-specific logic in the modal:** Use a mapping config object keyed by CRM name so adding new sources is a data change, not a code change.
- **Don't use the csvImport.ts two-phase flow for this wizard:** It requires storing import state on the server between upload and process calls. The single-shot `/api/contacts/csv-import` and `/api/companies/import` endpoints are simpler and already work well.

---

## Open Questions

1. **Deal import: loop vs. bulk endpoint**
   - What we know: No bulk deals endpoint exists. `POST /api/deals` creates one deal per call.
   - What's unclear: What is the expected import volume? If typically <200 deals, looping is acceptable. If 1000+, a bulk endpoint is required.
   - Recommendation: Add `POST /api/deals/bulk-import` regardless — it's a small addition and avoids N round-trips.

2. **Manual column mapping: required or optional?**
   - What we know: The existing auto-mapping handles 95%+ of common column names from major CRMs.
   - What's unclear: Does the product require a manual mapping UI, or is "auto-map and show results" sufficient?
   - Recommendation: Show the auto-mapped result in a read-only table with an "Edit mappings" option. Manual override available but not forced.

3. **Template download: static files or generated?**
   - What we know: No backend endpoint exists for templates. Frontend generation via Blob is trivial.
   - Recommendation: Generate templates client-side — no backend needed.

---

## Sources

### Primary (HIGH confidence)
- `frontend/src/components/CSVImportModal.tsx` — full wizard step structure, API call pattern
- `frontend/src/components/ImportCompaniesModal.tsx` — papaparse usage, company field mapping
- `backend/prisma/schema.prisma:202,258,350` — exact Contact, Company, Deal field names and types
- `backend/src/routes/contacts.ts:447,786` — mapCSVFieldsToContact(), csv-import endpoint
- `backend/src/routes/companies.ts:456,836` — companies/import endpoint, mapCSVFieldsToCompany()
- `backend/src/routes/csvImport.ts` — generic two-phase import with entityType support
- `backend/src/routes/deals.ts:140` — POST /api/deals single-create endpoint
- `frontend/src/pages/Settings/SettingsPage.tsx:16,448` — SettingsTab type, tab array structure
- `frontend/src/index.css` — confirmed utility classes

### Secondary (MEDIUM confidence)
- Salesforce/HubSpot/Pipedrive/NetSuite export column names derived from common knowledge of these platforms' default CSV export formats. Verify against actual sample exports before finalizing template CSV headers.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — papaparse already installed, csv-parse already used
- Architecture: HIGH — based on direct codebase inspection
- Field names: HIGH — read directly from schema.prisma
- Existing endpoints: HIGH — read from route files
- CRM export column names: MEDIUM — not verified against live exports

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable codebase, no fast-moving dependencies)
