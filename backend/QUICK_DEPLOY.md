# Quick Deployment Guide

## Deploy Enrichment Bug Fix NOW

The production backend has a critical bug where company enrichment fails with Prisma validation errors. This has been **FIXED** and is ready to deploy.

### What Was Wrong?

The enrichment feature tried to query contacts with null firstName/lastName values, which Prisma rejects.

### What Was Fixed?

Added null checks to skip professionals with missing name data and build dynamic queries safely.

---

## Deploy in 3 Steps

### Step 1: Run Deployment Script

```bash
cd /Users/jeet/Documents/production-crm/backend
./deploy-enrichment-fix.sh
```

**That's it!** The script automatically:
- Copies fixed files to production (100.24.213.224)
- Builds the backend
- Restarts PM2
- Shows status and logs

### Step 2: Verify It's Working

Check PM2 status:
```bash
ssh root@100.24.213.224 'pm2 status'
```

Expected: `crm-backend` should be `online` with 0 restarts

### Step 3: Test Enrichment

Try enriching a company in the UI:
1. Go to Companies page
2. Click on any company
3. Click "Enrich with AI" button
4. Should complete successfully without errors

---

## If Something Goes Wrong

### Check Logs
```bash
ssh root@100.24.213.224 'pm2 logs crm-backend --lines 50'
```

### Restart Backend
```bash
ssh root@100.24.213.224 'pm2 restart crm-backend'
```

### Rollback to Previous Version
```bash
ssh root@100.24.213.224
cd /var/www/crm-backend/backend
git checkout HEAD~1 src/routes/enrichment.ts
npm run build
pm2 restart crm-backend
```

---

## What to Look For

### ✅ Good Signs
- PM2 status shows "online"
- No "PrismaClientValidationError" in logs
- Enrichment completes successfully
- Professional contacts are created

### ❌ Bad Signs
- PM2 shows "errored" status
- Prisma validation errors in logs
- Enrichment fails with 500 errors

---

## Need Help?

Check the detailed fix documentation:
```bash
cat /Users/jeet/Documents/production-crm/ENRICHMENT_BUG_FIX.md
```

---

**Ready to deploy?** Run the script now:

```bash
cd /Users/jeet/Documents/production-crm/backend && ./deploy-enrichment-fix.sh
```
