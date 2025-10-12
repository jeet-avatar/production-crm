# 🧪 POST-DEPLOYMENT TEST PLAN

**Version:** v1.0.0-sandbox
**Environment:** Sandbox
**Test Duration:** 48 hours
**Last Updated:** 2025-10-09

---

## 📋 IMMEDIATE TESTS (Within 1 Hour)

### Test 1: Health & Connectivity ✅
**Priority:** CRITICAL
**Duration:** 5 minutes

```bash
# Backend health check
curl https://api-sandbox.brandmonkz.com/health

# Expected Response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-10-09T...",
  "environment": "sandbox",
  "version": "1.0.0"
}

# Frontend check
curl -I https://sandbox.brandmonkz.com
# Expected: HTTP/2 200

# Database check
psql -h localhost -U crm_user -d crm_sandbox -c "SELECT 1;"
# Expected: 1
```

**Pass Criteria:**
- [ ] Health endpoint returns 200 OK
- [ ] Database status is "connected"
- [ ] Frontend returns 200 OK
- [ ] Database query succeeds

---

### Test 2: Authentication Flow ✅
**Priority:** CRITICAL
**Duration:** 10 minutes

**Steps:**
1. Navigate to https://sandbox.brandmonkz.com
2. Click "Login with Google"
3. Complete OAuth flow
4. Verify redirect to dashboard
5. Check JWT token in localStorage

**Pass Criteria:**
- [ ] OAuth flow completes successfully
- [ ] User redirected to dashboard
- [ ] JWT token stored in localStorage
- [ ] Token has correct expiration (7 days)
- [ ] User info displayed correctly

---

### Test 3: Core CRUD Operations ✅
**Priority:** CRITICAL
**Duration:** 15 minutes

#### 3.1 Create Contact
```javascript
// In browser console (with auth token)
fetch('https://api-sandbox.brandmonkz.com/api/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@sandbox.com',
    status: 'LEAD'
  })
})
.then(r => r.json())
.then(console.log)
```

**Pass Criteria:**
- [ ] Contact created successfully (201)
- [ ] Contact appears in contacts list
- [ ] All fields saved correctly

#### 3.2 Create Company
```javascript
fetch('https://api-sandbox.brandmonkz.com/api/companies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    name: 'Test Company',
    domain: 'testcompany.com',
    industry: 'Technology'
  })
})
.then(r => r.json())
.then(console.log)
```

**Pass Criteria:**
- [ ] Company created successfully (201)
- [ ] Company appears in companies list
- [ ] All fields saved correctly

#### 3.3 Link Contact to Company
1. Edit the test contact
2. Select "Test Company" from dropdown
3. Save contact
4. Navigate to Test Company detail page
5. Verify contact appears in company's contacts list

**Pass Criteria:**
- [ ] Contact successfully linked to company
- [ ] Contact appears on company detail page
- [ ] Link persists after page refresh

---

### Test 4: Data Isolation Security ✅
**Priority:** CRITICAL
**Duration:** 10 minutes

**Steps:**
1. Login as User A
2. Create contact with ID: XYZ
3. Note the contact ID
4. Logout
5. Login as User B
6. Try to access User A's contact:
   ```javascript
   fetch('https://api-sandbox.brandmonkz.com/api/contacts/XYZ', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('token')
     }
   })
   ```

**Pass Criteria:**
- [ ] User B gets 404 (Not Found)
- [ ] User B cannot see User A's contact in list
- [ ] User B cannot update User A's contact
- [ ] User B cannot delete User A's contact

---

### Test 5: CORS Verification ✅
**Priority:** HIGH
**Duration:** 5 minutes

#### 5.1 Test from Sandbox (Should Work)
```javascript
// From https://sandbox.brandmonkz.com
fetch('https://api-sandbox.brandmonkz.com/health')
  .then(r => r.json())
  .then(console.log)
```
**Expected:** ✅ Success

#### 5.2 Test from Localhost (Should Fail)
```javascript
// From http://localhost:5173 (if you have dev running)
fetch('https://api-sandbox.brandmonkz.com/health')
  .then(r => r.json())
  .then(console.log)
```
**Expected:** ❌ CORS error

**Pass Criteria:**
- [ ] Sandbox domain can access API
- [ ] Localhost is blocked (CORS error)
- [ ] Unauthorized domains logged in server

---

### Test 6: Rate Limiting ✅
**Priority:** HIGH
**Duration:** 5 minutes

```javascript
// Rapid fire requests (should trigger rate limit)
for (let i = 0; i < 1100; i++) {
  fetch('https://api-sandbox.brandmonkz.com/health')
    .then(r => console.log(i, r.status))
}
```

**Pass Criteria:**
- [ ] First 1000 requests succeed (200)
- [ ] Requests 1001+ return 429 (Too Many Requests)
- [ ] Rate limit resets after 15 minutes
- [ ] Error message is user-friendly

---

### Test 7: Security Headers ✅
**Priority:** HIGH
**Duration:** 5 minutes

**Open browser DevTools → Network tab → Check headers:**

```bash
# Or via curl
curl -I https://api-sandbox.brandmonkz.com/health
```

**Required Headers:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Strict-Transport-Security: max-age=...`
- [ ] `Content-Security-Policy: ...`

---

## 📊 FUNCTIONAL TESTS (1-4 Hours)

### Test 8: CSV Import ✅
**Priority:** HIGH
**Duration:** 15 minutes

**Prepare Test CSV:**
```csv
First Name,Last Name,Email,Phone,Company,Role,Status
John,Doe,john@test.com,555-1234,Acme Corp,CEO,CUSTOMER
Jane,Smith,jane@test.com,555-5678,Tech Inc,CTO,PROSPECT
```

**Steps:**
1. Navigate to Contacts page
2. Click "Import CSV"
3. Upload test CSV
4. Verify field mapping
5. Import contacts
6. Check imported contacts

**Pass Criteria:**
- [ ] CSV file uploads successfully
- [ ] Field mapping works correctly
- [ ] Contacts imported correctly
- [ ] Companies created if new
- [ ] Duplicate detection works

---

### Test 9: Activities Feature (RECENTLY FIXED) ✅
**Priority:** CRITICAL
**Duration:** 10 minutes

**Steps:**
1. Navigate to any contact detail page
2. Click "Activities" tab
3. Create new activity
4. Verify activity appears in list
5. Check API response

**Pass Criteria:**
- [ ] Activities tab loads without 404
- [ ] API endpoint: `/api/activities/contacts/:id` works
- [ ] Activities display correctly
- [ ] Can create new activity
- [ ] Activities are user-isolated

**Known Issue (FIXED):**
- ✅ Was: GET /api/contacts/:id/activities → 404
- ✅ Now: GET /api/activities/contacts/:id → 200

---

### Test 10: Contact Form from Company Page (RECENTLY FIXED) ✅
**Priority:** CRITICAL
**Duration:** 10 minutes

**Steps:**
1. Navigate to company detail page
2. Click "Add Contact" button
3. Fill contact form
4. Submit
5. Verify contact created

**Pass Criteria:**
- [ ] Form opens with company pre-selected
- [ ] Submit uses POST (not PUT /contacts/new)
- [ ] Contact created successfully
- [ ] Contact appears on company page

**Known Issue (FIXED):**
- ✅ Was: PUT /api/contacts/new → 404
- ✅ Now: POST /api/contacts → 201

---

### Test 11: Company Navigation (RECENTLY FIXED) ✅
**Priority:** HIGH
**Duration:** 5 minutes

**Steps:**
1. Navigate to companies list
2. Click on any company
3. Check URL
4. Verify company details load

**Pass Criteria:**
- [ ] URL uses company ID (not domain)
- [ ] URL format: `/companies/:id`
- [ ] Company details load correctly
- [ ] No 404 errors

**Known Issue (FIXED):**
- ✅ Was: Using company.domain in URL → 404
- ✅ Now: Using company.id in URL → 200

---

### Test 12: Search & Filtering ✅
**Priority:** MEDIUM
**Duration:** 10 minutes

**Test Search:**
1. Create contacts with known names
2. Search for specific name
3. Verify results

**Test Filtering:**
1. Filter by status (LEAD, PROSPECT, CUSTOMER)
2. Verify filtered results
3. Test multiple filters

**Pass Criteria:**
- [ ] Search returns correct results
- [ ] Filters work correctly
- [ ] Pagination works
- [ ] Empty results handled gracefully

---

### Test 13: Pagination ✅
**Priority:** MEDIUM
**Duration:** 10 minutes

**Setup:** Create 50+ contacts (or use CSV import)

**Steps:**
1. Navigate to contacts list
2. Verify pagination controls
3. Click "Next Page"
4. Verify URL updates (?page=2)
5. Verify different contacts load

**Pass Criteria:**
- [ ] Pagination controls visible
- [ ] Page navigation works
- [ ] URL reflects current page
- [ ] Correct number of items per page
- [ ] Total count displayed correctly

---

## 🔒 SECURITY TESTS (4-8 Hours)

### Test 14: Unauthorized Access Attempts ✅
**Priority:** CRITICAL
**Duration:** 15 minutes

```bash
# 1. No auth token
curl https://api-sandbox.brandmonkz.com/api/contacts
# Expected: 401 Unauthorized

# 2. Invalid token
curl -H "Authorization: Bearer invalid_token" \
  https://api-sandbox.brandmonkz.com/api/contacts
# Expected: 401 Unauthorized

# 3. Expired token
# (Use token from localStorage, wait 7 days, test again)
# Expected: 401 Unauthorized
```

**Pass Criteria:**
- [ ] All requests without token return 401
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Error messages don't leak info

---

### Test 15: Input Validation ✅
**Priority:** HIGH
**Duration:** 15 minutes

**Test SQL Injection:**
```javascript
// Attempt SQL injection in search
fetch('https://api-sandbox.brandmonkz.com/api/contacts?search=' +
  encodeURIComponent("'; DROP TABLE contacts; --"), {
  headers: { 'Authorization': 'Bearer ' + token }
})
```
**Expected:** ✅ No SQL executed, safe search

**Test XSS:**
```javascript
// Attempt XSS in contact name
fetch('https://api-sandbox.brandmonkz.com/api/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    firstName: '<script>alert("XSS")</script>',
    lastName: 'Test',
    status: 'LEAD'
  })
})
```
**Expected:** ✅ Script tags escaped, no execution

**Pass Criteria:**
- [ ] SQL injection blocked
- [ ] XSS attempts sanitized
- [ ] Email validation works
- [ ] Required fields enforced

---

### Test 16: File Upload Security ✅
**Priority:** HIGH
**Duration:** 10 minutes

**Test File Size Limit:**
1. Try uploading >10MB CSV
2. Verify rejection

**Test File Type:**
1. Try uploading .exe or .sh file
2. Verify rejection

**Pass Criteria:**
- [ ] 10MB limit enforced
- [ ] Only CSV files accepted
- [ ] Malformed CSV handled gracefully
- [ ] No server errors from bad files

---

## 📈 PERFORMANCE TESTS (8-24 Hours)

### Test 17: Load Testing ✅
**Priority:** MEDIUM
**Duration:** 1 hour

**Using Apache Bench or similar:**
```bash
# 1000 requests, 10 concurrent
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" \
  https://api-sandbox.brandmonkz.com/api/contacts

# Check results:
# - Requests per second
# - Average response time
# - Failed requests (should be 0)
```

**Pass Criteria:**
- [ ] >100 req/sec sustained
- [ ] Average response <100ms
- [ ] 0% error rate
- [ ] No memory leaks

---

### Test 18: Database Performance ✅
**Priority:** MEDIUM
**Duration:** 30 minutes

**Large Dataset Tests:**
1. Import 10,000 contacts via CSV
2. Test search performance
3. Test pagination
4. Monitor query times

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Pass Criteria:**
- [ ] Queries <50ms with 10k records
- [ ] Search remains fast
- [ ] Pagination works smoothly
- [ ] No N+1 query issues

---

### Test 19: Concurrent Users ✅
**Priority:** MEDIUM
**Duration:** 30 minutes

**Simulate 50 concurrent users:**
1. Use load testing tool
2. Each user:
   - Logs in
   - Creates contact
   - Searches contacts
   - Creates company
3. Monitor server resources

**Pass Criteria:**
- [ ] All users can work simultaneously
- [ ] No race conditions
- [ ] Data consistency maintained
- [ ] Server resources stable

---

## 🐛 EDGE CASE TESTS (24-48 Hours)

### Test 20: Duplicate Detection ✅
**Priority:** HIGH
**Duration:** 15 minutes

**Test Cases:**
1. Create contact with email: test@example.com
2. Try creating another with same email
3. Verify rejection with clear error

**Pass Criteria:**
- [ ] Duplicate email rejected
- [ ] Error: "Email already exists"
- [ ] HTTP 409 (Conflict)
- [ ] User-friendly error message

---

### Test 21: Soft Delete Verification ✅
**Priority:** MEDIUM
**Duration:** 10 minutes

**Steps:**
1. Create contact
2. Delete contact
3. Verify not in list
4. Check database (should have isActive=false)

```sql
SELECT id, firstName, isActive
FROM "Contact"
WHERE email = 'test@example.com';
```

**Pass Criteria:**
- [ ] Contact removed from UI
- [ ] isActive set to false in DB
- [ ] Contact not permanently deleted
- [ ] Can restore if needed

---

### Test 22: Network Interruption ✅
**Priority:** MEDIUM
**Duration:** 15 minutes

**Simulated Failures:**
1. Start creating contact
2. Disconnect internet mid-request
3. Reconnect
4. Check error handling

**Pass Criteria:**
- [ ] User sees error message
- [ ] Can retry operation
- [ ] No data corruption
- [ ] Graceful failure

---

## 📊 48-HOUR MONITORING CHECKLIST

### Day 1 (0-24 Hours)
- [ ] Monitor PM2 logs every 2 hours
- [ ] Check for 404 errors
- [ ] Verify all 3 bug fixes working
- [ ] Test with 10+ users
- [ ] Monitor API response times
- [ ] Check memory/CPU usage
- [ ] Review security logs

### Day 2 (24-48 Hours)
- [ ] Analyze accumulated logs
- [ ] Review error patterns
- [ ] Check for security incidents
- [ ] Verify data integrity
- [ ] Test edge cases
- [ ] Prepare production plan

---

## 🚨 ISSUES TO MONITOR

### Known Acceptable Risks
1. **xlsx Vulnerabilities** (2 remaining)
   - Monitor for Excel import usage
   - No exploits expected (requires auth)
   - Plan to replace before production

### Critical Metrics
- **Error Rate:** Should be <0.1%
- **Response Time:** Should be <100ms
- **Uptime:** Should be >99.9%
- **404 Errors:** Should be 0

---

## 📝 TEST RESULTS TEMPLATE

```markdown
## Test Results - [Date]

### Immediate Tests (✅/❌)
- [ ] Health Check
- [ ] Authentication
- [ ] CRUD Operations
- [ ] Data Isolation
- [ ] CORS
- [ ] Rate Limiting
- [ ] Security Headers

### Functional Tests (✅/❌)
- [ ] CSV Import
- [ ] Activities Feature
- [ ] Contact Form from Company
- [ ] Company Navigation
- [ ] Search & Filter
- [ ] Pagination

### Security Tests (✅/❌)
- [ ] Unauthorized Access
- [ ] Input Validation
- [ ] File Upload Security

### Performance Tests (✅/❌)
- [ ] Load Testing
- [ ] Database Performance
- [ ] Concurrent Users

### Issues Found
1. [Issue description]
   - Severity: [HIGH/MEDIUM/LOW]
   - Status: [FIXED/IN PROGRESS/PENDING]

### Overall Status
- Tests Passed: X/Y
- Critical Issues: X
- Deployment Status: [APPROVED/NEEDS REVIEW]
```

---

**Test Plan Version:** 1.0
**Last Updated:** 2025-10-09
**Maintained By:** QA Team
