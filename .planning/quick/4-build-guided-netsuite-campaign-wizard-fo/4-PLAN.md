---
phase: quick-04
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/NetSuiteCampaignWizard.tsx
  - frontend/src/pages/JobLeads/JobLeadsPage.tsx
  - frontend/src/services/api.ts
autonomous: true
requirements:
  - WIZARD-01
  - WIZARD-02
  - WIZARD-03
must_haves:
  truths:
    - "Job Leads page has a prominent 'Start NetSuite Campaign' button"
    - "Clicking it opens a 4-step wizard modal"
    - "Step 1 shows NetSuite-filtered leads with checkboxes, plain-English labels"
    - "Step 2 has a pre-filled NetSuite outreach subject + body and 'Let AI write it for me' button"
    - "Step 3 shows a live preview with blocking warnings for empty subject, short body, no contacts"
    - "Step 4 shows green confirmation with count of emails sent and 'Go see your contacts' button"
    - "Send creates email-composer drafts and sends them for each selected contact email"
  artifacts:
    - path: "frontend/src/components/NetSuiteCampaignWizard.tsx"
      provides: "4-step guided wizard modal component"
      exports: ["NetSuiteCampaignWizard"]
    - path: "frontend/src/pages/JobLeads/JobLeadsPage.tsx"
      provides: "Start NetSuite Campaign button wired to wizard"
      contains: "NetSuiteCampaignWizard"
  key_links:
    - from: "JobLeadsPage.tsx"
      to: "NetSuiteCampaignWizard.tsx"
      via: "showWizard state + prop passing selectedIds + leads"
    - from: "NetSuiteCampaignWizard.tsx"
      to: "/api/email-composer"
      via: "emailComposerApi.create + emailComposerApi.send per selected email"
---

<objective>
Build a 4-step guided NetSuite campaign wizard for non-technical users. Rajesh picks contacts from his
Job Leads, writes (or AI-generates) an email with a pre-filled template, reviews with live validation,
then sends. A "Start NetSuite Campaign" button on the Job Leads page launches the wizard.

Purpose: Eliminate the complexity of the existing campaign flow for a zero-tech user.
Output: NetSuiteCampaignWizard.tsx component + button wired into JobLeadsPage.tsx.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/Documents/production-crm-backup/.planning/STATE.md

Relevant source files (read before implementing):
@/Users/jeet/Documents/production-crm-backup/frontend/src/pages/JobLeads/JobLeadsPage.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/services/api.ts
@/Users/jeet/Documents/production-crm-backup/frontend/src/pages/Campaigns/CampaignsPage.tsx
@/Users/jeet/Documents/production-crm-backup/frontend/src/components/CreateCampaignModal.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build NetSuiteCampaignWizard component (4-step modal)</name>
  <files>frontend/src/components/NetSuiteCampaignWizard.tsx</files>
  <action>
Create a new React component `NetSuiteCampaignWizard` as a full-screen centered modal overlay.

Props:
```ts
interface Props {
  isOpen: boolean;
  onClose: () => void;
  leads: JobLead[];           // all current leads from JobLeadsPage
  preSelectedIds?: Set<number>; // IDs already ticked on the leads page
}
```

The wizard tracks `step: 1 | 2 | 3 | 4` and walks the user through:

---

STEP 1 — "Pick the companies you want to email"
- Filter `leads` to NetSuite stream only (stream === 'NetSuite')
- Render a scrollable list. Each row: checkbox + company logo (img with fallback to BuildingOfficeIcon) + company name + "hr@companydomain.com" email badge
- "Select All NetSuite companies" checkbox at top
- Pre-tick rows whose IDs are in `preSelectedIds`
- Plain-English label at top: "These are companies looking for NetSuite help. Tick the ones you'd like to email."
- Count badge: "X companies selected"
- Disable "Next: Write your email →" button when 0 selected

---

STEP 2 — "Write your email"
- State: `subject` (string), `body` (string)
- Pre-fill on mount:
  - subject: `"NetSuite Consulting Services — Let's Talk"`
  - body: pre-filled multi-line template (plain text, not HTML):

```
Hi there,

I came across your job posting and wanted to reach out. My team specialises in NetSuite implementations, customisations, and support.

We've helped companies like yours reduce go-live time by 40% and cut support costs significantly.

Would you be open to a quick 15-minute call to see if we're a fit?

Best regards,
Rajesh
BrandMonkz
```

- Labels use plain English: "📝 The title of your email" (for subject), "✍️ What you want to say" (for body)
- "Let AI write it for me ✨" button — calls `POST /api/campaigns/ai/generate-content` with payload `{ goal: 'NetSuite outreach', tone: 'professional', companyName: 'NetSuite companies' }`. On success replace body with `data.content`. Show spinner while loading. If API fails, show small red error beneath button (don't block flow).
- Character count beneath body textarea (e.g. "142 characters")

---

STEP 3 — "Review before sending"
- Email preview card styled like a real email: From name, subject line, body text
- Live validation warnings (shown as yellow alert boxes, NOT blocking — user can still go back):
  - subject is empty → "Your email has no subject — add one in Step 2"
  - body has fewer than 50 characters → "Your message is very short — consider adding more detail"
  - 0 contacts selected → "You haven't picked any companies — go back to Step 1"
- Show count: "Ready to send to X companies"
- "Send X emails now →" button (disabled if subject empty OR body < 10 chars OR 0 companies)

---

STEP 4 — "Sent!"
- Show on successful send
- Big green checkmark icon (CheckCircleIcon from heroicons/24/outline)
- Headline: "Your emails are on their way! ✅"
- Sub-text: "Sent to X companies. You'll see them in your Contacts and Campaign history."
- "Go see your contacts →" button → calls `onClose()` then navigates to `/contacts` using `useNavigate()`
- "Send another campaign" button → resets wizard back to step 1

---

SEND LOGIC (triggered by "Send" button in Step 3):
For each selected lead, extract `lead.companyEmail` (the `hr@domain.com` string). Skip leads with empty email.

For each valid email, call in sequence:
1. `emailComposerApi.create({ subject, htmlBody: body, toEmails: [email] })`
2. `emailComposerApi.send(emailId)` — where `emailId` comes from the create response (`data.email.id`)

Track `sentCount`. On completion (all settled), move to step 4 showing `sentCount`.

If any individual send fails, log to console but don't block — count only successful sends.

---

STYLING:
- Follow existing CSS variable patterns: `var(--bg-base)`, `var(--bg-elevated)`, `var(--border-default)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--accent-indigo)`
- Modal overlay: fixed inset-0, background `rgba(0,0,0,0.6)`, z-index 1000
- Modal box: white/dark card, max-width 680px, max-height 90vh, overflow-y auto, border-radius 16px, padding 32px
- Step indicator: 4 dots at top, active = indigo filled, inactive = gray outline, connected by line
- Step labels beneath dots: "1. Audience", "2. Email", "3. Review", "4. Done"
- Primary button style: matches existing Job Leads page hero CTA (indigo gradient, 14px 28px padding, border-radius 10px)
- Back/Next buttons at bottom of each step
- Close X button top-right corner

Import `emailComposerApi` from `../../services/api`. Import `useNavigate` from `react-router-dom`.
Import heroicons: `BuildingOfficeIcon`, `CheckCircleIcon`, `SparklesIcon`, `XMarkIcon` from `@heroicons/react/24/outline`.
  </action>
  <verify>
Check file exists: `ls frontend/src/components/NetSuiteCampaignWizard.tsx`
Check imports compile: `cd frontend && npx tsc --noEmit 2>&1 | grep NetSuiteCampaignWizard`
  </verify>
  <done>
NetSuiteCampaignWizard.tsx exists with all 4 steps, pre-filled template, AI button, live validation, and send logic using emailComposerApi.create + emailComposerApi.send. TypeScript compiles with no errors in the new file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire wizard into JobLeadsPage + add emailComposerApi.send to api.ts</name>
  <files>
    frontend/src/pages/JobLeads/JobLeadsPage.tsx
    frontend/src/services/api.ts
  </files>
  <action>
**api.ts addition:**
Add `send` method to the existing `emailComposerApi` object (it only has `create`, `getAll`, `getById` currently — verify with grep first).
```ts
send: async (id: string) => {
  const response = await apiClient.post(`/email-composer/${id}/send`);
  return response.data;
},
```
Place it inside the `emailComposerApi` object after the existing methods. Do NOT remove existing methods.

**JobLeadsPage.tsx changes:**

1. Add import at top:
```tsx
import { NetSuiteCampaignWizard } from '../../components/NetSuiteCampaignWizard';
```

2. Add state:
```tsx
const [showWizard, setShowWizard] = useState(false);
```

3. In the header section (next to the existing "🚀 Get Fresh Leads" button), add a second button:
```tsx
<button
  onClick={() => setShowWizard(true)}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
  }}
>
  📧 Start NetSuite Campaign
</button>
```
Place this button to the LEFT of the existing "Get Fresh Leads" button, wrapping both in a flex div with gap: 12px.

4. Add wizard at the end of the JSX return (before closing `</div>`):
```tsx
{showWizard && (
  <NetSuiteCampaignWizard
    isOpen={showWizard}
    onClose={() => setShowWizard(false)}
    leads={leads}
    preSelectedIds={selectedIds}
  />
)}
```
  </action>
  <verify>
Check grep confirms button is present:
`grep -n "Start NetSuite Campaign" frontend/src/pages/JobLeads/JobLeadsPage.tsx`

Check wizard import is present:
`grep -n "NetSuiteCampaignWizard" frontend/src/pages/JobLeads/JobLeadsPage.tsx`

Check emailComposerApi.send exists:
`grep -n "send.*email-composer\|email-composer.*send" frontend/src/services/api.ts`

TypeScript check:
`cd frontend && npx tsc --noEmit 2>&1 | head -20`
  </verify>
  <done>
"Start NetSuite Campaign" button appears on Job Leads page header. Clicking it opens the wizard modal. emailComposerApi.send method exists in api.ts. TypeScript compiles clean.
  </done>
</task>

</tasks>

<verification>
1. `grep -n "Start NetSuite Campaign" frontend/src/pages/JobLeads/JobLeadsPage.tsx` — button present
2. `grep -n "NetSuiteCampaignWizard" frontend/src/pages/JobLeads/JobLeadsPage.tsx` — wired in
3. `ls frontend/src/components/NetSuiteCampaignWizard.tsx` — component file exists
4. `grep -n "emailComposerApi.send\|send.*email-composer" frontend/src/services/api.ts` — send method added
5. `cd frontend && npx tsc --noEmit 2>&1 | head -20` — no TypeScript errors
6. Manual check: open Job Leads page → click "Start NetSuite Campaign" → wizard opens → step through all 4 steps
</verification>

<success_criteria>
- "Start NetSuite Campaign" button visible on Job Leads page header
- Wizard opens as modal with 4 clearly labeled steps
- Step 1 shows only NetSuite leads with checkboxes and plain-English labels
- Step 2 has pre-filled NetSuite outreach subject + body; AI button calls backend
- Step 3 shows preview + live warnings for empty subject / short body / no contacts
- Step 4 shows green confirmation with sent count and navigation to contacts
- No TypeScript compile errors
</success_criteria>

<output>
After completion, create `.planning/quick/4-build-guided-netsuite-campaign-wizard-fo/4-SUMMARY.md` with:
- Files created/modified
- Component props interface
- Step-by-step flow summary
- Any deviations from this plan
</output>
