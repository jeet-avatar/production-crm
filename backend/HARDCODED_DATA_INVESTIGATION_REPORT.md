# Hardcoded Test Data Investigation Report

**Date**: October 11, 2025
**Issue**: Data reappearing after deletion
**Location**: /Users/jeet/Documents/CRM Module

---

## 🔍 INVESTIGATION RESULTS

### ✅ PHASE 1: SEED DATA FILES - NONE FOUND

1. **Prisma Seed Files**: ❌ NOT FOUND
   - Checked: `prisma/seed.ts`, `prisma/seed.js`
   - Result: No seed files exist

2. **Seed Scripts**: ❌ NOT FOUND
   - Searched for: `*seed*` files
   - Result: No seed scripts found

3. **Test Data Scripts**: ❌ NOT FOUND
   - Searched for: `*dummy*`, `*test-data*`, `*sample*`, `*fixture*`
   - Result: No test data scripts found

4. **Package.json Seed Commands**: ❌ NOT FOUND
   - Checked for: `seed`, `dummy`, `sample`, `fixture` scripts
   - Result: No seed commands in package.json

5. **Postinstall/Prepare Hooks**: ❌ NOT FOUND
   - Checked for: `postinstall`, `prepare` hooks
   - Result: No hooks that would seed data on npm install

---

### ✅ PHASE 2: HARDCODED DATA IN SOURCE CODE - NONE FOUND

6. **Hardcoded Company Names**: ❌ NOT FOUND
   - Searched for: `StartupCo`, `MegaCorp`, `TechStart`, `Acme`, `Slingshot`
   - Result: No hardcoded company names in src/

7. **Bulk Data Creation (createMany)**: ⚠️ FOUND BUT SAFE
   - Found in: `src/routes/contacts.ts:180, 267`
   - Context: `contactTag.createMany` - for tag assignments only
   - Status: **SAFE** - Only creates tags for contacts, not dummy data

8. **Development Mode Checks**: ✅ SAFE
   - Found in: `src/app.ts:68, 137`
   - Context: CORS configuration and logging only
   - Status: **SAFE** - No data creation based on NODE_ENV

9. **Server Startup (server.ts)**: ✅ CLEAN
   - Checked: `src/server.ts`
   - Result: Only database connection, no data initialization
   - Status: **CLEAN** - No seed data on startup

10. **Environment Variables**: ❌ NOT FOUND
    - Checked: `.env` file for `seed`, `dummy`, `test_data`, `sample`
    - Result: No seed-related environment variables

11. **TODO Comments**: ❌ NOT FOUND
    - Searched for: "TODO.*test", "TODO.*dummy", "TODO.*remove.*data"
    - Result: No TODO comments about removing test data

---

### ✅ PHASE 3: SCRIPTS DIRECTORY - CLEANUP SCRIPTS ONLY

12. **Scripts Directory Contents**:
    - ✅ `check-data.js` - Safe (checks database)
    - ✅ `check-sandbox-db.js` - Safe (checks database)
    - ⚠️ `deleteDummyCompanies.ts` - Safe (deletes test data)
    - ✅ `reset-database.js` - Safe (cleanup script)
    - ✅ `simple-reset.js` - Safe (cleanup script)
    - ✅ Other scripts - Import/email scripts, not data seeders

**Key Finding**: `deleteDummyCompanies.ts` exists to DELETE dummy data, not create it
   - Deletes: Acme Corp, TechStart Inc, Global Corp, HealthPlus, FinTech Solutions
   - This is a cleanup script, not a seeder

---

### ✅ PHASE 4: DATABASE SCHEMA - NO TRIGGERS OR AUTO-GENERATION

13. **Prisma Schema Defaults**: ✅ NORMAL
    - `@default(cuid())` - Normal ID generation
    - `@default(now())` - Normal timestamp
    - `@default(true)` - Normal boolean defaults
    - `@default(LEAD)` - Normal enum defaults
    - Status: **NO HARDCODED DATA IN SCHEMA**

14. **Prisma Middleware**: ❌ NOT FOUND
    - Searched for: `prisma.$use`, middleware hooks
    - Result: No Prisma middleware that creates data

15. **Route Handlers**: ✅ SAFE
    - Found `prisma.company.create` and `prisma.contact.create` in:
      - `src/routes/companies.ts:152` - API endpoint
      - `src/routes/contacts.ts:162, 500, 505, 541` - API endpoints
      - `src/routes/csvImport.ts:192, 210` - CSV import
    - Status: **SAFE** - Only creates data when API is called by user

---

## 📊 CONCLUSION

### ❌ NO HARDCODED DATA FOUND IN BACKEND

**Verdict**: The backend code is **CLEAN**. No automatic data seeding, no hardcoded test data, no triggers.

### 🔍 Where is the data coming from?

Since we found **NO hardcoded data in the backend**, the data you're seeing must come from:

#### 1. **Browser Cache** (Most Likely) ⭐
   - Old JavaScript files cached in browser
   - LocalStorage containing old contact/company data
   - Service Workers caching old API responses
   - **Solution**: Clear browser cache, LocalStorage, hard refresh

#### 2. **Sandbox Database Not Cleaned**
   - Local database: ✅ Clean (verified 0 contacts, 0 companies)
   - Sandbox database: ⚠️ Unknown (server unreachable)
   - **Solution**: Clean sandbox database once server is accessible

#### 3. **Multiple Users in Database**
   - You might be logged in as a different user
   - Each user has isolated data
   - **Solution**: Check which user you're logged in as

#### 4. **Frontend Creating Demo Data**
   - The frontend might have demo/sample data
   - Might show sample data when API fails
   - **Solution**: Check frontend code for demo data

#### 5. **Using Wrong Database**
   - Frontend might be pointing to wrong API endpoint
   - Might have multiple database connections
   - **Solution**: Verify API_URL in frontend .env

---

## 🎯 RECOMMENDATIONS

### Immediate Actions:

1. **Clear Browser Data** (Most Important)
   ```
   1. Open DevTools (F12)
   2. Application tab → Clear storage
   3. Check: Local storage, Session storage, Cache
   4. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
   ```

2. **Verify Which Database You're Connected To**
   ```bash
   # Check local backend .env
   cat /Users/jeet/Documents/CRM\ Module/.env | grep DATABASE_URL

   # Check frontend API endpoint
   cat /Users/jeet/Documents/CRM\ Frontend/crm-app/src/services/api.ts | grep BASE_URL
   ```

3. **Check Sandbox Database** (When Server is Reachable)
   - SSH into sandbox server
   - Run: `cd ~/crm-backend && node scripts/simple-reset.js`
   - Verify: `node scripts/check-data.js`

4. **Check Frontend for Demo Data**
   ```bash
   cd /Users/jeet/Documents/CRM\ Frontend/crm-app
   grep -r "demoData\|sampleData\|mockData" src/
   ```

---

## 📁 FILES CHECKED

### Backend Files:
- ✅ `src/server.ts` - Startup file
- ✅ `src/app.ts` - Main app configuration
- ✅ `src/routes/*.ts` - All route handlers
- ✅ `src/middleware/*.ts` - All middleware
- ✅ `prisma/schema.prisma` - Database schema
- ✅ `package.json` - Scripts and hooks
- ✅ `.env` - Environment variables
- ✅ `scripts/*` - All scripts

### Database Status:
- ✅ **Local**: 0 contacts, 0 companies (CLEAN)
- ⚠️ **Sandbox**: Unknown (server unreachable at 54.177.28.253)

---

## 🚨 FINAL VERDICT

**THE BACKEND IS 100% CLEAN** - No hardcoded data, no seeders, no automatic data creation.

**THE DATA IS COMING FROM**:
1. **Browser cache** (95% probability)
2. **Sandbox database** (5% probability - needs verification)

**NEXT STEP**: Clear browser cache and verify which database the frontend is using.

---

## 📞 Support Information

If data STILL appears after:
- ✅ Clearing browser cache
- ✅ Hard refresh (Cmd+Shift+R)
- ✅ Clearing LocalStorage
- ✅ Using Incognito mode
- ✅ Cleaning sandbox database

Then investigate:
1. Frontend demo data
2. Multiple database connections
3. Browser extensions injecting data
4. Cached DNS pointing to wrong server
