# Phase 2: Quote & Contract Lifecycle Management - Research

**Researched:** 2026-03-17
**Domain:** CRM Quote/Contract workflow on React 18 + TypeScript + Express/Prisma/PostgreSQL
**Confidence:** HIGH

---

## Summary

This phase introduces quote-to-signed-contract workflow for deals that reach CLOSED_WON stage. The codebase is well-structured and consistent: every entity follows the same shape — Prisma model → Express Router → frontend `api.ts` service object → React page/component. No existing Quote or Contract models exist in the Prisma schema, so both must be added via migration.

The deal detail page does NOT exist — currently clicking a deal card opens a modal (DealForm). Phase 2 must introduce a dedicated DealDetail page (route `/deals/:id`) with a multi-tab layout. The tab pattern and page structure to copy are in ContactDetail.tsx (lines 374–460), which renders gradient-card tabs and a `grid lg:grid-cols-3` layout.

**Primary recommendation:** Build DealDetail page first (tab shell + Documents tab), then add Quote and Contract models to Prisma, then wire backend CRUD routes, then implement the Quote builder and Contract editor as modals opened from the Documents tab.

---

## Standard Stack

### Core (confirmed from codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 + TypeScript | 18.x | Frontend UI | Project standard |
| React Router DOM | v6 (BrowserRouter) | Client routing | Already used in App.tsx for ContactDetail pattern |
| Prisma ORM | current | DB schema + queries | All models use Prisma |
| Express.js | current | Backend REST API | All existing routes |
| PostgreSQL | current | Database | Existing datasource |
| Axios (via `apiClient`) | current | HTTP client | Established in `frontend/src/services/api.ts` |
| @heroicons/react v2 | 24/outline | Icons | Used across all pages |
| @tanstack/react-query | current | In QueryClientProvider | Available but not widely used yet — use useState/useEffect pattern to match codebase |

### Supporting (confirmed in codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ThemeContext / `useTheme()` | local | Brand gradient buttons | Use `gradients.brand.primary.gradient` for primary CTAs |
| `appleDesign.css` | local | apple-card, apple-heading classes | ContactDetail uses these — match pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState/useEffect for data fetching | React Query | RQ adds caching but rest of app uses useState/useEffect — stay consistent |
| Custom textarea for contract editor | Rich text library (Quill/TipTap) | Phase goal says "contract editor with variable injection" — a rich textarea with variable chips is simpler and fits the stack. Rich text library is NOT needed unless explicitly required. |

### Installation
No new npm packages needed. Everything required is already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
frontend/src/pages/Deals/
├── DealBoard.tsx       (exists — add "View Detail" link on deal card)
├── DealForm.tsx        (exists — unchanged)
└── DealDetail.tsx      (NEW — tab page with Documents tab)

frontend/src/pages/Deals/components/
├── QuoteBuilder.tsx    (NEW — modal: line items, subtotal, notes)
├── ContractEditor.tsx  (NEW — modal: textarea with variable injection)
└── DocumentsTab.tsx    (NEW — lists quotes + contracts for a deal)

backend/src/routes/
├── deals.ts            (exists — add /api/deals/:id/quotes and /api/deals/:id/contracts nested routes, OR)
├── quotes.ts           (NEW — CRUD for quotes)
└── contracts.ts        (NEW — CRUD for contracts)
```

### Pattern 1: DealDetail Page (copy from ContactDetail)
**What:** Full-page view for a single deal with multi-tab navigation.
**When to use:** All entities with relational data use this pattern. Contacts and Companies already have detail pages.
**Key facts from ContactDetail.tsx:**
- Route param: `useParams<{ id: string }>()` — needs `/deals/:id` added to App.tsx
- Tab rendering: `grid grid-cols-4 gap-4` button grid, active tab gets `bg-gradient-to-br ${gradient} text-white shadow-lg scale-105`, inactive gets `bg-white hover:bg-gray-50`
- Layout: `grid grid-cols-1 lg:grid-cols-3 gap-6` — main content `lg:col-span-2`, sidebar `col-span-1`
- Back button uses `navigate('/deals')` + ArrowLeftIcon

**DealDetail tabs to implement:**
1. Overview (deal fields — title, value, stage, contact, company)
2. Activities (already fetched in `GET /api/deals/:id` includes `activities`)
3. Documents (NEW — quotes and contracts)

### Pattern 2: Prisma Model Addition + Migration
**What:** New Quote and Contract models referencing Deal.
**When to use:** Every new data entity follows this pattern.

```typescript
// schema.prisma additions

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}

enum ContractStatus {
  DRAFT
  SENT_FOR_SIGNATURE
  SIGNED
  CANCELLED
}

model Quote {
  id          String      @id @default(cuid())
  dealId      String
  userId      String
  status      QuoteStatus @default(DRAFT)
  title       String
  lineItems   Json        // Array of { description, quantity, unitPrice, total }
  subtotal    Decimal     @db.Decimal(12, 2)
  tax         Decimal?    @db.Decimal(12, 2)
  total       Decimal     @db.Decimal(12, 2)
  notes       String?
  validUntil  DateTime?
  sentAt      DateTime?
  acceptedAt  DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  deal      Deal      @relation(fields: [dealId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  contracts Contract[]

  @@index([dealId])
  @@index([userId])
  @@index([status])
  @@map("quotes")
}

model Contract {
  id          String         @id @default(cuid())
  dealId      String
  quoteId     String?
  userId      String
  status      ContractStatus @default(DRAFT)
  title       String
  content     String         @db.Text   // HTML/plaintext body with variables resolved
  variables   Json?          // { clientName, companyName, dealValue, ... }
  signedAt    DateTime?
  signedBy    String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  deal  Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
  quote Quote?  @relation(fields: [quoteId], references: [id], onDelete: SetNull)
  user  User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([dealId])
  @@index([userId])
  @@index([status])
  @@map("contracts")
}
```

### Pattern 3: Backend Route Structure (copy from deals.ts)
**What:** Express Router with `router.use(authenticate)` at top, full CRUD.
**When to use:** Every new entity.
**Key facts from deals.ts:**
- Ownership check: `where: { id, userId: req.user?.id }` on every mutation
- Decimal serialization: `value: Number(deal.value)` before `res.json()`
- Soft delete: `isActive: false` (quotes/contracts can use hard delete since they are scoped to a deal)
- Error handling: `next(error)` — global error handler in `middleware/errorHandler`
- Route registration in `app.ts`: `app.use('/api/quotes', quotesRoutes)` after auth setup

### Pattern 4: Frontend API Service (copy from dealsApi in api.ts)
**What:** Export object with async functions wrapping `apiClient.get/post/put/delete`.
**When to use:** Every new backend resource.

```typescript
// Add to frontend/src/services/api.ts
export const quotesApi = {
  getByDeal: async (dealId: string) => {
    const response = await apiClient.get(`/quotes`, { params: { dealId } });
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post('/quotes', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await apiClient.put(`/quotes/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await apiClient.delete(`/quotes/${id}`);
    return response.data;
  },
};

export const contractsApi = {
  getByDeal: async (dealId: string) => { ... },
  create: async (data: any) => { ... },
  update: async (id: string, data: any) => { ... },
  delete: async (id: string) => { ... },
};
```

### Pattern 5: Modal Pattern (copy from DealForm.tsx)
**What:** Fixed overlay modal with backdrop blur, header, scrollable body.
**CSS classes confirmed in use:**
- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50`
- Container: `bg-white rounded-xl shadow-2xl border-4 border-orange-300 max-w-lg w-full max-h-[90vh] overflow-y-auto`
- Close button: XMarkIcon in header
- Submit button: `bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg`

### Anti-Patterns to Avoid
- **No detail page — opening modal on card click:** DealBoard currently does this. The planner must add a route `/deals/:id` in App.tsx and link cards to it; the DealForm modal stays for editing basic fields but Documents tab lives on the detail page.
- **Inventing API endpoints:** Every backend route must match an actual `router.get/post/put/patch/delete` call. Do not reference endpoints that don't exist.
- **Skipping Decimal serialization:** All `Decimal` fields from Prisma must be converted with `Number()` before `res.json()`. Forgetting this causes JSON serialization errors.
- **No auth check on mutations:** Every POST/PUT/DELETE must check `where: { id, userId: req.user?.id }` or the route will leak data across users.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line item totals | Custom arithmetic | Standard JS: `items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)` | Simple math, no library needed |
| Variable injection in contract | Template engine | String `.replace(/\{\{(\w+)\}\}/g, ...)` | Simple enough for CRM contract templates; no dependency needed |
| Auth token passing | Custom header logic | Existing `apiClient` interceptor (api.ts:14-21) already attaches `Authorization: Bearer` | Token injection is already solved |
| Form state management | Redux/Zustand | `useState` (matches codebase pattern) | Every existing form uses local useState |
| Prisma migration | Manual SQL | `npx prisma migrate dev --name add-quotes-contracts` | Standard Prisma workflow |

---

## Common Pitfalls

### Pitfall 1: No Route for DealDetail in App.tsx
**What goes wrong:** Creating DealDetail.tsx but not adding `<Route path="deals/:id" element={<DealDetail />} />` in App.tsx — the page renders nothing and navigation breaks.
**Why it happens:** App.tsx is the single source of truth for routes; forgetting to update it is easy.
**How to avoid:** App.tsx must be updated alongside DealDetail.tsx creation.
**Warning signs:** Clicking a deal navigates but shows a blank page or redirects to dashboard.

### Pitfall 2: Decimal Serialization Crash
**What goes wrong:** Returning Prisma `Decimal` fields directly in `res.json()` causes JSON serialization errors.
**Why it happens:** `deals.ts:77-81` shows the existing workaround — it must be replicated for Quote/Contract `subtotal`, `tax`, `total` fields.
**How to avoid:** Always map `Number(quote.subtotal)`, `Number(quote.tax)`, `Number(quote.total)` before returning.

### Pitfall 3: Quote trigger: "Closed Won" only vs. any stage
**What goes wrong:** Allowing quotes to be created on any deal stage, not just CLOSED_WON — creates operational confusion.
**Why it happens:** The backend doesn't enforce stage-gating unless you add a check.
**How to avoid:** Quote creation endpoint should validate `deal.stage === 'CLOSED_WON'` OR the UI should only show the Documents tab / "Create Quote" button for CLOSED_WON deals. UI-level gating is simpler.

### Pitfall 4: Deal model missing Quote/Contract relations
**What goes wrong:** Adding Quote and Contract models but forgetting to add `quotes Quote[]` and `contracts Contract[]` relations to the `Deal` model in schema.prisma.
**Why it happens:** Prisma requires bidirectional relation declarations.
**How to avoid:** Add the relation fields to Deal model before running migration.

### Pitfall 5: User model missing Quote/Contract relations
**What goes wrong:** Same as above — User model at schema.prisma:162-177 must get `quotes Quote[]` and `contracts Contract[]` lines added.
**How to avoid:** Update User model when adding new models that reference User.

### Pitfall 6: Missing route registration in app.ts
**What goes wrong:** Creating `routes/quotes.ts` but not adding `app.use('/api/quotes', quotesRoutes)` in app.ts — API calls return 404.
**Why it happens:** app.ts is a centralized registry.
**How to avoid:** Add route imports and `app.use()` calls to app.ts as part of the same task that creates the route file.

---

## Code Examples

### Tab Navigation Pattern (from ContactDetail.tsx:374-404)
```tsx
// Reuse this exact pattern for DealDetail tabs
const [activeTab, setActiveTab] = useState('overview');

const tabs = [
  { id: 'overview', name: 'Overview', icon: CurrencyDollarIcon, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'activities', name: 'Activities', icon: ClockIcon, gradient: 'from-indigo-500 to-purple-600' },
  { id: 'documents', name: 'Documents', icon: DocumentTextIcon, gradient: 'from-green-500 to-green-600' },
];

// Render:
<div className="grid grid-cols-3 gap-4 mb-6">
  {tabs.map((tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 transform ${
          isActive
            ? `bg-gradient-to-br ${tab.gradient} text-white shadow-lg scale-105`
            : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md hover:-translate-y-1'
        }`}
      >
        <div className="flex items-center justify-center space-x-3">
          <div className={`${isActive ? 'bg-white bg-opacity-20' : 'bg-gray-100'} rounded-lg p-2`}>
            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <span className="font-semibold text-sm">{tab.name}</span>
        </div>
      </button>
    );
  })}
</div>
```

### Modal Overlay Pattern (from DealForm.tsx:164-166)
```tsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-xl shadow-2xl border-4 border-orange-300 max-w-lg w-full max-h-[90vh] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-rose-50">
      <h2 className="text-xl font-bold text-gray-900">Create Quote</h2>
      <button type="button" onClick={onClose} className="text-white hover:bg-black/10 rounded-full p-2 transition-colors">
        <XMarkIcon className="h-6 w-6" />
      </button>
    </div>
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* fields */}
    </form>
  </div>
</div>
```

### Input Field Classes (confirmed from index.css:813-836)
```tsx
// Use .input-field for all form inputs and textareas
<input className="input-field" ... />
<textarea className="input-field" rows={6} ... />
<select className="input-field" ... />

// Labels follow this pattern:
<label className="block text-sm font-medium text-gray-700 mb-1">Field Label</label>
```

### Primary Action Button Pattern (from DealForm.tsx:352-356)
```tsx
<button
  type="submit"
  className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg border border-indigo-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
  disabled={loading}
>
  {loading ? 'Saving...' : 'Save Quote'}
</button>
```

### Status Badge Pattern (confirmed from index.css:922-951)
```tsx
// Use .badge + .badge-success/.badge-warning/.badge-error/.badge-gray
<span className="badge badge-success">ACCEPTED</span>
<span className="badge badge-warning">SENT</span>
<span className="badge badge-gray">DRAFT</span>
<span className="badge badge-error">REJECTED</span>
```

### Card Component (confirmed from index.css:857-865)
```tsx
// .card = glass morphism dark card
<div className="card p-6">
  <h3 className="text-lg font-bold text-gray-900 mb-4">Quotes</h3>
</div>
```

### Table Pattern (confirmed from index.css:876-920)
```tsx
// .table class handles all styling
<table className="table">
  <thead>
    <tr>
      <th>Title</th>
      <th>Total</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {quotes.map(q => (
      <tr key={q.id}>
        <td>{q.title}</td>
        <td>${q.total}</td>
        <td><span className="badge badge-success">{q.status}</span></td>
      </tr>
    ))}
  </tbody>
</table>
```

### Prisma Migration Command
```bash
cd /Users/jeet/Documents/production-crm-backup/backend
npx prisma migrate dev --name add-quotes-contracts
npx prisma generate
```

### Variable Injection Pattern for Contract Editor
```typescript
// Simple template variable replacement — no library needed
const resolveVariables = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
};

// Available variables from deal context:
// {{clientName}}, {{companyName}}, {{dealTitle}}, {{dealValue}}, {{closeDate}}, {{signatureDate}}
```

### App.tsx Route Addition
```tsx
// Add to App.tsx alongside existing deals route:
import { DealDetail } from './pages/Deals/DealDetail';

// Inside the protected routes:
<Route path="deals" element={<DealBoard />} />
<Route path="deals/:id" element={<DealDetail />} />  // ADD THIS
```

### DealBoard card — add detail link
```tsx
// In DealBoard.tsx deal card onClick, change from:
onClick={() => handleEditDeal(deal)}
// To (option A — separate click target):
// Keep card onClick for detail page navigation, add separate "Edit" icon button
onClick={() => navigate(`/deals/${deal.id}`)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No deal detail page | DealBoard opens DealForm modal | Need to ADD `/deals/:id` route and DealDetail page |
| No Quote/Contract models | Not in schema.prisma | Full migration + CRUD work needed |
| Static deal cards | Cards only trigger edit modal | Planner must decide: navigate on click vs. separate "open detail" button |

---

## Open Questions

1. **Should clicking a deal card navigate to DealDetail, or keep the current modal behavior and add a separate "View" button?**
   - What we know: Currently `onClick={() => handleEditDeal(deal)}` opens a modal.
   - What's unclear: User preference — replace click behavior or add a secondary action.
   - Recommendation: Add a small `DocumentTextIcon` or `ExternalLinkIcon` button on each deal card that navigates to `/deals/:id`, while preserving card click for the edit modal. This is the least disruptive change.

2. **Should quotes auto-generate when a deal moves to CLOSED_WON, or require manual creation?**
   - What we know: DealBoard has `handleStageChange` → `dealsApi.updateStage`. No automation hooks exist currently.
   - Recommendation: Manual creation only (user clicks "New Quote" on Documents tab). Auto-generation can be deferred to a later phase.

3. **Does the contract require PDF export?**
   - What we know: Phase goal mentions "Documents tab" and "contract editor" — no mention of PDF.
   - Recommendation: In-browser view/print (`window.print()`) is sufficient for Phase 2. PDF library is a deferred enhancement.

---

## Sources

### Primary (HIGH confidence — directly read from codebase)
- `/backend/prisma/schema.prisma` — complete Deal, User, Activity models confirmed; no Quote/Contract models exist
- `/backend/src/routes/deals.ts` — CRUD patterns, ownership checks, Decimal serialization, soft delete
- `/backend/src/app.ts` — route registration pattern, auth middleware setup
- `/backend/src/middleware/auth.ts` — `authenticate` middleware, `req.user.id` availability
- `/frontend/src/App.tsx` — React Router v6 setup, `<Route path="deals">` exists, no `/deals/:id` route
- `/frontend/src/pages/Contacts/ContactDetail.tsx` — tab grid pattern, modal pattern, apple-card usage
- `/frontend/src/pages/Deals/DealBoard.tsx` — deal stage enum, card click behavior
- `/frontend/src/pages/Deals/DealForm.tsx` — modal structure, input-field class, form patterns
- `/frontend/src/services/api.ts` — apiClient, Bearer token interceptor, dealsApi shape
- `/frontend/src/index.css` — `.card`, `.input-field`, `.badge`, `.table`, `.modal-overlay`, `.modal-content`, `.btn-primary`, `.btn-secondary` classes confirmed
- `/frontend/src/styles/appleDesign.css` — apple-card, apple-heading, apple-button-primary confirmed

---

## Metadata

**Confidence breakdown:**
- Deal model fields: HIGH — read directly from schema.prisma:350-382
- Routing pattern: HIGH — read directly from App.tsx
- API CRUD pattern: HIGH — read directly from deals.ts
- CSS utility classes: HIGH — read directly from index.css
- Quote/Contract schema design: MEDIUM — designed by analogy to existing models; exact field names are planner's discretion
- Tab UI pattern: HIGH — read directly from ContactDetail.tsx:374-404

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable codebase, 30-day window)
