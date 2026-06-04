# NEXT SESSION — START HERE

**Last session ended:** 2026-06-03 evening — **Phase 12.5 LOCKED** in production. JM + Rajesh both worked across the day. 12 phases shipped (04, 05, 07, 08, 09, 10 by JM; 11, 12, 12.5 by Rajesh).

## Live state (verify first when resuming)

```bash
# Verify still on Phase 12.5 stable
curl -sS -H "User-Agent: Mozilla/5.0" "https://brandmonkz.com/" | grep -oE "index-[A-Za-z0-9_-]+\.js"
# expect: index-CcyG4U79.js (or newer if Rajesh shipped overnight)

# pm2 status
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 'pm2 list | grep -E "crm-backend|video-generator"'
# expect: both online; video-generator should be 8D+ continuous

# Latest commit
cd /Users/jeet/Documents/production-crm-backup && git fetch && git log origin/seconf -1 --oneline
# expect: 876d0ae fix: stable sort waits for ALL batches before freezing page order
# stable tag: stable-phase12-5-locked-2026-06-03
```

## 🔴 Highest priority

**Fix 2 broken CTA URLs** in the NetSuite campaign email body (Phase 11):
- `https://techcloudpro.com/aria` → 404
- `https://techcloudpro.com/book` → 404

These are in every NetSuite campaign Rajesh sends. Fix via Hostinger WordPress (see TCP infra email).

## Other priority items

1. Validate Wed 14:00 UTC retargeting report fire
2. Validate Thu 02:30 UTC daily report fire
3. Rotate Twilio + Ahrefs + Anthropic keys (transcript-exposed)
4. Pick visitor-ID tool (Leadfeeder / RB2B / Albacross)
5. Phase 11 follow-up — TCP v6 template into DB
6. Phase 06 GSC integration — paused

## Full handoff

`~/.claude/handoffs/2026-06-03-brandmonkz-phase12-5-locked-production-state.md`

Has:
- Combined 12-phase ledger (04 → 12.5)
- All 21 of Rajesh's commits explained
- Phase 11 OLD_NETSUITE_CAMPAIGN_HTML body details + the 2 broken URLs
- Phase 12 schedule timing change (was 5/10/Now → now 1/3/5/Now)
- Phase 12.5 CampaignWizard.tsx 338-line pagination overhaul
- Rollback snapshot map (use `/tmp/post-phase12-5-stable-2026-06-03.tar.gz` as the current restore target)
- 5 emails sent to Rajesh 2026-06-03 morning (still valid for his Claude bootstrap)
