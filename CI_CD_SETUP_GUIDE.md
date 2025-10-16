# CI/CD Pipeline Setup Guide for BrandMonkz CRM

This guide explains how to set up automated deployments for your production CRM system.

---

## 🎯 Overview

You now have **TWO deployment methods**:

1. **Manual Deployment** - Run a script from your local machine
2. **Automated CI/CD** - Push to GitHub and it automatically deploys

---

## ⚡ Method 1: Manual Deployment (Immediate Use)

### Quick Start

```bash
cd /Users/jeet/Documents/production-crm

# Deploy everything (backend + frontend)
./deploy.sh all

# Deploy only backend
./deploy.sh backend

# Deploy only frontend
./deploy.sh frontend
```

### What It Does

1. ✅ Builds backend TypeScript locally (with 4GB RAM)
2. ✅ Builds frontend React app
3. ✅ Creates deployment packages
4. ✅ Uploads to EC2
5. ✅ Deploys and restarts services
6. ✅ Runs health checks
7. ✅ Creates automatic backups

### Example Workflow

```bash
# 1. Make your changes to the code
vim backend/src/routes/companies.ts

# 2. Commit to git
git add .
git commit -m "fix: Update company logic"
git push origin main

# 3. Deploy to production
./deploy.sh all

# Output:
# 🚀 BrandMonkz CRM - Production Deployment
# ==========================================
# 📦 Building Backend...
# Installing dependencies...
# Building TypeScript...
# ✅ Backend built successfully
# 📤 Uploading to EC2...
# 🔧 Deploying on EC2...
# ✅ Backend deployed successfully
# ... (frontend deployment)
# 🎉 Deployment complete!
```

---

## 🤖 Method 2: GitHub Actions CI/CD (Automated)

### Prerequisites

You need to add these secrets to your GitHub repository:

1. Go to: https://github.com/jeet-avatar/production-crm/settings/secrets/actions
2. Click "New repository secret"
3. Add these 3 secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `EC2_HOST` | `100.24.213.224` | Your Elastic IP |
| `EC2_USER` | `ec2-user` | SSH username |
| `EC2_SSH_KEY` | (content of `~/.ssh/brandmonkz-crm.pem`) | Your SSH private key |

### How to Get SSH Key Content

```bash
cat ~/.ssh/brandmonkz-crm.pem
```

Copy the entire output (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

### Setup Steps

1. **Commit the CI/CD workflow**:
```bash
cd /Users/jeet/Documents/production-crm
git add .github/workflows/deploy-production.yml
git commit -m "ci: Add GitHub Actions deployment workflow"
git push origin main
```

2. **Add GitHub Secrets** (as described above)

3. **Test the workflow**:
   - Go to: https://github.com/jeet-avatar/production-crm/actions
   - Click "Deploy to Production"
   - Click "Run workflow"
   - Select branch: `main`
   - Click "Run workflow"

### Automated Deployment Flow

Once set up, every time you push to `main`:

```bash
git add .
git commit -m "feat: Add new feature"
git push origin main
```

**GitHub Actions will automatically**:
1. ✅ Checkout your code
2. ✅ Build backend on GitHub servers
3. ✅ Build frontend with production config
4. ✅ Create deployment package
5. ✅ SSH into your EC2
6. ✅ Deploy backend and frontend
7. ✅ Restart PM2
8. ✅ Run health checks
9. ✅ Notify you of success/failure

---

## 📊 Comparison

| Feature | Manual Deployment | GitHub Actions CI/CD |
|---------|------------------|---------------------|
| **Speed** | 2-3 minutes | 3-5 minutes |
| **Requires Local Build** | Yes | No |
| **Automatic on Push** | No | Yes |
| **Build Location** | Your Mac | GitHub Servers |
| **Setup Complexity** | ✅ Simple (ready now) | ⚠️ Medium (need secrets) |
| **Internet Required** | Yes | Yes |
| **Rollback** | Manual | Manual |
| **Build Logs** | Terminal | GitHub UI |

---

## 🔄 Typical Development Workflow

### Scenario 1: Quick Fix

```bash
# 1. Make changes
vim backend/src/routes/companies.ts

# 2. Test locally (optional)
cd backend && npm run build

# 3. Commit
git add .
git commit -m "fix: Correct contact count logic"
git push origin main

# 4. Deploy
./deploy.sh backend  # Only deploy backend

# Done! Takes ~2 minutes
```

### Scenario 2: New Feature (Backend + Frontend)

```bash
# 1. Make changes to both
vim backend/src/routes/companies.ts
vim frontend/src/pages/Companies/CompanyList.tsx

# 2. Commit
git add .
git commit -m "feat: Add company filters"
git push origin main

# 3. Deploy
./deploy.sh all  # Deploy both

# Done! Takes ~3 minutes
```

### Scenario 3: Using GitHub Actions (Hands-Free)

```bash
# 1. Make changes
vim backend/src/routes/companies.ts

# 2. Commit and push
git add .
git commit -m "feat: Add new endpoint"
git push origin main

# 3. That's it! GitHub Actions will:
#    - Build everything
#    - Deploy to EC2
#    - Notify you when done

# Check progress at:
# https://github.com/jeet-avatar/production-crm/actions
```

---

## 🛡️ Safety Features

### Automatic Backups

Both deployment methods create automatic backups:

**Backend**:
```bash
/var/www/crm-backend/backend/dist.backup.20251013_123456/
```

**Frontend**:
```bash
/var/www/backups/brandmonkz.backup.20251013_123456.tar.gz
```

### Rollback (if needed)

```bash
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

# List backups
ls -lh /var/www/crm-backend/backend/dist.backup.*

# Rollback backend
cd /var/www/crm-backend/backend
rm -rf dist
cp -r dist.backup.20251013_123456 dist
pm2 restart crm-backend

# Rollback frontend
cd /var/www/brandmonkz
sudo rm -rf *
sudo tar -xzf /var/www/backups/brandmonkz.backup.20251013_123456.tar.gz
```

---

## 🧪 Testing Before Production

### Local Testing

```bash
# Backend
cd backend
npm install
npm run build
npm start  # Runs on http://localhost:3000

# Frontend
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev  # Runs on http://localhost:5173
```

### Staging Environment (Recommended)

Use `sandbox.brandmonkz.com` as a staging environment:

1. Deploy to sandbox first
2. Test thoroughly
3. Then deploy to production

---

## 📝 Deployment Checklist

Before deploying to production:

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (if you have tests)
- [ ] Changes committed to git
- [ ] Database migrations applied (if any)
- [ ] Environment variables updated (if needed)
- [ ] Breaking changes documented
- [ ] Backup of current version exists

---

## 🔍 Monitoring Deployments

### Check Deployment Status

```bash
# Backend health
curl https://brandmonkz.com/health

# View backend logs
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend --lines 50"

# Check PM2 status
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 status"
```

### GitHub Actions Logs

1. Go to: https://github.com/jeet-avatar/production-crm/actions
2. Click on the latest workflow run
3. View detailed logs for each step

---

## 🚨 Troubleshooting

### Build Fails Locally

```bash
# Clear node_modules and rebuild
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails

```bash
# Check SSH connection
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "echo 'Connected!'"

# Check disk space on EC2
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "df -h"

# Check PM2 logs for errors
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend --err --lines 100"
```

### GitHub Actions Fails

1. Check the workflow run logs in GitHub
2. Verify secrets are set correctly
3. Ensure EC2 is reachable from GitHub servers
4. Check security group allows SSH from 0.0.0.0/0

---

## 💡 Tips and Best Practices

### 1. Use Descriptive Commit Messages

```bash
# Good
git commit -m "fix: Correct contact count for inactive users"
git commit -m "feat: Add CSV export for companies"

# Bad
git commit -m "updates"
git commit -m "fix"
```

### 2. Deploy During Low Traffic

- Best time: Early morning or late night
- Avoid: Business hours

### 3. Monitor After Deployment

```bash
# Watch logs for 2 minutes after deployment
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend --lines 100 --timestamp"
```

### 4. Keep Dependencies Updated

```bash
# Check for updates monthly
npm outdated

# Update carefully
npm update
npm audit fix
```

---

## 📊 Current Infrastructure

### EC2 Instance
- **Type**: t3.medium (4GB RAM, 2 vCPU)
- **IP**: 100.24.213.224 (Elastic IP - permanent)
- **OS**: Amazon Linux 2
- **Cost**: ~$30/month

### Services
- **Backend**: Node.js + Express (PM2)
- **Frontend**: React + Vite (nginx)
- **Database**: PostgreSQL RDS
- **Domain**: brandmonkz.com (GoDaddy)

---

## 🎯 Next Steps

### Immediate (Ready Now)
1. ✅ Use `./deploy.sh` for manual deployments
2. ✅ Test a small change end-to-end
3. ✅ Verify website works after deployment

### Short Term (Optional)
1. Add GitHub secrets for automated CI/CD
2. Set up staging environment
3. Add automated tests

### Long Term (Recommended)
1. Implement database migrations tracking
2. Add monitoring with CloudWatch
3. Set up automated backups
4. Add error tracking (Sentry)

---

## 📞 Support

### Quick Commands Reference

```bash
# Deploy everything
./deploy.sh all

# Deploy backend only
./deploy.sh backend

# Deploy frontend only
./deploy.sh frontend

# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

# Check backend health
curl https://brandmonkz.com/health

# View PM2 logs
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs"

# Restart backend
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 restart crm-backend"
```

---

## ✅ Summary

You now have a complete CI/CD pipeline with:

1. ✅ **Manual deployment script** - Ready to use immediately
2. ✅ **GitHub Actions workflow** - Set up when you add secrets
3. ✅ **Automatic backups** - Every deployment creates backup
4. ✅ **Health checks** - Verifies deployment success
5. ✅ **Rollback capability** - Can revert if needed

**Recommended**: Start with manual deployments (`./deploy.sh`), then add GitHub Actions once comfortable.

**Your workflow**: Make changes → Commit → Push → Run `./deploy.sh all` → Done!
