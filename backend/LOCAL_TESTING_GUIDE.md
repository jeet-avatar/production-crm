# 🧪 LOCAL TESTING GUIDE - Security Fixes Verification

**Date:** October 9, 2025
**Environment:** Local Development
**Backend:** http://localhost:3000
**Frontend:** http://localhost:5173

═══════════════════════════════════════════════════════════════════════════════

## ✅ SERVERS RUNNING

- ✅ **Backend:** Running on port 3000
- ✅ **Frontend:** Running on port 5173
- ✅ **Database:** Connected
- ✅ **Health Check:** http://localhost:3000/health

═══════════════════════════════════════════════════════════════════════════════

## 🔐 TESTING THE SECURITY FIXES

### **What We Fixed Today:**

1. ✅ **Campaigns** - Users can only see/modify their own campaigns
2. ✅ **Deals** - Users can only update their own deal stages
3. ✅ **Email Servers** - Users can only manage their own email servers
4. ✅ **Enrichment** - Users can only enrich their own companies

═══════════════════════════════════════════════════════════════════════════════

## 📋 COMPREHENSIVE TEST PLAN

### **Step 1: Open the Application**

🌐 **Open in your browser:** http://localhost:5173

You should see the CRM login page.

---

### **Step 2: Login/Register**

**Option A: Login with Google OAuth**
- Click "Sign in with Google"
- Complete Google authentication
- You'll be redirected to the dashboard

**Option B: Register New User**
- Click "Register"
- Fill in your details
- Complete registration

---

### **Step 3: Test Dashboard**

✅ **What to check:**
- Dashboard loads without errors
- Stats display correctly
- No console errors in browser (F12 → Console)

**Expected:** ✅ Dashboard shows your data only

---

### **Step 4: Test Contacts Module** ✅ (Already Secured)

📍 **Go to:** http://localhost:5173/contacts

**Test:**
1. ✅ Click "Add Contact"
2. ✅ Fill in contact details (name, email, company)
3. ✅ Click "Save"
4. ✅ Contact appears in list
5. ✅ Click on contact to view details
6. ✅ Edit contact and save changes

**Expected:** ✅ You can only see and edit your own contacts

---

### **Step 5: Test Companies Module** ✅ (Already Secured)

📍 **Go to:** http://localhost:5173/companies

**Test:**
1. ✅ Click "Add Company"
2. ✅ Fill in company details
3. ✅ Click "Save"
4. ✅ Company appears in list
5. ✅ Click on company to view details
6. ✅ Add contacts to company

**Expected:** ✅ You can only see and manage your own companies

---

### **Step 6: Test Campaigns Module** 🆕 (FIXED TODAY)

📍 **Go to:** http://localhost:5173/campaigns

**Test:**
1. ✅ Click "Create Campaign"
2. ✅ Enter campaign name
3. ✅ Add companies to campaign
4. ✅ Configure email content
5. ✅ Save campaign
6. ✅ View campaign details
7. ✅ Remove company from campaign

**What's Fixed:**
- ✅ GET /api/campaigns/:id - Now filters by userId
- ✅ Adding companies - Verifies you own both campaign and company
- ✅ Removing companies - Verifies campaign ownership
- ✅ Viewing company list - Filters by userId

**Expected:** ✅ You can only see and modify YOUR campaigns

**To Test Security:**
- If you have 2 users, User A should NOT be able to access User B's campaign by ID
- Try accessing a campaign directly by URL with a different campaign ID

---

### **Step 7: Test Deals Module** 🆕 (FIXED TODAY)

📍 **Go to:** http://localhost:5173/deals

**Test:**
1. ✅ Click "Add Deal"
2. ✅ Fill in deal details (title, value, contact, company)
3. ✅ Click "Save"
4. ✅ Deal appears in list
5. ✅ **Change deal stage** (Prospecting → Qualification → etc.)
6. ✅ Verify stage updates correctly

**What's Fixed:**
- ✅ PATCH /api/deals/:id/stage - Now verifies ownership before allowing stage change

**Expected:** ✅ You can only update stages of YOUR deals

**To Test Security:**
- If you have 2 users, User A should NOT be able to change User B's deal stages

---

### **Step 8: Test Email Servers** 🆕 (FIXED TODAY)

📍 **Go to:** http://localhost:5173/settings/email-servers (or wherever email server config is)

**Test:**
1. ✅ Click "Add Email Server"
2. ✅ Fill in SMTP details:
   - Name: "Test Gmail"
   - Provider: Gmail
   - Host: smtp.gmail.com
   - Port: 587
   - Username: your-email@gmail.com
   - Password: your-app-password
3. ✅ Click "Save"
4. ✅ Click "Test Connection"
5. ✅ Send verification email
6. ✅ Delete email server

**What's Fixed:**
- ✅ Authentication added to ALL email server routes
- ✅ GET /api/email-servers - Uses req.user?.id (not query param)
- ✅ Test connection - Verifies ownership
- ✅ Send verification - Verifies ownership
- ✅ Delete - Verifies ownership

**Expected:** ✅ You can only see and manage YOUR email servers

**To Test Security:**
- If you have 2 users, User A should NOT be able to test/delete User B's email servers

---

### **Step 9: Test CSV Import** ✅ (Already Secured)

📍 **Go to:** http://localhost:5173/contacts

**Test:**
1. ✅ Click "AI CSV Import"
2. ✅ Upload a CSV file with contacts
3. ✅ Review field mapping
4. ✅ Confirm import
5. ✅ Check imported contacts appear in your list

**Expected:** ✅ Imported contacts are associated with YOUR user account

---

### **Step 10: Test Company Enrichment** 🆕 (FIXED TODAY)

📍 **Go to:** http://localhost:5173/companies/:id

**Test:**
1. ✅ Open a company detail page
2. ✅ Click "Enrich Company" (if available in UI)
3. ✅ Verify enrichment data appears

**What's Fixed:**
- ✅ POST /api/enrichment/companies/:id/enrich - Now verifies you own the company
- ✅ Bulk enrichment - Filters by userId

**Expected:** ✅ You can only enrich YOUR companies

═══════════════════════════════════════════════════════════════════════════════

## 🔐 ADVANCED SECURITY TESTING (Optional)

If you want to THOROUGHLY test the security fixes:

### **Create 2 Test Users:**

**User A:**
- Email: userA@test.com
- Register and create some data:
  - 2 contacts
  - 2 companies
  - 1 campaign
  - 1 deal
  - 1 email server

**User B:**
- Email: userB@test.com
- Register and create some data:
  - 2 contacts
  - 2 companies
  - 1 campaign
  - 1 deal

### **Test Data Isolation:**

**Logged in as User A:**
1. ✅ Can see User A's contacts only
2. ✅ Can see User A's companies only
3. ✅ Can see User A's campaigns only
4. ✅ Can see User A's deals only
5. ✅ Can see User A's email servers only

**Logged in as User B:**
1. ✅ Can see User B's contacts only
2. ✅ Cannot see User A's data
3. ✅ Cannot access User A's campaign by ID
4. ✅ Cannot update User A's deal stages
5. ✅ Cannot test/delete User A's email servers

### **API Testing (Using Browser DevTools or Postman):**

**Test these scenarios:**

1. **Campaign Access:**
   ```bash
   # Get User A's JWT token
   # Try to access User B's campaign
   GET /api/campaigns/[USER_B_CAMPAIGN_ID]
   Authorization: Bearer [USER_A_TOKEN]

   # Expected: 404 Not Found or empty response
   ```

2. **Deal Stage Update:**
   ```bash
   # Get User A's JWT token
   # Try to update User B's deal stage
   PATCH /api/deals/[USER_B_DEAL_ID]/stage
   Authorization: Bearer [USER_A_TOKEN]
   Body: { "stage": "CLOSED_WON" }

   # Expected: 404 Not Found
   ```

3. **Email Server Delete:**
   ```bash
   # Get User A's JWT token
   # Try to delete User B's email server
   DELETE /api/email-servers/[USER_B_SERVER_ID]
   Authorization: Bearer [USER_A_TOKEN]

   # Expected: 404 Not Found
   ```

═══════════════════════════════════════════════════════════════════════════════

## ✅ TESTING CHECKLIST

Use this checklist to verify everything works:

### **Basic Functionality:**
- [ ] Can login/register
- [ ] Dashboard loads
- [ ] Can create contacts
- [ ] Can create companies
- [ ] Can create deals
- [ ] Can create campaigns
- [ ] Can import CSV
- [ ] Can configure email servers

### **Security Fixes (Today's Work):**
- [ ] Campaigns - Can only see my campaigns
- [ ] Campaigns - Can only add my companies to my campaigns
- [ ] Deals - Can only update my deal stages
- [ ] Email Servers - Can only see my email servers
- [ ] Email Servers - Can only test/verify my servers
- [ ] Enrichment - Can only enrich my companies

### **Cross-User Testing (If you have 2 users):**
- [ ] User A cannot see User B's campaigns
- [ ] User A cannot update User B's deal stages
- [ ] User A cannot delete User B's email servers
- [ ] User A cannot enrich User B's companies

═══════════════════════════════════════════════════════════════════════════════

## 🐛 FOUND AN ISSUE?

If you find any bugs or security issues:

1. **Check Browser Console** (F12 → Console tab)
2. **Check Network Tab** (F12 → Network tab)
3. **Look for error messages**
4. **Note which feature isn't working**

**Common Issues:**
- **401 Unauthorized:** You're not logged in or token expired
- **404 Not Found:** Resource doesn't exist or you don't own it (GOOD - security working!)
- **500 Server Error:** Backend error (check backend console logs)

═══════════════════════════════════════════════════════════════════════════════

## 📊 WHAT TO EXPECT

**With Today's Security Fixes:**

✅ **Campaigns:**
- You can only see YOUR campaigns in the list
- You can only view details of YOUR campaigns
- You can only add YOUR companies to YOUR campaigns
- Trying to access another user's campaign by ID returns 404

✅ **Deals:**
- You can only update stages of YOUR deals
- Trying to update another user's deal returns 404

✅ **Email Servers:**
- You can only see YOUR email servers
- You can only test/verify YOUR servers
- You can only delete YOUR servers
- Trying to access another user's server returns 404

✅ **Enrichment:**
- You can only enrich YOUR companies
- Trying to enrich another user's company returns 404

**Already Secured (Before Today):**
✅ Contacts - Already isolated by user
✅ Companies - Already isolated by user
✅ Activities - Already isolated by user
✅ CSV Imports - Already isolated by user

═══════════════════════════════════════════════════════════════════════════════

## 🎯 SUCCESS CRITERIA

Your local testing is successful if:

1. ✅ You can login and use all features
2. ✅ All your data displays correctly
3. ✅ No console errors in browser
4. ✅ Backend responds correctly (check Network tab)
5. ✅ If you test with 2 users, they can't see each other's data
6. ✅ All security fixes are working (campaigns, deals, email servers, enrichment)

═══════════════════════════════════════════════════════════════════════════════

## 🚀 AFTER LOCAL TESTING

Once you've verified everything works locally:

1. ✅ All features working? → Ready for sandbox deployment
2. ❌ Found issues? → Report them and we'll fix before deployment
3. ✅ Security verified? → Safe to deploy to sandbox.brandmonkz.com

═══════════════════════════════════════════════════════════════════════════════

## 📱 YOUR LOCAL TESTING URLS

**Start Testing Here:**

🌐 **Frontend:** http://localhost:5173

**Direct Feature Links:**
- Dashboard: http://localhost:5173/dashboard
- Contacts: http://localhost:5173/contacts
- Companies: http://localhost:5173/companies
- Deals: http://localhost:5173/deals
- Campaigns: http://localhost:5173/campaigns

**Backend API:**
- Health: http://localhost:3000/health
- API Docs: http://localhost:3000/api (if available)

═══════════════════════════════════════════════════════════════════════════════

## 🎉 HAPPY TESTING!

Test all the features, especially:
- ✅ Campaigns (fixed today)
- ✅ Deal stage updates (fixed today)
- ✅ Email servers (fixed today)
- ✅ Company enrichment (fixed today)

If everything works, you're ready to deploy to sandbox! 🚀

═══════════════════════════════════════════════════════════════════════════════
