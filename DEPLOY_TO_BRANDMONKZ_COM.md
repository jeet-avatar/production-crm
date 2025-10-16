# DEPLOY TO BRANDMONKZ.COM - PRODUCTION LIVE

**Date**: October 13, 2025, 12:45 AM
**Goal**: Deploy complete CRM to https://brandmonkz.com
**Status**: Frontend ✅ READY | Backend ⏸️ NEEDS EC2

---

## ✅ WHAT'S DONE

### Frontend Deployed to S3:
- **Bucket**: `brandmonkz-crm-frontend`
- **URL**: http://brandmonkz-crm-frontend.s3-website-us-east-1.amazonaws.com
- **Bundle**: `index-CPXh6bQY.js` (LATEST - all features)
- **Size**: 1.2 MB (245 KB gzipped)
- **Deployed**: 12:45 AM October 13, 2025

### What's In This Build:
- ✅ Company Intelligence UI
- ✅ AI Enrichment
- ✅ CSV Import
- ✅ Activities Management (Email/Call/Meeting/Task)
- ✅ Contact List with pagination
- ✅ Dashboard
- ✅ All security features

---

## 🎯 NEXT STEP: Update brandmonkz.com

**Current Issue**:
- brandmonkz.com shows **OLD bundle** (`index-CII6W8dd.js`)
- It's served by **nginx on EC2**, not directly from S3
- Needs nginx web root update

---

## 📋 DEPLOYMENT STEPS

### Option A: Via AWS Console (Recommended - 5 min)

**1. Connect to EC2**:
```
https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:
```
- Find instance with IP: `18.212.225.252`
- Click "Connect" → "EC2 Instance Connect"
- Click "Connect"

**2. Find Nginx Web Root**:
```bash
# Check nginx config
sudo grep -r "root" /etc/nginx/sites-enabled/ | grep -v '#'

# Common locations:
# - /var/www/brandmonkz
# - /var/www/html
# - /usr/share/nginx/html
```

**3. Backup Current Frontend**:
```bash
# Replace /var/www/brandmonkz with actual path from step 2
sudo tar -czf /tmp/frontend-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /var/www/brandmonkz .
```

**4. Download Latest from S3**:
```bash
# Install AWS CLI if needed
which aws || sudo apt-get install -y awscli

# Download latest build
cd /tmp
aws s3 sync s3://brandmonkz-crm-frontend/ /tmp/crm-frontend-latest/

# Verify download
ls -la /tmp/crm-frontend-latest/
# Should see: index.html, assets/, vite.svg, legal/
```

**5. Deploy to Nginx**:
```bash
# Replace /var/www/brandmonkz with actual nginx root
sudo rm -rf /var/www/brandmonkz/*
sudo cp -r /tmp/crm-frontend-latest/* /var/www/brandmonkz/
sudo chown -R www-data:www-data /var/www/brandmonkz
sudo chmod -R 755 /var/www/brandmonkz
```

**6. Restart Nginx**:
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

**7. Verify Deployment**:
```bash
# Check what bundle nginx is now serving
curl -s http://localhost | grep -o 'index-[^.]*\.js'
# Should show: index-CPXh6bQY.js

# Check from outside
curl -s https://brandmonkz.com | grep -o 'index-[^.]*\.js'
# Should show: index-CPXh6bQY.js
```

**8. Test in Browser**:
```bash
# Clear cache and reload
# Open: https://brandmonkz.com
# Press: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

### Option B: Update Backend on EC2 (Do this AFTER frontend)

**1. Connect to EC2** (same as above)

**2. Update Backend Code**:
```bash
cd /home/ubuntu/brandmonkz-crm-backend

# Backup current code
git stash save "backup-before-$(date +%Y%m%d-%H%M%S)"

# Pull latest code
git fetch origin
git reset --hard origin/main

# Verify latest commit
git log -1
# Should show: 385d45f docs: Complete code synchronization report
```

**3. Install Dependencies**:
```bash
npm install --production
```

**4. Build TypeScript**:
```bash
npm run build
```

**5. Run Database Migrations**:
```bash
npx prisma migrate deploy
```

**6. Check Environment Variables**:
```bash
# Verify production settings
grep NODE_ENV .env
# Should be: NODE_ENV=production

# Check all required vars
grep -E "DATABASE_URL|SMTP|TWILIO" .env | head -10
```

**7. Restart PM2**:
```bash
pm2 restart crm-backend
pm2 list
pm2 logs crm-backend --lines 20
```

**8. Verify Backend**:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","environment":"production","database":"connected"}
```

---

## 🧪 VERIFICATION CHECKLIST

After deployment, verify these on https://brandmonkz.com:

### Frontend Checks:
- [ ] Page loads without errors
- [ ] Bundle version is `index-CPXh6bQY.js`
- [ ] No console errors (F12 → Console)
- [ ] Login page appears
- [ ] CSS styles load correctly
- [ ] All images/assets load

### Login Test:
- [ ] Can login with ethan@brandmonkz.com / CTOPassword123
- [ ] Dashboard loads after login
- [ ] User menu shows correct name
- [ ] Logout works

### Core Features:
- [ ] Contacts page loads
- [ ] Can view contact list
- [ ] Pagination works (10/15/20 per page)
- [ ] Companies page loads
- [ ] Company detail shows intelligence data
- [ ] CSV import modal appears

### New Features:
- [ ] Activities page loads
- [ ] Can create Email activity
- [ ] Can create Task
- [ ] Can send email (after backend update)
- [ ] Task completion works
- [ ] Meeting scheduler appears

### API Integration:
- [ ] Network tab shows API calls to `http://18.212.225.252:3000`
- [ ] All API responses are 200 or appropriate status
- [ ] No CORS errors
- [ ] Authentication works (JWT in requests)

---

## 🔧 If Frontend Still Shows Old Version

**Clear Browser Cache**:
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or open incognito/private window
Ctrl+Shift+N (Chrome/Edge)
Cmd+Shift+N (Safari)
```

**Clear Server Cache (if using CloudFront)**:
```bash
# If using CloudFront CDN
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Verify Nginx Config**:
```bash
# On EC2
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/default

# Check if there's caching configured
grep -i cache /etc/nginx/sites-enabled/*
```

---

## 🚨 Troubleshooting

### Issue 1: 404 Not Found
**Cause**: Nginx not configured correctly
**Fix**:
```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify nginx is running
sudo systemctl status nginx

# Check if files exist
ls -la /var/www/brandmonkz/
```

### Issue 2: White Screen / Blank Page
**Cause**: JavaScript bundle not loading
**Fix**:
```bash
# Check browser console (F12)
# Look for errors loading assets

# Verify file permissions
sudo chmod -R 755 /var/www/brandmonkz
sudo chown -R www-data:www-data /var/www/brandmonkz
```

### Issue 3: API Calls Failing
**Cause**: Backend not updated or CORS issue
**Fix**:
```bash
# Update backend (see Option B above)
# Check PM2 status
pm2 list
pm2 logs crm-backend --err

# Check backend health
curl http://localhost:3000/health
```

### Issue 4: Old Version Still Showing
**Cause**: Browser cache or CDN cache
**Fix**:
```bash
# Clear browser cache (Ctrl+Shift+R)
# Try incognito window
# Wait 5 minutes for CDN cache to expire
```

---

## 📊 Production URLs

| Service | URL | Status |
|---------|-----|--------|
| **Production Site** | https://brandmonkz.com | ⏸️ Needs nginx update |
| **S3 Direct** | http://brandmonkz-crm-frontend.s3-website-us-east-1.amazonaws.com | ✅ UPDATED |
| **Backend API** | http://18.212.225.252:3000 | ⏸️ Needs code update |
| **Backend Health** | http://18.212.225.252:3000/health | ✅ Running |

---

## 🔐 Security Checklist

Before going live:

- [ ] HTTPS is enabled (check https://brandmonkz.com)
- [ ] SSL certificate is valid
- [ ] CORS is configured correctly
- [ ] All API endpoints require authentication
- [ ] Environment variables are set (not defaults)
- [ ] Database backups are enabled
- [ ] PM2 is saving process list
- [ ] Logs are being monitored
- [ ] No secrets in frontend code

---

## 📈 Post-Deployment Monitoring

**Monitor for 24 hours**:

```bash
# Watch backend logs
pm2 logs crm-backend

# Monitor resources
pm2 monit

# Check nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Monitor database
# Check RDS console for CPU/memory/connections
```

**Set up alerts** (optional):
- CloudWatch alarms for high CPU
- CloudWatch alarms for 5xx errors
- PM2 monitoring service
- Uptime monitoring (e.g., Pingdom, UptimeRobot)

---

## 🔄 Rollback Procedure

If deployment causes issues:

**Frontend Rollback**:
```bash
# On EC2
cd /tmp
ls -lh frontend-backup-*.tar.gz
# Find your backup file

# Restore (use actual filename)
sudo tar -xzf frontend-backup-20251013-004500.tar.gz -C /var/www/brandmonkz
sudo systemctl restart nginx
```

**Backend Rollback**:
```bash
# On EC2
cd /home/ubuntu/brandmonkz-crm-backend

# View stash list
git stash list

# Restore previous version
git stash pop stash@{0}  # Use actual stash number

# Rebuild
npm run build
pm2 restart crm-backend
```

---

## ✅ SUCCESS CRITERIA

Deployment is successful when:

1. ✅ https://brandmonkz.com loads latest UI
2. ✅ Bundle version is `index-CPXh6bQY.js`
3. ✅ Can login successfully
4. ✅ Dashboard loads
5. ✅ Contact list shows with pagination
6. ✅ Company intelligence data appears
7. ✅ CSV import works
8. ✅ Activities page loads
9. ✅ Can send emails
10. ✅ All features from source repos work
11. ✅ All new features we added work
12. ✅ No console errors
13. ✅ Backend health check passes
14. ✅ Database queries work
15. ✅ PM2 shows backend as "online"

---

## 📞 Quick Commands

### Check Deployment Status:
```bash
# Frontend bundle on brandmonkz.com
curl -s https://brandmonkz.com | grep -o 'index-[^.]*\.js'

# Backend health
curl http://18.212.225.252:3000/health

# PM2 status
pm2 list

# Nginx status
sudo systemctl status nginx
```

### Common PM2 Commands:
```bash
pm2 list                    # List processes
pm2 logs crm-backend        # View logs
pm2 restart crm-backend     # Restart
pm2 stop crm-backend        # Stop
pm2 delete crm-backend      # Remove
pm2 monit                   # Monitor
pm2 save                    # Save process list
```

---

## 🎉 After Successful Deployment

1. **Announce to team**: CRM is live with all features
2. **Update documentation**: Mark production as live
3. **Monitor logs**: Watch for any errors
4. **Test all features**: Go through verification checklist
5. **Backup**: Take full backup of working system
6. **Document**: Note any issues and how they were resolved

---

**Last Updated**: October 13, 2025, 12:45 AM
**Frontend S3**: ✅ DEPLOYED (`index-CPXh6bQY.js`)
**brandmonkz.com**: ⏸️ NEEDS NGINX UPDATE (5 min via AWS Console)
**Backend**: ⏸️ NEEDS CODE UPDATE (5 min via AWS Console)

**Total Time to Complete**: ~10-15 minutes via AWS Console

---

## 🚀 START HERE

**Connect to EC2 Now**:
1. Go to: https://console.aws.amazon.com/ec2/v2/home?region=us-east-1#Instances:
2. Find instance: 18.212.225.252
3. Click "Connect" → "EC2 Instance Connect"
4. Follow "Option A" steps above

**You're 10 minutes away from having the complete CRM live on brandmonkz.com!** 🎉
