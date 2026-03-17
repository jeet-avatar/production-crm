---
phase: quick-1
plan: "01"
subsystem: frontend-css
tags: [dark-theme, indigo-noir, css, utility-classes]
dependency_graph:
  requires: []
  provides: [indigo-noir-complete-orange-rose-remap]
  affects: [frontend/src/index.css]
tech_stack:
  added: []
  patterns: [tailwind-utility-override, css-custom-properties]
key_files:
  created: []
  modified:
    - frontend/src/index.css
decisions:
  - amber-* classes intentionally retain orange values (amber is a separate color scale)
  - text-gray-100/200/300 map to dark-theme CSS vars so light class names render light text on dark bg
metrics:
  duration: "~70 minutes"
  completed: "2026-03-17"
  tasks_completed: 2
  files_modified: 1
---

# Phase quick-1 Plan 01: Fix Indigo Noir Dark Theme — Remap Orange/Rose to Indigo/Violet Summary

Remapped every `orange-*` and `rose-*` CSS utility class in `frontend/src/index.css` from amber/red color values to indigo/violet equivalents, completing the Indigo Noir dark theme without touching any TSX files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remap orange text/bg/border/shadow/gradient utility classes to indigo | `9ecaf74` | `frontend/src/index.css` |
| 2 | Remap rose utility classes to violet, add missing gray text classes | `1216405` | `frontend/src/index.css` |

## What Changed

### Task 1: Orange → Indigo Remap (commit `9ecaf74`)

**Text colors (lines 276-277 and former 495-496):**
- `.text-orange-600`: `#EA580C` → `#6366F1`
- `.text-orange-700`: `#C2410C` → `#818CF8`
- `.text-orange-500` (Additional utilities): `#F59E0B` → `#818CF8`
- `.text-orange-600` (Additional utilities): `#EA580C` → `#6366F1`
- Added: `.text-orange-700/800/900` → `#818CF8 / #6366F1 / #4F46E5`

**Background colors:**
- `.bg-orange-50`: `rgba(245, 158, 11, 0.08)` → `rgba(99, 102, 241, 0.08)` (both occurrences)
- `.bg-orange-200`: `rgba(245, 158, 11, 0.2)` → `rgba(99, 102, 241, 0.2)`
- `.bg-orange-700`: `#C2410C` → `#4338CA`
- `.bg-orange-100`: `rgba(245, 158, 11, 0.15)` → `rgba(99, 102, 241, 0.15)`
- `.bg-orange-500`: `#F59E0B` → `#6366F1`
- `.bg-orange-600`: `#EA580C` → `#4F46E5`

**Border:**
- `.border-black`: `#000000` → `rgba(99, 102, 241, 0.3)` (subtle indigo border)
- `.border-orange-200`: `rgba(245, 158, 11, 0.2)` → `rgba(99, 102, 241, 0.2)`
- Added: `.border-orange-300` → `rgba(99, 102, 241, 0.3)`
- Added: `.border-orange-600` → `#4F46E5`

**Shadow:**
- `.shadow-orange-500/30`: both `rgba(245, 158, 11, 0.3)` → `rgba(99, 102, 241, 0.3)`

**Hover states:**
- `.hover:to-orange-700`: `#C2410C` → `#4338CA`
- Added: `.hover:bg-orange-50/100`, `.hover:from-orange-600/700`, `.hover:to-orange-600`

**Gradient from-orange:**
- `.from-orange-50`: amber rgba → `rgba(99, 102, 241, 0.08)`
- `.from-orange-400`: `#FB923C` → `#818CF8`
- `.from-orange-500`: `#F59E0B` → `#6366F1`
- `.from-orange-600`: `#EA580C` → `#4F46E5`
- Added: `.from-orange-100` → `rgba(99, 102, 241, 0.15)`

**Gradient to-orange:**
- `.to-orange-600`: `#EA580C` → `#4F46E5`
- `.to-orange-400`: `#FB923C` → `#818CF8`
- `.to-orange-500`: `#F97316` → `#6366F1`
- `.to-orange-700`: `#C2410C` → `#4338CA`

### Task 2: Rose → Violet Remap + Gray Text (commit `1216405`)

**Rose gradient to:**
- `.to-rose-600`: `#E11D48` → `#7C3AED`
- Added: `.to-rose-50/100/400/500` → violet equivalents

**Rose backgrounds (new classes):**
- `.bg-rose-50`: `rgba(139, 92, 246, 0.08)`
- `.bg-rose-100`: `rgba(139, 92, 246, 0.15)`
- `.bg-rose-500`: `#8B5CF6`
- `.bg-rose-600`: `#7C3AED`

**Rose text (new classes):**
- `.text-rose-700`: `#6D28D9`
- `.text-rose-800`: `#5B21B6`
- `.text-rose-900`: `#4C1D95`

**Rose borders (new classes):**
- `.border-rose-200`: `rgba(139, 92, 246, 0.2)`
- `.border-rose-500`: `#8B5CF6`
- `.border-rose-600`: `#7C3AED`

**Rose gradient from (new classes):**
- `.from-rose-50/500/600` → violet gradient values

**Rose hover gradients (new classes):**
- `.hover:from-rose-600/700`, `.hover:to-rose-600`

**Missing light gray text classes (new):**
- `.text-gray-100` → `var(--color-gray-900)` = `#F1F5F9`
- `.text-gray-200` → `var(--color-gray-800)` = `#E2E8F0`
- `.text-gray-300` → `var(--color-gray-700)` = `#CBD5E1`

## Verification Results

```
# No orange hex in orange-* rules (amber-* intentionally retain amber values):
grep "#F59E0B|#EA580C|#C2410C|#FB923C|#F97316|#E11D48" → 2 matches (both in amber-* classes only)

# Indigo value count:
grep "99, 102, 241|#6366F1|#4F46E5|#818CF8|#4338CA" → 55 matches

# Violet value count:
grep "139, 92, 246|#8B5CF6|#7C3AED|#6D28D9" → 34 matches

# Build:
Vite build ✓ built in 2.68s — no CSS parse errors
```

## Deviations from Plan

None — plan executed exactly as written. All specified edits made, all specified new classes added, and the build was verified with no errors.

## Self-Check: PASSED

- [x] `frontend/src/index.css` exists and modified
- [x] Commit `9ecaf74` exists (Task 1)
- [x] Commit `1216405` exists (Task 2)
- [x] Zero orange hex values in `orange-*` class rules
- [x] Zero rose-red values in `rose-*` class rules
- [x] 55 indigo value occurrences confirmed
- [x] 34 violet value occurrences confirmed
- [x] `text-gray-100/200/300` defined, pointing to dark-theme light text vars
- [x] Vite build passes with no CSS errors
- [x] No TSX files modified
