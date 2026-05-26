# TCP v6 Retargeting — Documentation Index

**For:** Rajesh (rajesh@techcloudpro.com)
**Last updated:** 2026-05-26

---

## Read in this order

| # | File | What it is | When to read |
|---|---|---|---|
| 1 | [`../../scripts/video-pipeline/RAJESH-LAPTOP-SETUP.md`](../../scripts/video-pipeline/RAJESH-LAPTOP-SETUP.md) | Set up your laptop step-by-step | First time, before anything else |
| 2 | [`RAJESH-HANDBOOK.md`](./RAJESH-HANDBOOK.md) | Operator playbook (12 sections, daily/weekly flows) | After setup verifier exits green |
| 3 | [`CREDENTIALS-FOR-RAJESH.md`](./CREDENTIALS-FOR-RAJESH.md) | What secrets exist + how JM shares them | Reference — read while doing setup |
| 4 | [`README.md`](./README.md) | High-level overview of the TCP v6 system | Skim for context |
| 5 | [`GO-LIVE-PROOF.md`](./GO-LIVE-PROOF.md) | Evidence the pipeline works end-to-end | Baseline to compare against if something looks off |
| 6 | [`WAVE-3-4-RESULTS.md`](./WAVE-3-4-RESULTS.md) | What the May 26 cleanup session actually fixed | Useful context, not required reading |
| 7 | [`EMAIL-TO-RAJESH.md`](./EMAIL-TO-RAJESH.md) | The email JM (may have) sent you summarizing this work | Just for cross-reference |

---

## If you only have 10 minutes

Read **1** (laptop setup) and **2** (operator handbook). Skim **3** (credentials checklist). The rest is reference.

---

## What's NOT in this public repo

A few internal-only docs (strategic decisions, phase plans, incident analyses) stay in the private `crm-email-marketing-platform` repo. If you need them, ask JM — he'll share via 1Password or paste.

The migration plan is at [`../CONSOLIDATION-PLAN.md`](../CONSOLIDATION-PLAN.md) if you want to see where the codebase is heading.

---

## Quick reference

| Need | Where |
|---|---|
| Set up my Mac | `scripts/video-pipeline/RAJESH-LAPTOP-SETUP.md` |
| Verify my setup works | `cd scripts/video-pipeline && ./setup-rajesh.sh` |
| Send a v6 email today | `https://brandmonkz.com/reports` → Follow-Ups tab → 🟢 Ready to Send |
| Add prospect #85 | `scripts/video-pipeline/` — run the 3-step pipeline (handbook Section 4) |
| Something looks wrong | `RAJESH-HANDBOOK.md` Section 10 (troubleshooting) |
