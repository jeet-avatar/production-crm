---
phase: 02-quote-contract-lifecycle
plan: 03
subsystem: frontend/deals
tags: [quotes, contracts, modal, line-items, variable-injection, status-workflow]
dependency_graph:
  requires: [02-02]
  provides: [QuoteBuilder, ContractEditor, DocumentsTab-wired]
  affects: [DealDetail]
tech_stack:
  added: []
  patterns: [controlled-form-modal, inline-computed-totals, regex-variable-injection, conditional-modal-render]
key_files:
  created:
    - frontend/src/pages/Deals/components/QuoteBuilder.tsx
    - frontend/src/pages/Deals/components/ContractEditor.tsx
  modified:
    - frontend/src/pages/Deals/components/DocumentsTab.tsx
    - frontend/src/pages/Deals/DealDetail.tsx
decisions:
  - "Subtotal/total computed inline during render (not useState + useEffect) to avoid stale state"
  - "ContractEditor resolveVariables() also handles firstName+lastName concatenation from deal.contact to support the DealDetail contact shape"
  - "DocumentsTab moved from prop-passed callbacks to internal modal state — simpler, no prop drilling"
  - "window.prompt() used for signedBy on SIGNED contract status — plan spec explicitly said keep it simple"
metrics:
  duration: "~35 min"
  completed: "2026-03-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 2
status: COMPLETE
requirements-completed: [REQ-011, REQ-012, REQ-013]
---

# Phase 02 Plan 03: QuoteBuilder + ContractEditor + DocumentsTab Wiring Summary

**One-liner:** QuoteBuilder modal with live-totaling line items + ContractEditor with {{variable}} injection and preview toggle, both wired into DocumentsTab with status update dropdowns.

## Tasks Completed

| Task | Commit | Files |
|------|--------|-------|
| Task 1: QuoteBuilder modal | `0deb256` | QuoteBuilder.tsx (created) |
| Task 2: ContractEditor + DocumentsTab wire + DealDetail prop update | `683846e` | ContractEditor.tsx (created), DocumentsTab.tsx (updated), DealDetail.tsx (updated) |

## What Was Built

### QuoteBuilder.tsx
- Dynamic line items table with add/remove row controls
- Row total (`qty * unitPrice`) computed on every input change via `updateLineItem()`
- Subtotal, tax amount, and grand total computed inline during render — no `useEffect`
- Tax rate field (%) drives the tax computation live
- Valid Until date field and Notes textarea
- Calls `quotesApi.create()` on submit; on success calls `onSaved()` + `onClose()`
- Modal overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm` (matches DealForm pattern)

### ContractEditor.tsx
- Variable chips: `{{deal_name}}`, `{{deal_value}}`, `{{contact_name}}`, `{{company_name}}`, `{{date}}` — click to append to textarea
- `resolveVariables(template)` uses regex `\{\{[\w_]+\}\}` to replace all known variables
- Contact name resolution handles both `name`/`full_name` and `firstName`/`lastName` shapes (deal.contact from DealDetail has `firstName`+`lastName`)
- Live Preview toggle: renders `resolveVariables(content)` in a read-only div
- Default template pre-filled with all variable placeholders on open
- Calls `contractsApi.create({ ..., content: resolveVariables(content), variables: VARIABLES })`

### DocumentsTab.tsx (updated)
- Prop interface changed: `dealStage: string` + callback props replaced by `deal: { stage, title, value, contact, company }`
- `showQuoteBuilder` + `showContractEditor` state drives conditional modal rendering
- `fetchDocuments()` named function called on mount and as `onSaved` callback for both modals
- Quotes table Actions column: `<select>` with all QuoteStatus values → `quotesApi.updateStatus()`
- Contracts table Actions column: `<select>` with all ContractStatus values → `contractsApi.updateStatus()`; SIGNED selection triggers `window.prompt('Signed by:')`

### DealDetail.tsx (updated)
- `<DocumentsTab dealId={id!} dealStage={deal?.stage ?? ''} />` → `<DocumentsTab dealId={id!} deal={deal} />`
- Full deal object passed (includes stage, title, value, contact, company)

## Deviations from Plan

None — plan executed exactly as written.

## Verification Checklist (pre-human)

- [x] `ls frontend/src/pages/Deals/components/QuoteBuilder.tsx` — exists
- [x] `ls frontend/src/pages/Deals/components/ContractEditor.tsx` — exists
- [x] `grep resolveVariables ContractEditor.tsx` — present
- [x] `grep "showQuoteBuilder\|showContractEditor" DocumentsTab.tsx` — both present
- [x] `grep "updateStatus" DocumentsTab.tsx` — present for both quotes and contracts
- [x] `npx tsc --noEmit` — exits 0 (zero TypeScript errors)
- [x] Human verification checkpoint: full quote-to-contract flow in browser — APPROVED

## Self-Check: PASSED

All 3 tasks complete. Task 1 commit `0deb256` exists. Task 2 commit `683846e` exists. Human-verify checkpoint cleared with user approval. All artifacts verified.
