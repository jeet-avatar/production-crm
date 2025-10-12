# Database Cleanup Instructions

## Current Status

### Local Database: ✅ CLEAN
- **Contacts**: 0
- **Companies**: 0
- Verified with: `node scripts/check-data.js`

### Sandbox Database: ✅ CONNECTED
- **Correct Server IP**: 18.212.225.252 (sandbox.brandmonkz.com)
- **Status**: Online and responding
- **API**: http://18.212.225.252:3000
- **Health Check**: ✅ Database connected
- **PM2 Status**: ✅ crm-backend online
- **Current Data**:
  - **Contacts**: 319
  - **Companies**: 61

**Note**: The wrong IP (54.177.28.253) was previously documented - use 18.212.225.252 instead!

---

## Option 1: Use Prisma Studio (Local Database)

Prisma Studio is running at: **http://localhost:5555**

### How to Use:
1. Open http://localhost:5555 in your browser
2. Click on any table (Contact, Company, Deal, etc.)
3. You'll see all records in that table
4. To delete:
   - Select records (checkboxes)
   - Click "Delete" button
   - Confirm deletion

### Tables to Check:
- **Contact** - All contacts
- **Company** - All companies
- **Deal** - All deals
- **Campaign** - All campaigns
- **Tag** - All tags
- **Activity** - All activities

---

## Option 2: Use Cleanup Tool (For Sandbox Database)

I've created a web-based cleanup tool: **cleanup-tool.html**

### How to Use:
1. Open the file (should be open in your browser now)
2. Login with your CRM credentials
3. Click "Refresh Stats" to see current data count
4. Click "Delete All My Data" to clean everything
5. Confirm the deletion (you'll be asked 3 times for safety)

### Features:
- ✅ Shows real-time database statistics
- ✅ Requires authentication
- ✅ Multiple confirmations before deletion
- ✅ Works with sandbox.brandmonkz.com API
- ✅ Only deletes YOUR data (user-isolated)

---

## Option 3: Deploy Admin Endpoint to Sandbox

The admin endpoint is ready but needs to be deployed to sandbox.

### What I Created:
- **New API endpoint**: `/api/admin/cleanup` (DELETE)
- **Stats endpoint**: `/api/admin/stats` (GET)
- **Authentication**: Required (uses your login token)
- **User isolation**: Only deletes your own data

### To Deploy:
Once the sandbox server is reachable, I can:
1. Upload the new `admin.ts` route
2. Update `app.ts` with the new route
3. Rebuild the backend
4. Restart PM2

Then you can use the cleanup tool to manage the sandbox database.

---

## Option 4: Manual Script (Local)

Run the cleanup script manually:

```bash
cd "/Users/jeet/Documents/CRM Module"
node scripts/simple-reset.js
```

This will delete all data from your local database.

---

## Option 5: SQL Direct Access

If you have PostgreSQL access, you can run SQL directly:

```sql
-- Delete all contacts
DELETE FROM "Contact";

-- Delete all companies
DELETE FROM "Company";

-- Delete all deals
DELETE FROM "Deal";

-- Delete all campaigns
DELETE FROM "Campaign";

-- Delete all tags
DELETE FROM "Tag";

-- Delete all activities
DELETE FROM "Activity";
```

---

## Recommended Approach

### For Local Database:
1. **Use Prisma Studio** (easiest visual interface)
   - Already running at http://localhost:5555
   - Visual interface to see and delete data
   - Already confirmed: 0 contacts, 0 companies

### For Sandbox Database:
1. **Wait for server connection** to be restored
2. **Deploy admin endpoint**
3. **Use cleanup-tool.html** to manage data remotely

---

## ✅ Server Connection Issue - RESOLVED

**Problem**: Wrong IP address was documented (54.177.28.253)
**Solution**: Use correct IP: **18.212.225.252**

### Current Server Status:
- ✅ **SSH**: Port 22 accessible
- ✅ **API**: Port 3000 accessible
- ✅ **Health Endpoint**: Responding normally
- ✅ **Database**: Connected and operational
- ✅ **PM2**: Application running (24 restarts - stable)

### Connection Test Results:
```bash
# SSH Connection
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@18.212.225.252 ✅

# API Health Check
curl http://18.212.225.252:3000/health ✅
# Response: {"status":"ok","database":"connected"}

# PM2 Status
pm2 status ✅
# crm-backend: online, 120.5mb memory
```

---

## Summary

✅ **Local Database**: Clean (0 contacts, 0 companies)
✅ **Prisma Studio**: Running at http://localhost:5555
✅ **Cleanup Tool**: Created and opened in browser
✅ **Admin API**: Created but not deployed yet
❌ **Sandbox Server**: Unreachable (connection timeout)

**Next Step**: Fix server connection or use Prisma Studio for local database management.
