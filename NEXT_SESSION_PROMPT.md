# BrandMonkz CRM — Next Session Prompt
_Last updated: 2026-03-26_

## Where We Left Off

All changes from this session are **live in production** at `brandmonkz.com`.

---

## What Was Built & Deployed

### 1. 3-Step Campaign Wizard (`CampaignWizard.tsx`)
- **File**: `/Users/jeet/Documents/production-crm-backup/frontend/src/components/CampaignWizard.tsx` (779 lines)
- **Replaces**: `CreateCampaignModal.tsx` (old 5-step modal)
- **Step 1**: User types campaign goal → tone pills (Professional/Friendly/Urgent) → "✨ Write my email" calls 3 AI endpoints sequentially: `generate-basics` → `generate-subject` → `generate-content` → editable subject + body + Regenerate link
- **Step 2**: Company tile grid from `/api/companies` with `_count.contacts`, multi-select
- **Step 3**: Summary cards (campaign name editable, recipient count, subject, FROM address toggle) → "🚀 Send Campaign" button
- **Status**: Deployed. Verify it wires into `CampaignsPage.tsx` — check that the "Create Campaign" button opens `CampaignWizard` not `CreateCampaignModal`

### 2. Backend `generate-basics` Fix
- **File**: `/Users/jeet/Documents/production-crm-backup/backend/src/routes/campaigns.ts`
- **Fix**: `generate-basics` handler now uses user's typed `description` in the AI prompt (was previously ignored/static)
- **Status**: Deployed to EC2

### 3. AIChat Dark Theme Fix
- **File**: `/Users/jeet/Documents/production-crm-backup/frontend/src/components/AIChat.tsx`
- **Fix**: 8 hardcoded white/orange styles replaced with dark glass (`rgba(22,22,37,0.95)`, indigo `rgba(99,102,241,0.12)`, etc.)
- **Status**: Deployed

### 4. Contact Edit — companyName Save Fix
- **File**: `/Users/jeet/Documents/production-crm-backup/backend/src/routes/contacts.ts`
- **Fix**: PUT `/api/contacts/:id` now accepts `companyName` → finds existing company (case-insensitive) OR creates new company → saves to DB
- **File**: `/Users/jeet/Documents/production-crm-backup/frontend/src/pages/Contacts/ContactForm.tsx`
- **Fix**: `useEffect` for loading existing contact now includes `companyName: ''` (was missing, causing form error)
- **Status**: Deployed. Contact email, company name, address should now be editable and persist.

### 5. Dark Theme CSS Fixes
- **File**: `/Users/jeet/Documents/production-crm-backup/frontend/src/index.css`
- Key overrides added at bottom of file:
  - `--apple-gray-*` vars remapped to dark glass colors
  - `.apple-card { background: rgba(22,22,37,0.85) !important }` — fixes white card backgrounds
  - `.bg-gray-50 { rgba(255,255,255,0.07) }`, `.bg-gray-100 { rgba(255,255,255,0.1) }`
  - `.border-gray-300 { rgba(255,255,255,0.2) }`, `.border-gray-200 { rgba(255,255,255,0.12) }`
  - `select` elements forced dark
  - `.bg-white.rounded-*` patterns forced dark glass
- **Status**: Deployed

### 6. Login Page Text Visibility
- **File**: `/Users/jeet/Documents/production-crm-backup/frontend/src/pages/Auth/LoginPage.tsx`
- **Fix**: All text uses inline `color` styles (Tailwind class rules override CSS var inheritance, so `text-gray-900` was showing near-white). Labels, inputs, buttons all have explicit inline `style={{ color: '...' }}`
- **Status**: Deployed

---

## Production Environment

| | Details |
|---|---|
| **EC2** | `100.24.213.224` |
| **SSH** | `ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224` |
| **Frontend path** | `/var/www/crm-frontend/` |
| **Backend path** | `/var/www/crm-backend/` |
| **Backend process** | PM2 `crm-backend` (id 146), port 3000 |
| **Frontend port** | Nginx, port 80/443 |
| **Site** | `https://brandmonkz.com` |

### Deploy Commands
```bash
# Frontend: build locally then push
cd /Users/jeet/Documents/production-crm-backup/frontend
npm run build
tar -czf /tmp/crm-frontend.tar.gz -C dist .
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/crm-frontend.tar.gz ec2-user@100.24.213.224:/tmp/
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "sudo rm -rf /var/www/crm-frontend/* && sudo tar -xzf /tmp/crm-frontend.tar.gz -C /var/www/crm-frontend/ && sudo chown -R nginx:nginx /var/www/crm-frontend/"

# Backend: compile then push
cd /Users/jeet/Documents/production-crm-backup/backend
npx tsc  # pre-existing TS errors are fine, tsc still outputs JS
tar -czf /tmp/crm-backend.tar.gz -C dist .
scp -i ~/.ssh/brandmonkz-crm.pem /tmp/crm-backend.tar.gz ec2-user@100.24.213.224:/tmp/
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "sudo tar -xzf /tmp/crm-backend.tar.gz -C /var/www/crm-backend/dist/ && pm2 restart crm-backend"
```

---

## Test Credentials

| User | Email | Password |
|---|---|---|
| Rajesh (primary) | `rajesh@techcloudpro.com` | `BrandMonkz2025!` |
| Alt account | `rajmanohran@gmail.com` | `BrandMonkz2025!` |

---

## Known Issues / Possible Next Tasks

1. **CampaignWizard wiring** — verify `CampaignsPage.tsx` opens `CampaignWizard` (not old modal) when "Create Campaign" is clicked. If not, import and swap.

2. **PM2 restart loop** — `crm-backend` has 90+ restarts from `EADDRINUSE` errors on rapid restarts. Backend is currently online and stable. Root cause: PM2 restarts before old process fully releases port 3000. Can fix with `pm2 stop crm-backend && sleep 2 && pm2 start crm-backend` instead of `pm2 restart`.

3. **Contact detail page** — verify all fields (email, phone, company, address, tags) are visible and editable in dark theme. The CSS overrides should fix most, but if specific fields still show white-on-white, check if they use `text-gray-900` or `text-gray-700` classes without inline `color` style.

4. **Campaign wizard Step 2** — the "Custom filter" tile is disabled (placeholder). Rajesh may want a real filter UI there later.

5. **AIChat sidebar** — if any pages still show white AI chat, check if `AIChat.tsx` is the correct component being rendered (there may be `AICampaignGenerator.tsx` used on some pages too).

---

## Key Architecture Notes

- **Dark theme system**: `index.css` remaps `--color-gray-900: #F1F5F9` (near-white). `appleDesign.css` has hardcoded `background: white` on `.apple-card` — that's why `!important` overrides in `index.css` are needed.
- **TypeScript**: Backend has ~30 pre-existing TS errors in unrelated files (`activityLogger`, `calendar-auth`, `super-admin`). These are safe to ignore — `tsc` still compiles and outputs JS.
- **bcrypt bash escaping**: When resetting passwords via psql, NEVER use shell string interpolation for bcrypt hashes (the `$2a$10$` prefix gets interpreted). Use Python `subprocess` + write SQL to a temp file + `psql -f /tmp/reset.sql`.

---

## Local Source Files
```
Frontend: /Users/jeet/Documents/production-crm-backup/frontend/src/
Backend:  /Users/jeet/Documents/production-crm-backup/backend/src/
```
