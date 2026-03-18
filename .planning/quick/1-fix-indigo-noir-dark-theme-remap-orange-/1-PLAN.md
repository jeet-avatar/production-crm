---
phase: quick-1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/index.css
autonomous: true
requirements:
  - THEME-01
must_haves:
  truths:
    - "No orange or rose colors appear anywhere in the UI — all accent colors render as indigo/violet"
    - "Badge and pill components with light backgrounds show indigo/violet tints, not orange/rose tints"
    - "Gray text at light shades (100/200/300) renders visible against dark backgrounds"
    - "Border-black elements show a subtle indigo border instead of hard black"
    - "Gradient buttons and cards use indigo-to-violet progressions, not orange-to-rose"
  artifacts:
    - path: "frontend/src/index.css"
      provides: "Complete remapped orange/rose → indigo/violet utility classes"
      contains: "rgba(99, 102, 241"
  key_links:
    - from: "frontend/src/index.css utility classes"
      to: "TSX components using className"
      via: "CSS class name matching"
      pattern: "bg-orange-|text-orange-|from-orange-|to-orange-|border-orange-|bg-rose-|text-rose-|from-rose-|to-rose-"
---

<objective>
Remap all orange/rose CSS utility class values in index.css to indigo/violet equivalents, add missing light gray text classes, and fix border-black — completing the Indigo Noir dark theme without touching any TSX files.

Purpose: The dark theme CSS variables are correct but the utility class definitions still emit orange/rose color values, causing 441 component instances to render the wrong accent colors.
Output: A single updated index.css where every orange/rose class maps to an indigo/violet value.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/frontend/src/index.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remap orange text/bg/border/shadow utility classes to indigo</name>
  <files>frontend/src/index.css</files>
  <action>
Edit index.css to fix every orange-* class that still emits orange values. Make these exact replacements using the Edit tool:

**Text colors (lines 276-277 and 495-496):**
- Line 276: `.text-orange-600 { color: #EA580C; }` → `color: #6366F1;`
- Line 277: `.text-orange-700 { color: #C2410C; }` → `color: #818CF8;`
- Line 495: `.text-orange-500 { color: #F59E0B; }` → `color: #818CF8;`
- Line 496: `.text-orange-600 { color: #EA580C; }` (duplicate) → `color: #6366F1;`

Also ADD these missing text classes after `.text-orange-600` at line 496 (after the second block):
```css
.text-orange-700 { color: #818CF8; }
.text-orange-800 { color: #6366F1; }
.text-orange-900 { color: #4F46E5; }
```

**Background colors (lines 301-303 and 511-514):**
- Line 301: `.bg-orange-50 { background-color: rgba(245, 158, 11, 0.08); }` → `rgba(99, 102, 241, 0.08)`
- Line 302: `.bg-orange-200 { background-color: rgba(245, 158, 11, 0.2); }` → `rgba(99, 102, 241, 0.2)`
- Line 303: `.bg-orange-700 { background-color: #C2410C; }` → `#4338CA`
- Line 511: `.bg-orange-50 { background-color: rgba(245, 158, 11, 0.08); }` (duplicate) → `rgba(99, 102, 241, 0.08)`
- Line 512: `.bg-orange-100 { background-color: rgba(245, 158, 11, 0.15); }` → `rgba(99, 102, 241, 0.15)`
- Line 513: `.bg-orange-500 { background-color: #F59E0B; }` → `#6366F1`
- Line 514: `.bg-orange-600 { background-color: #EA580C; }` → `#4F46E5`

**Border (lines 318 and 322):**
- Line 318: `.border-black { border-color: #000000; }` → `rgba(99, 102, 241, 0.3)`
- Line 322: `.border-orange-200 { border-color: rgba(245, 158, 11, 0.2); }` → `rgba(99, 102, 241, 0.2)`

**Shadow (line 353):**
- Line 353: `.shadow-orange-500\/30 { box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.3), 0 4px 6px -4px rgba(245, 158, 11, 0.3); }` → replace both rgba values with `rgba(99, 102, 241, 0.3)`

**Hover state (line 465):**
- Line 465: `.hover\:to-orange-700:hover { --tw-gradient-to: #C2410C; }` → `#4338CA`

**Gradient from-orange (lines 538-540 and 550):**
- Line 538: `.from-orange-50 { --tw-gradient-from: rgba(245, 158, 11, 0.08); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(245, 158, 11, 0)); }` → replace first value with `rgba(99, 102, 241, 0.08)` and fallback with `rgba(99, 102, 241, 0)`
- Line 539: `.from-orange-400 { --tw-gradient-from: #FB923C; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(251, 146, 60, 0)); }` → replace with `#818CF8` and fallback `rgba(129, 140, 248, 0)`
- Line 540: `.from-orange-500 { --tw-gradient-from: #F59E0B; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(245, 158, 11, 0)); }` → replace with `#6366F1` and fallback `rgba(99, 102, 241, 0)`
- Line 550: `.from-orange-600 { --tw-gradient-from: #EA580C; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(234, 88, 12, 0)); }` → replace with `#4F46E5` and fallback `rgba(79, 70, 229, 0)`

**Gradient to-orange (lines 567, 586-588):**
- Line 567: `.to-orange-600 { --tw-gradient-to: #EA580C; }` → `#4F46E5`
- Line 586: `.to-orange-400 { --tw-gradient-to: #FB923C; }` → `#818CF8`
- Line 587: `.to-orange-500 { --tw-gradient-to: #F97316; }` → `#6366F1`
- Line 588: `.to-orange-700 { --tw-gradient-to: #C2410C; }` → `#4338CA`

**ADD missing orange gradient classes** (insert after `.from-orange-600` at line 550):
```css
.from-orange-100 { --tw-gradient-from: rgba(99, 102, 241, 0.15); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(99, 102, 241, 0)); }
```

**ADD missing hover gradient classes** (insert after `.hover\:to-orange-700:hover` at line 465):
```css
.hover\:bg-orange-50:hover { background-color: rgba(99, 102, 241, 0.08); }
.hover\:bg-orange-100:hover { background-color: rgba(99, 102, 241, 0.15); }
.hover\:from-orange-600:hover { --tw-gradient-from: #4F46E5; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(79, 70, 229, 0)); }
.hover\:from-orange-700:hover { --tw-gradient-from: #4338CA; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(67, 56, 202, 0)); }
.hover\:to-orange-600:hover { --tw-gradient-to: #4F46E5; }
```

**ADD missing border orange classes** (insert after `.border-orange-200` at line 322):
```css
.border-orange-300 { border-color: rgba(99, 102, 241, 0.3); }
.border-orange-600 { border-color: #4F46E5; }
```
  </action>
  <verify>
Run in the frontend/src directory:
```bash
grep -n "rgba(245, 158" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
grep -n "#F59E0B\|#EA580C\|#C2410C\|#FB923C\|#F97316" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Both greps should return zero matches (no remaining orange values).
Also verify new values present:
```bash
grep -c "rgba(99, 102, 241" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Should return 10+ matches.
  </verify>
  <done>All orange-* utility classes in index.css emit indigo values. grep for orange hex/rgba returns 0 results inside orange-* rules.</done>
</task>

<task type="auto">
  <name>Task 2: Remap rose utility classes to violet and add missing gray text classes</name>
  <files>frontend/src/index.css</files>
  <action>
Edit index.css to remap rose-* classes and add the three missing light gray text utilities.

**Rose gradient (line 574):**
- Line 574: `.to-rose-600 { --tw-gradient-to: #E11D48; }` → `#7C3AED`

**ADD all missing rose utility classes.** Insert after `.bg-purple-600` block (around line 510) in the "Additional color utilities" section:
```css
.bg-rose-50 { background-color: rgba(139, 92, 246, 0.08); }
.bg-rose-100 { background-color: rgba(139, 92, 246, 0.15); }
.bg-rose-500 { background-color: #8B5CF6; }
.bg-rose-600 { background-color: #7C3AED; }
```

**ADD missing rose text classes** after `.text-red-700` (line 499):
```css
.text-rose-700 { color: #6D28D9; }
.text-rose-800 { color: #5B21B6; }
.text-rose-900 { color: #4C1D95; }
```

**ADD missing rose border classes** after `.border-orange-600` (newly inserted):
```css
.border-rose-200 { border-color: rgba(139, 92, 246, 0.2); }
.border-rose-500 { border-color: #8B5CF6; }
.border-rose-600 { border-color: #7C3AED; }
```

**ADD missing rose gradient classes** in the gradient section after `.from-purple-600` (line 537):
```css
.from-rose-50 { --tw-gradient-from: rgba(139, 92, 246, 0.08); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(139, 92, 246, 0)); }
.from-rose-500 { --tw-gradient-from: #8B5CF6; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(139, 92, 246, 0)); }
.from-rose-600 { --tw-gradient-from: #7C3AED; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(124, 58, 237, 0)); }
```

And gradient tos after `.to-rose-600` is updated at line 574 — also ADD:
```css
.to-rose-50 { --tw-gradient-to: rgba(139, 92, 246, 0.08); }
.to-rose-100 { --tw-gradient-to: rgba(139, 92, 246, 0.15); }
.to-rose-400 { --tw-gradient-to: #A78BFA; }
.to-rose-500 { --tw-gradient-to: #8B5CF6; }
```

**ADD missing rose hover gradients** in the hover states section after the orange hover classes inserted in Task 1:
```css
.hover\:from-rose-600:hover { --tw-gradient-from: #7C3AED; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(124, 58, 237, 0)); }
.hover\:from-rose-700:hover { --tw-gradient-from: #6D28D9; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(109, 40, 217, 0)); }
.hover\:to-rose-600:hover { --tw-gradient-to: #7C3AED; }
```

**ADD missing light gray text classes** in the Colors section after `.text-gray-400` (line 261):
```css
.text-gray-100 { color: var(--color-gray-900); }
.text-gray-200 { color: var(--color-gray-800); }
.text-gray-300 { color: var(--color-gray-700); }
```
(These map light gray class names to the remapped dark-theme --color-gray-* vars, which in Indigo Noir hold light text values: gray-900 = #F1F5F9, gray-800 = #E2E8F0, gray-700 = #CBD5E1.)
  </action>
  <verify>
```bash
# Confirm rose-600 gradient points to violet
grep "to-rose-600" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css

# Confirm no old rose red value remains
grep "#E11D48" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css

# Confirm gray-100/200/300 text classes now exist
grep "text-gray-100\|text-gray-200\|text-gray-300" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css

# Confirm rose bg classes exist
grep "bg-rose-50\|bg-rose-100" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Expected: to-rose-600 → #7C3AED, #E11D48 returns nothing, text-gray-100/200/300 each appear once, bg-rose-50 and bg-rose-100 appear.
  </verify>
  <done>All rose-* classes emit violet values. text-gray-100/200/300 are defined and map to the correct Indigo Noir light text values (#F1F5F9, #E2E8F0, #CBD5E1 via CSS vars).</done>
</task>

</tasks>

<verification>
After both tasks:

1. Zero orange/rose color values remain in orange-* or rose-* class rules:
```bash
grep -n "rgba(245, 158\|#F59E0B\|#EA580C\|#C2410C\|#FB923C\|#F97316\|#E11D48" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Expected: 0 matches inside utility class bodies (amber/yellow classes may still use these — that is correct).

2. Indigo values present across the file:
```bash
grep -c "99, 102, 241\|#6366F1\|#4F46E5\|#818CF8\|#4338CA" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Expected: 15+ matches.

3. Violet values present for rose substitutions:
```bash
grep -c "139, 92, 246\|#8B5CF6\|#7C3AED\|#6D28D9" /Users/jeet/Documents/production-crm-backup/frontend/src/index.css
```
Expected: 10+ matches.

4. Dev server still compiles (no syntax errors):
```bash
cd /Users/jeet/Documents/production-crm-backup/frontend && npm run build 2>&1 | tail -5
```
Expected: no CSS parse errors.
</verification>

<success_criteria>
- Every `bg-orange-*`, `text-orange-*`, `border-orange-*`, `from-orange-*`, `to-orange-*`, `shadow-orange-*` class emits an indigo value
- Every `bg-rose-*`, `text-rose-*`, `border-rose-*`, `from-rose-*`, `to-rose-*` class emits a violet value
- `border-black` emits `rgba(99, 102, 241, 0.3)` — a subtle indigo border
- `text-gray-100`, `text-gray-200`, `text-gray-300` are defined and render light text on dark backgrounds
- No TSX files were modified — pure CSS fix
- Vite build completes without errors
</success_criteria>

<output>
After completion, create `/Users/jeet/Documents/production-crm-backup/.planning/quick/1-fix-indigo-noir-dark-theme-remap-orange-/1-SUMMARY.md` with what was changed, exact line ranges modified, and before/after values for key classes.
</output>
