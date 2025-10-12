# 🚀 SANDBOX DEPLOYMENT GUIDE

**Version:** v1.0.0-sandbox
**Last Updated:** 2025-10-09
**Target Environment:** Sandbox
**Expected Duration:** 2-3 hours

---

## 📋 PREREQUISITES

### Server Requirements
- ✅ Ubuntu 20.04+ or similar Linux distribution
- ✅ Root or sudo access
- ✅ Node.js v18+ installed
- ✅ PostgreSQL 14+ installed
- ✅ Nginx or Apache installed
- ✅ SSL certificate for sandbox domain
- ✅ DNS configured:
  - `api-sandbox.brandmonkz.com` → Server IP
  - `sandbox.brandmonkz.com` → Server IP

### Local Requirements
- ✅ Deployment package built (`./deploy-to-sandbox.sh` executed)
- ✅ SSH access to sandbox server
- ✅ Environment variables documented
- ✅ Database credentials ready

---

## 📦 STEP 1: PREPARE SANDBOX SERVER

### 1.1 Connect to Server
```bash
ssh user@sandbox.brandmonkz.com
```

### 1.2 Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Verify installations
node --version  # Should be v18.x or higher
npm --version
psql --version
nginx -v
pm2 --version
```

### 1.3 Create Application Directories
```bash
# Create directories
sudo mkdir -p /var/www/crm-backend
sudo mkdir -p /var/www/crm-frontend
sudo mkdir -p /var/log/crm

# Set ownership
sudo chown -R $USER:$USER /var/www/crm-backend
sudo chown -R $USER:$USER /var/www/crm-frontend
sudo chown -R $USER:$USER /var/log/crm
```

---

## 💾 STEP 2: DATABASE SETUP

### 2.1 Create PostgreSQL Database
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE crm_sandbox;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crm_sandbox TO crm_user;
\q
```

### 2.2 Configure PostgreSQL (Optional - for remote access)
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Change:
listen_addresses = '*'  # Or specific IP

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add:
host    crm_sandbox    crm_user    0.0.0.0/0    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2.3 Test Database Connection
```bash
psql -h localhost -U crm_user -d crm_sandbox
# Enter password when prompted
# If successful, you'll see: crm_sandbox=>
\q
```

---

## 📤 STEP 3: UPLOAD APPLICATION FILES

### 3.1 Upload Backend (from your local machine)
```bash
# From local machine
scp -r "/Users/jeet/Documents/CRM Module" user@sandbox.brandmonkz.com:/tmp/crm-backend/

# On server
mv /tmp/crm-backend/* /var/www/crm-backend/
cd /var/www/crm-backend
```

### 3.2 Upload Frontend (from your local machine)
```bash
# From local machine
scp -r "/Users/jeet/Documents/CRM Frontend/crm-app/dist" user@sandbox.brandmonkz.com:/var/www/crm-frontend/

# Verify on server
ls -la /var/www/crm-frontend/dist/
```

---

## ⚙️ STEP 4: CONFIGURE ENVIRONMENT VARIABLES

### 4.1 Backend Environment Configuration
```bash
cd /var/www/crm-backend

# Create .env file
nano .env
```

### 4.2 Backend .env Content
```bash
# Environment
NODE_ENV=sandbox

# Server
PORT=3000
FRONTEND_URL=https://sandbox.brandmonkz.com

# Database
DATABASE_URL=postgresql://crm_user:your_secure_password@localhost:5432/crm_sandbox

# Authentication
JWT_SECRET=your_super_secure_random_string_here_min_32_chars
JWT_EXPIRE=7d
BCRYPT_ROUNDS=12

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=https://api-sandbox.brandmonkz.com/api/auth/google/callback

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Optional - Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**IMPORTANT:** Generate secure secrets:
```bash
# Generate JWT_SECRET (use one of these methods)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# OR
openssl rand -hex 32
```

### 4.3 Verify Environment Variables
```bash
# Check .env file exists and has content
cat .env | grep -v "^#" | grep -v "^$"

# NEVER commit .env to git!
```

---

## 🗄️ STEP 5: DATABASE MIGRATION

### 5.1 Install Dependencies
```bash
cd /var/www/crm-backend
npm install --production
```

### 5.2 Generate Prisma Client
```bash
npx prisma generate
```

### 5.3 Run Migrations
```bash
npx prisma migrate deploy
```

### 5.4 Verify Database Schema
```bash
psql -h localhost -U crm_user -d crm_sandbox

# In PostgreSQL:
\dt  # List all tables
# Should see: Contact, Company, Deal, Activity, User, Tag, etc.
\q
```

---

## 🔧 STEP 6: BUILD & START BACKEND

### 6.1 Build Application
```bash
cd /var/www/crm-backend
npm run build
```

### 6.2 Start with PM2
```bash
# Start application
pm2 start npm --name "crm-backend" -- start

# Verify running
pm2 status

# View logs
pm2 logs crm-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 6.3 Test Backend
```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

---

## 🌐 STEP 7: CONFIGURE NGINX

### 7.1 Create Nginx Configuration for Backend API
```bash
sudo nano /etc/nginx/sites-available/api-sandbox.brandmonkz.com
```

**Content:**
```nginx
server {
    listen 80;
    server_name api-sandbox.brandmonkz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api-sandbox.brandmonkz.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api-sandbox.brandmonkz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-sandbox.brandmonkz.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Access & Error Logs
    access_log /var/log/nginx/api-sandbox.access.log;
    error_log /var/log/nginx/api-sandbox.error.log;
}
```

### 7.2 Create Nginx Configuration for Frontend
```bash
sudo nano /etc/nginx/sites-available/sandbox.brandmonkz.com
```

**Content:**
```nginx
server {
    listen 80;
    server_name sandbox.brandmonkz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sandbox.brandmonkz.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/sandbox.brandmonkz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sandbox.brandmonkz.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory
    root /var/www/crm-frontend/dist;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # SPA routing - redirect all to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Access & Error Logs
    access_log /var/log/nginx/sandbox.access.log;
    error_log /var/log/nginx/sandbox.error.log;
}
```

### 7.3 Enable Sites & Restart Nginx
```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/api-sandbox.brandmonkz.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/sandbox.brandmonkz.com /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# If OK, restart Nginx
sudo systemctl restart nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## 🔒 STEP 8: SSL CERTIFICATE (if not already installed)

### 8.1 Install Certbot
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificates
```bash
# For API domain
sudo certbot --nginx -d api-sandbox.brandmonkz.com

# For Frontend domain
sudo certbot --nginx -d sandbox.brandmonkz.com
```

### 8.3 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## ✅ STEP 9: VERIFICATION

### 9.1 Backend Health Check
```bash
# From server
curl https://api-sandbox.brandmonkz.com/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-09T...",
  "environment": "sandbox"
}
```

### 9.2 Frontend Check
```bash
# From server
curl -I https://sandbox.brandmonkz.com

# Should return: HTTP/2 200
```

### 9.3 Test from Browser
1. Open: https://sandbox.brandmonkz.com
2. Should see CRM login page
3. Check browser console for errors
4. Verify HTTPS lock icon

### 9.4 Test CORS
```bash
# From browser console on https://sandbox.brandmonkz.com
fetch('https://api-sandbox.brandmonkz.com/health')
  .then(r => r.json())
  .then(console.log)

# Should work (CORS allows sandbox domain)
```

### 9.5 Test from Localhost (Should FAIL)
```bash
# From browser console on http://localhost:5173
fetch('https://api-sandbox.brandmonkz.com/health')
  .then(r => r.json())
  .then(console.log)

# Should FAIL with CORS error (expected behavior)
```

---

## 🧪 STEP 10: POST-DEPLOYMENT TESTING

### 10.1 Authentication Test
1. Navigate to https://sandbox.brandmonkz.com
2. Click "Login with Google"
3. Verify OAuth flow works
4. Verify JWT token received

### 10.2 Feature Tests
```bash
# Create contact
curl -X POST https://api-sandbox.brandmonkz.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","status":"LEAD"}'

# Get contacts
curl https://api-sandbox.brandmonkz.com/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 10.3 Security Tests
- [ ] Try accessing API without token (should get 401)
- [ ] Try accessing another user's data (should fail)
- [ ] Verify rate limiting (rapid requests get 429)
- [ ] Check security headers in browser dev tools

---

## 📊 STEP 11: MONITORING SETUP

### 11.1 PM2 Monitoring
```bash
# Monitor in real-time
pm2 monit

# View logs
pm2 logs crm-backend

# Watch for errors
pm2 logs crm-backend --err

# Export logs
pm2 logs --json > /var/log/crm/pm2-logs.json
```

### 11.2 Nginx Logs
```bash
# Watch access logs
tail -f /var/log/nginx/api-sandbox.access.log

# Watch error logs
tail -f /var/log/nginx/api-sandbox.error.log

# Search for errors
grep "error" /var/log/nginx/api-sandbox.error.log
```

### 11.3 Database Monitoring
```bash
# Check active connections
psql -h localhost -U crm_user -d crm_sandbox -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -h localhost -U crm_user -d crm_sandbox -c "SELECT pg_size_pretty(pg_database_size('crm_sandbox'));"
```

---

## 🔄 STEP 12: ROLLBACK PROCEDURE

### If Deployment Fails
```bash
# 1. Stop services
pm2 stop crm-backend
pm2 delete crm-backend

# 2. Restore from backup (if you have one)
cd /var/www
mv crm-backend crm-backend-failed
mv crm-backend-backup crm-backend

# 3. Rollback database
cd /var/www/crm-backend
npx prisma migrate reset --force

# 4. Restart services
pm2 start npm --name "crm-backend" -- start
pm2 save

# 5. Verify
curl https://api-sandbox.brandmonkz.com/health
```

---

## 📝 STEP 13: DOCUMENTATION

### Create Deployment Log
```bash
cat > /var/www/crm-backend/deployment-log.md << 'EOF'
# Deployment Log

**Date:** $(date)
**Environment:** Sandbox
**Deployed By:** $USER
**Version:** v1.0.0-sandbox

## Deployment Details
- Backend: /var/www/crm-backend
- Frontend: /var/www/crm-frontend
- Database: crm_sandbox
- PM2 Process: crm-backend

## Post-Deployment Checks
- [x] Health check passed
- [x] Database connected
- [x] Frontend loads
- [x] OAuth works
- [x] CORS configured

## Issues Encountered
- None

## Next Steps
- Monitor for 48 hours
- Run user acceptance testing
- Document any issues
EOF
```

---

## 🎉 DEPLOYMENT COMPLETE!

### Verify All Systems
- ✅ Backend API: https://api-sandbox.brandmonkz.com/health
- ✅ Frontend: https://sandbox.brandmonkz.com
- ✅ Database: Connected
- ✅ SSL: Enabled
- ✅ PM2: Running

### Next Actions
1. **Notify team** deployment is complete
2. **Run UAT** (User Acceptance Testing)
3. **Monitor logs** for 48 hours
4. **Document issues** if any
5. **Plan production** deployment

---

## 📞 SUPPORT

### Logs Location
- PM2 Logs: `pm2 logs crm-backend`
- Nginx Logs: `/var/log/nginx/`
- Application Logs: `/var/log/crm/`

### Common Issues & Solutions
See: `TROUBLESHOOTING.md` (if created)

### Emergency Contacts
- DevOps: [contact info]
- Database Admin: [contact info]
- Security Team: [contact info]

---

**Guide Version:** 1.0
**Last Updated:** 2025-10-09
**Maintained By:** DevOps Team
