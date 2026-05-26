# CRM Repo Consolidation Plan

**Status:** Draft, 2026-05-26
**Owner:** JM
**Goal:** One source of truth — `production-crm` — for code, docs, and deploys. Archive `crm-email-marketing-platform`.

---

## 1. Why this plan exists

Today we have **two repos for one product**:

| Repo | Visibility | Holds | Builds cleanly? |
|---|---|---|---|
| `jeet-avatar/production-crm` | PUBLIC | Backend + frontend code, pipeline scripts (`scripts/video-pipeline/`) | ❌ No — 170 TS errors, schema drift |
| `jeet-avatar/crm-email-marketing-platform` | PRIVATE | TCP retargeting docs, snapshots of EC2 hot-patched files | N/A (docs-heavy) |

And **EC2 (`/var/www/crm-backend/dist/`) doesn't fully match either repo** — files like `routes/followUps.js` and `data/tcp-v6-prospects.json` are hand-patched live. This is the pattern that caused the May 18 outage where 71 dist files were lost.

The mess has three roots:
1. Original repo (`crm-email-marketing-platform`) accumulated TS + Prisma drift → unbuildable
2. Wave 2 (May 17-18) declared `production-crm` canonical but didn't migrate docs
3. Until `production-crm` builds cleanly, hot-patching EC2 dist/ is the only deploy mechanism

## 2. Target state

```
github.com/jeet-avatar/production-crm  (PUBLIC, default: production)
├── backend/              ← code (builds cleanly, npm run build → dist/)
├── frontend/             ← React admin
├── scripts/
│   └── video-pipeline/   ← TCP v6 renderer + setup-rajesh.sh
├── docs/
│   └── tcp-retargeting/  ← operator handbook, credentials checklist, go-live proof
└── .github/workflows/    ← CI deploys production branch → EC2 dist/

github.com/jeet-avatar/crm-email-marketing-platform  ← ARCHIVED (read-only)
```

EC2's `/var/www/crm-backend/dist/` is regenerated from `production-crm` CI. No more hand-patching.

## 3. Phased path (5 phases)

### Phase 1 — Migrate Rajesh-relevant docs to public repo *(THIS COMMIT)*

Move docs Rajesh needs to operate the pipeline from the private repo to `production-crm/docs/tcp-retargeting/`. Redact partial-secret strings.

**Scope:**
- ✅ Migrate: `RAJESH-HANDBOOK.md`, `CREDENTIALS-FOR-RAJESH.md`, `GO-LIVE-PROOF.md`, `README.md`, `WAVE-3-4-RESULTS.md`, `EMAIL-TO-RAJESH.md`
- ❌ Keep private: `DECISIONS.md`, `DISCOVERY.md`, `PHASE-PLAN.md`, `WAVE-0-BASELINE.md` (has AWS Access Key ID), `WAVE-3-RUNBOOK.md`, `RAJESH-OUTAGE-NOTICE.md`
- ❌ Skip entirely: `data/tcp-v6-prospects.json` (84 prospect emails — PII), `routes/followUps.js` (it's a snapshot of EC2's hot-patched file; tracking in this repo is misleading)

**Redactions applied:**
- `sk-ant-api03-VG4U2...IQAA` → `sk-ant-api03-***...***` (partial Anthropic key)
- No other secret material in the migrated set (verified via regex scan)

**Outcome:** Rajesh has all docs he needs at a public URL. No GitHub access required.

### Phase 2 — Capture EC2 hot-patches into `production-crm` source

Today these files exist on EC2 but not (or stalely) in `production-crm`:
- `/var/www/crm-backend/dist/routes/followUps.js` (Sara rotation lives here; hot-patched May 26)
- `/var/www/crm-backend/dist/data/tcp-v6-prospects.json` (chattr +i locked)
- `/opt/tcp-retargeting-report/tcp-retargeting-report.js` (cron-scheduled, NOT in git)
- `/opt/tcp-daily-report/*.js` (cron-scheduled, NOT in git)

**Actions:**
1. `scp` each file from EC2 to `production-crm/src/routes/`, `production-crm/data/`, `production-crm/scripts/cron/`
2. Diff against the closest matching file in the repo; commit the canonical version
3. Update CI deploy script to push these files to their EC2 paths

**Outcome:** Every file running on EC2 has a git ancestor. No surprises if dist/ gets wiped again.

### Phase 3 — Fix the `production-crm` build

This is the heavy lift. Wave 1 finding: 170 TypeScript errors + 10+ missing Prisma models + schema drift between code and DB.

**Actions:**
1. Pin Node + TypeScript versions in `package.json` engines block
2. Regenerate Prisma schema from production DB (`prisma db pull`)
3. Diff regenerated schema against committed `schema.prisma` — commit the drift
4. Run `npx tsc --noEmit` — fix 170 errors in batches (50-line cap per commit for reviewability)
5. Run integration smoke tests against staging DB clone
6. Confirm `npm run build` exits 0

**Outcome:** Source tree compiles. CI can build from any commit.

### Phase 4 — Stand up CI deploy from `production-crm` → EC2

Today's deploy mechanism is `ssh + scp + chattr -i/+i + pm2 restart`. Brittle.

**Actions:**
1. GitHub Actions workflow on push to `production` branch:
   - Build (`npm run build`)
   - Test (`npm test`)
   - Build Docker image
   - Push to ECR
   - Update EC2 task / restart pm2
2. Migrate secrets from EC2 `.env` → AWS Secrets Manager (the BrandMonkz secret namespace already exists)
3. Add staging branch + staging EC2 (separate instance, smaller). Promotion: staging → production via PR.
4. Whitelist GitHub Actions IP ranges in the EC2 security group (Wave 3 found this was broken)

**Outcome:** `git push origin production` → live in 5 minutes. No SSH dance. No chattr.

### Phase 5 — Archive `crm-email-marketing-platform`

Once everything that matters has been migrated and CI is green for two weeks:

**Actions:**
1. Migrate any remaining private docs (`DECISIONS.md`, `PHASE-PLAN.md`, `WAVE-N-*.md`) to `production-crm/docs/internal/` (will require flipping `production-crm` to PRIVATE for those, OR moving them to a separate private internal-docs repo, OR redacting + publishing)
2. Add a `README.md` to `crm-email-marketing-platform` saying "Archived — see production-crm"
3. Use GitHub's "Archive repository" feature → repo becomes read-only
4. Update all bookmarks, READMEs, and CLAUDE.md references

**Outcome:** One repo. One source of truth. One deploy path.

## 4. Concurrent action items (do alongside the phases)

### Security: rotate `AKIAR6V2AFOTYCGLFYRF`

This AWS Access Key ID for IAM user `CRMaccesskey` appears in plain text in `WAVE-0-BASELINE.md` (private repo today, but a leak waiting to happen). The Access Key ID is the "username" half of the AWS credential pair — the secret is what protects it — but rotation hygiene says: don't have either half in any doc.

**Steps:**
1. Generate a new access key for `CRMaccesskey` in AWS Console
2. Update EC2 `.env` + JM's local `.env` + your 1Password vault
3. Verify pm2 still works (`pm2 logs crm-backend`)
4. Delete the old access key in IAM
5. Redact the value from `WAVE-0-BASELINE.md`

### Documentation: write a `DEPLOY.md` once Phase 4 lands

Single source of truth for "how do I deploy?" Right now the answer is split across CLAUDE.md, the Wave-3-Runbook, and tribal knowledge.

## 5. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase 3 build-fix work is large and disruptive | High | Time-box to 2-3 days. If schema drift is too deep, freeze schema and commit current Prisma as-is. |
| Hot-patching EC2 continues during Phase 2-3 transition | High | Tag every hot-patch with the dist file path + the equivalent source file path in the commit message. Reconciliation is then a `git diff` away. |
| Rajesh tries to clone the private repo and gets blocked | Already happened | Phase 1 (this commit) fixes it. |
| Repo split confuses future contributors | Medium | This plan + a `README.md` in each repo's root explaining the split until Phase 5 completes. |
| `production-crm` gets pushed by mistake to `main` instead of `production` | Low | Set `production` as default branch (already done) and add branch protection on `main`. |

## 6. Open questions

- **Where do INTERNAL docs end up after archival?** (Options: `production-crm/docs/internal/` with repo flipped private, OR a third `internal-docs` private repo, OR redact-and-publish). Decision deferred to Phase 5.
- **Who owns the build repair (Phase 3)?** JM, or hired contractor? At least 2-3 days of focused work.
- **Do we want staging-instance parity?** (Phase 4 includes a small staging EC2.) Costs ~$15/mo on top of current spend.
- **What about the `seconf` branch and the `dependabot/*` branches on `crm-email-marketing-platform`?** Likely garbage — but check before archiving in Phase 5.

## 7. Done = ?

- [ ] Phase 1: Rajesh-relevant docs at `production-crm/docs/tcp-retargeting/` on public URL ← **this commit**
- [ ] Phase 2: All EC2 hot-patched files have a git ancestor in `production-crm`
- [ ] Phase 3: `npm run build` exits 0 in `production-crm`
- [ ] Phase 4: `git push origin production` deploys to EC2 in <10 min via CI
- [ ] Phase 5: `crm-email-marketing-platform` archived; no broken references in any doc / CLAUDE.md
- [ ] Security: `AKIAR6V2AFOTYCGLFYRF` rotated

When all six boxes are checked, this doc moves to `docs/archived/CONSOLIDATION-PLAN.md` with a `Status: Complete` note.

---

*Last updated 2026-05-26. Lives at `production-crm/docs/CONSOLIDATION-PLAN.md`.*
