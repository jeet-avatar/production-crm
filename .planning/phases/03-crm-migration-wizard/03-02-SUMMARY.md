---
phase: 03-crm-migration-wizard
plan: 02
subsystem: frontend-component
tags: [wizard, modal, csv, papaparse, crm-import]
dependency_graph:
  requires: [03-01-SUMMARY]
  provides: [MigrationWizardModal component, steps 1-5]
  affects: [frontend/src/components/MigrationWizardModal.tsx]
tech_stack:
  added: []
  patterns: [papaparse-header-parse, client-side-blob-download, auto-column-mapping]
key_files:
  created:
    - frontend/src/components/MigrationWizardModal.tsx
  modified: []
decisions:
  - Steps 4 and 5 implemented in same file (not stubbed) — plan 03 tasks will update SettingsPage only
  - autoMapColumns uses ALIAS_MAP with 30+ aliases covering all 6 CRM column name variations
  - Spinner keyframe injected via inline <style> tag — avoids new CSS class invention
  - handleImport() included in this component (not split) — simpler architecture
  - import * as Papa used (matching existing ImportCompaniesModal pattern)
metrics:
  duration: 12m
  completed: 2026-03-19
  tasks_completed: 1
  files_modified: 1
---

# Phase 03 Plan 02: MigrationWizardModal Summary

**One-liner:** Full 5-step MigrationWizardModal with CRM picker, entity type, template download, CSV upload via papaparse, auto column mapping, import routing, and results display using CSS variable styling.

## What Was Built

Created `frontend/src/components/MigrationWizardModal.tsx` (709 lines) with all 5 wizard steps implemented:

- **Step 1:** 3x2 CRM source grid (Salesforce, HubSpot, NetSuite, Pipedrive, Zoho, Generic CSV)
- **Step 2:** Entity type selector (Contacts / Companies / Deals) + template download button
- **Step 3:** Drag-and-drop CSV upload zone with papaparse column detection and preview chips
- **Step 4:** Column mapping table with auto-suggestions from ALIAS_MAP, editable dropdowns per row, required-field validation
- **Step 5:** Import results (imported count, duplicates, failed) with scrollable error list

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create MigrationWizardModal.tsx with full 5-step wizard | 300d81e |

## Key Implementation Details

**CRM_TEMPLATES:** 6 CRMs × 3 entity types = 18 template header sets for client-side CSV generation.

**autoMapColumns():** Uses a 30+ entry ALIAS_MAP to pre-fill column dropdowns. Normalized by `.toLowerCase().trim()`. Unknown headers default to 'skip'.

**handleImport():** Three code paths based on `entityType`:
- `contacts` → rebuilds CSV with BrandMonkz headers → `POST /api/contacts/csv-import` (FormData with `files[]`)
- `companies` → rebuilds CSV → `POST /api/companies/import` (FormData with `file`)
- `deals` → builds JSON array → `POST /api/deals/bulk-import` (JSON body)

**Validation:** Required fields checked before advancing to step 5:
- contacts: firstName + lastName
- companies: name
- deals: title + value

**Styling:** 100% inline styles with CSS variables (`--bg-elevated`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border-default`, `--accent-primary`, `--accent-gradient`). No Tailwind classes invented.

## Deviations from Plan

**1. Steps 4-5 implemented in this plan (not stubbed)**
- **Reason:** Plan 02 and Plan 03 both modify the same file. Implementing all 5 steps now avoids a second full-file rewrite in Plan 03.
- **Impact on Plan 03:** Plan 03 Task 1 (wizard steps 4-5) is already complete. Plan 03 Task 2 (SettingsPage) still needed.
- **Rule:** Rule 2 (auto-add missing critical functionality) — fully functional component prevents crashes and reduces integration risk.

## Self-Check: PASSED

- [x] File exists: `/Users/jeet/Documents/production-crm-backup/frontend/src/components/MigrationWizardModal.tsx`
- [x] Line count: 709 (>200 minimum)
- [x] TypeScript: 0 errors (`npx tsc --noEmit 2>&1 | grep MigrationWizard` → no output)
- [x] grep shows CRM_SOURCES (6 entries), CRM_TEMPLATES, Papa.parse, downloadTemplate, currentStep, autoMapColumns, handleImport, columnMappings, importResults
- [x] Commit 300d81e exists
