# Code Quality Issues - Fix Guide

**Date**: October 10, 2025
**Source**: SonarQube / ESLint Analysis
**Total Issues**: ~90 code smells
**Estimated Fix Time**: ~4-6 hours

---

## 📊 Issue Summary

| Severity | Count | Priority | Effort |
|----------|-------|----------|--------|
| **Blocker** | 1 | 🔴 Critical | 30 min |
| **Critical** | 5 | 🟠 High | 2h 50min |
| **Major** | 22 | 🟡 Medium | 2h |
| **Minor** | 56 | 🔵 Low | 3h |
| **Info** | 6 | ⚪ Optional | 0 min |

---

## 🔴 BLOCKER Issues (Fix Immediately)

### 1. Open Redirect Vulnerability - `src/routes/emailTracking.js:297`

**Issue**: Change this code to not perform redirects based on user-controlled data
**Severity**: 🔴 BLOCKER
**CWE**: CWE-601 (Open Redirect)
**Effort**: 30 minutes

**Current Code** (Line 297):
```javascript
res.redirect(redirectUrl);
```

**Problem**: Unvalidated redirect can lead to phishing attacks

**Fix**:
```javascript
// Add URL validation before redirect
const validateRedirectUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const allowedDomains = [
      'brandmonkz.com',
      'sandbox.brandmonkz.com',
      process.env.FRONTEND_URL
    ];
    return allowedDomains.some(domain =>
      parsed.hostname.endsWith(domain)
    );
  } catch {
    return false;
  }
};

// Use validation
if (validateRedirectUrl(redirectUrl)) {
  res.redirect(redirectUrl);
} else {
  res.redirect(`${process.env.FRONTEND_URL}/campaigns`);
}
```

---

## 🟠 CRITICAL Issues (Fix This Week)

### 1. High Cognitive Complexity - `src/routes/contacts.ts:363`

**Issue**: Refactor this function to reduce Cognitive Complexity from 152 to 15
**Severity**: 🔴 CRITICAL
**Effort**: 2h 22min
**Impact**: Maintainability, readability

**Problem**: CSV import function is too complex (152 vs allowed 15)

**Fix Strategy**:
```typescript
// BEFORE: One massive function with 152 complexity

// AFTER: Break into smaller functions
async function processCSVImport(req: Request, res: Response) {
  const csvData = await parseCSVFile(req.file);
  const mappedData = await mapCSVFields(csvData, req.body.mapping);
  const validatedData = await validateCSVData(mappedData);
  const results = await importContactsToDatabase(validatedData);
  return res.json(results);
}

// Extract logic into separate functions:
function parseCSVFile(file: any) { /* ... */ }
function mapCSVFields(data: any[], mapping: any) { /* ... */ }
function validateCSVData(data: any[]) { /* ... */ }
function importContactsToDatabase(data: any[]) { /* ... */ }
```

**Steps**:
1. Extract field mapping logic → `mapCSVFields()`
2. Extract validation logic → `validateCSVData()`
3. Extract deduplication logic → `deduplicateContacts()`
4. Extract company creation → `createCompanyIfNeeded()`
5. Extract contact creation → `createContactRecord()`

---

### 2. High Cognitive Complexity - `src/routes/contacts.ts:334`

**Issue**: Refactor function to reduce Cognitive Complexity from 21 to 15
**Severity**: 🔴 CRITICAL
**Effort**: 11 minutes

**Fix**: Extract nested logic into helper functions

---

### 3. High Cognitive Complexity - `src/routes/csvImport.ts:146`

**Issue**: Reduce Cognitive Complexity from 17 to 15
**Severity**: 🔴 CRITICAL
**Effort**: 7 minutes

---

### 4. High Cognitive Complexity - `src/routes/positions.ts:137`

**Issue**: Reduce Cognitive Complexity from 20 to 15
**Severity**: 🔴 CRITICAL
**Effort**: 10 minutes

---

### 5. URL Construction from User Data - `src/services/godaddy.ts:105`

**Issue**: Don't construct URL from user-controlled data
**Severity**: 🟠 MAJOR
**CWE**: CWE-918 (SSRF)
**Effort**: 30 minutes

**Fix**: Validate and sanitize domain input before URL construction

---

## 🟡 MAJOR Issues (Fix This Month)

### 1. Use ES2015+ Modern JavaScript (56 instances)

**Common Patterns to Fix**:

#### Pattern 1: `parseInt` → `Number.parseInt` (22 instances)
```typescript
// BEFORE
const page = parseInt(query.page);
const limit = parseInt(query.limit);

// AFTER
const page = Number.parseInt(query.page, 10);
const limit = Number.parseInt(query.limit, 10);
```

**Files Affected**:
- `src/routes/companies.ts:24,25`
- `src/routes/contacts.ts:34,35`
- `src/routes/deals.ts:26,27`
- `src/routes/pricing.ts:31,32,58,59,85,86`
- `src/routes/subscriptions.ts:105`
- `src/routes/emailServers.ts:70,76,77`
- `src/utils/auth.ts:14`

**Bulk Fix Script**:
```bash
# Find and replace
find src -name "*.ts" -type f -exec sed -i '' 's/parseInt(/Number.parseInt(/g' {} +
```

---

#### Pattern 2: `parseFloat` → `Number.parseFloat` (2 instances)
```typescript
// BEFORE
const amount = parseFloat(req.body.amount);

// AFTER
const amount = Number.parseFloat(req.body.amount);
```

**Files**: `src/routes/deals.ts:157,228`

---

#### Pattern 3: `isNaN` → `Number.isNaN` (1 instance)
```typescript
// BEFORE
if (isNaN(value)) { ... }

// AFTER
if (Number.isNaN(value)) { ... }
```

**File**: `src/routes/contacts.ts:420`

---

### 2. Use Optional Chaining (8 instances)

```typescript
// BEFORE
const name = contact && contact.name ? contact.name : 'Unknown';

// AFTER
const name = contact?.name ?? 'Unknown';
```

**Files Affected**:
- `src/routes/contacts.ts:153,157,166,167,168,437`
- `src/routes/csvImport.ts:97`

**Example Fix**:
```typescript
// Line 153
// BEFORE
if (contact && contact.company) { ... }

// AFTER
if (contact?.company) { ... }
```

---

### 3. Use `for...of` Instead of `.forEach()` (12 instances)

```typescript
// BEFORE
items.forEach((item) => {
  process(item);
});

// AFTER
for (const item of items) {
  process(item);
}
```

**Why**: Better performance, can use `break`/`continue`

**Files Affected**:
- `src/routes/contacts.ts:334,569,577,595,601,611,629,635,643`
- `src/services/godaddy.ts:366`

---

### 4. Use `String.replaceAll()` (5 instances)

```typescript
// BEFORE
const cleaned = text.replace(/\s/g, '');

// AFTER
const cleaned = text.replaceAll(' ', '');
```

**Files**:
- `src/routes/contacts.ts:335,475,603,648`
- `src/services/aiEnrichment.ts:91,126`

---

### 5. Use `RegExp.exec()` Instead of `String.match()` (17 instances)

```typescript
// BEFORE
const match = text.match(/pattern/);

// AFTER
const regex = /pattern/;
const match = regex.exec(text);
```

**Files**: `src/routes/contacts.ts:337-356` (CSV parsing logic)

---

### 6. Remove Useless Assignments (4 instances)

```typescript
// BEFORE
const contact = await prisma.contact.create(data);
return res.json({ success: true }); // contact never used

// AFTER
await prisma.contact.create(data);
return res.json({ success: true });
```

**Files**:
- `src/routes/contacts.ts:245`
- `src/routes/positions.ts:309`
- `src/services/godaddy.ts:105,127`

---

### 7. Remove Unnecessary Type Assertions (3 instances)

```typescript
// BEFORE
emailMap.get(key)!.push(contact);

// AFTER
const emails = emailMap.get(key);
if (emails) {
  emails.push(contact);
}
```

**Files**: `src/routes/contacts.ts:573,606,639`

---

### 8. Use Node.js Protocol Imports (4 instances)

```typescript
// BEFORE
import fs from 'fs';
import crypto from 'crypto';
import stream from 'stream';

// AFTER
import fs from 'node:fs';
import crypto from 'node:crypto';
import stream from 'node:stream';
```

**Files**:
- `src/routes/csvImport.ts:9`
- `src/routes/emailServers.ts:4`
- `src/services/awsS3.ts:4`

---

### 9. Mark Members as `readonly` (5 instances)

```typescript
// BEFORE
class EmailService {
  private transporter: any;
}

// AFTER
class EmailService {
  private readonly transporter: any;
}
```

**Files**:
- `src/services/emailService.ts:5`
- `src/services/godaddy.ts:8,9,10,11`

---

### 10. Extract Nested Ternary (1 instance)

```typescript
// BEFORE
const value = a ? b : c ? d : e;

// AFTER
const value = a ? b : (c ? d : e);
// Or better:
let value;
if (a) {
  value = b;
} else if (c) {
  value = d;
} else {
  value = e;
}
```

**File**: `src/routes/contacts.ts:474`

---

### 11. Prefer Default Parameters (1 instance)

```typescript
// BEFORE
function process(limit) {
  limit = limit || 10;
}

// AFTER
function process(limit = 10) {
  // limit is already 10 if not provided
}
```

**File**: `src/services/godaddy.ts:193`

---

### 12. Top-Level Await (1 instance)

```typescript
// BEFORE (src/server.ts:71)
async function startServer() {
  await db.connect();
  app.listen(PORT);
}
startServer();

// AFTER
await db.connect();
app.listen(PORT);
```

**File**: `src/server.ts:71`

---

## 🔵 MINOR Issues

### 1. Remove Commented Code (1 instance)

**File**: `src/routes/enrichment.ts:57`

```typescript
// BEFORE
// const oldCode = something();
const newCode = somethingElse();

// AFTER
const newCode = somethingElse();
```

---

### 2. Fix Negated Conditions (1 instance)

**File**: `src/routes/positions.ts:120`

```typescript
// BEFORE
if (!valid) {
  // handle invalid
} else {
  // handle valid
}

// AFTER
if (valid) {
  // handle valid
} else {
  // handle invalid
}
```

---

### 3. Remove Unreachable Code (1 instance)

**File**: `src/routes/enrichment.ts:64`

```typescript
// BEFORE
return result;
console.log('This will never execute'); // Unreachable

// AFTER
return result;
```

---

### 4. Handle Exceptions (1 instance)

**File**: `src/utils/auth.ts:42`

```typescript
// BEFORE
try {
  verify(token);
} catch (error) {
  // Empty catch - bad!
}

// AFTER
try {
  verify(token);
} catch (error) {
  logger.error('Token verification failed', error);
  throw new UnauthorizedError('Invalid token');
}
```

---

## ⚪ INFO Issues (Optional)

### TODO Comments (6 instances)

**Files**:
- `src/routes/emailComposer.ts:194`
- `src/routes/enrichment.ts:31`
- `src/routes/pricing.ts:135`
- `src/routes/users.ts:14`
- `src/services/emailService.ts:49,59`

**Action**: Create GitHub issues for each TODO and remove comments

```bash
# Example
# TODO: Add rate limiting
# Becomes GitHub Issue #123: "Add rate limiting to email composer"
```

---

## 🚀 Automated Fix Script

Save this as `scripts/fix-code-quality.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing code quality issues..."

cd "/Users/jeet/Documents/CRM Module"

# 1. Fix parseInt → Number.parseInt
echo "1. Fixing parseInt..."
find src -name "*.ts" -type f -exec sed -i '' 's/parseInt(/Number.parseInt(/g' {} +

# 2. Fix parseFloat → Number.parseFloat
echo "2. Fixing parseFloat..."
find src -name "*.ts" -type f -exec sed -i '' 's/parseFloat(/Number.parseFloat(/g' {} +

# 3. Fix isNaN → Number.isNaN
echo "3. Fixing isNaN..."
find src -name "*.ts" -type f -exec sed -i '' 's/isNaN(/Number.isNaN(/g' {} +

# 4. Fix node imports
echo "4. Fixing node: protocol imports..."
find src -name "*.ts" -type f -exec sed -i '' "s/from 'fs'/from 'node:fs'/g" {} +
find src -name "*.ts" -type f -exec sed -i '' "s/from 'crypto'/from 'node:crypto'/g" {} +
find src -name "*.ts" -type f -exec sed -i '' "s/from 'stream'/from 'node:stream'/g" {} +

echo "✅ Automated fixes complete!"
echo ""
echo "Manual fixes still needed:"
echo "- Reduce cognitive complexity (5 functions)"
echo "- Fix open redirect vulnerability"
echo "- Add optional chaining (8 instances)"
echo "- Convert forEach to for...of (12 instances)"
echo ""
echo "Run 'npm run lint' to verify"
```

**Usage**:
```bash
chmod +x scripts/fix-code-quality.sh
./scripts/fix-code-quality.sh
```

---

## 📋 Fix Priority & Timeline

### Day 1 (2 hours)
- [ ] Fix BLOCKER: Open redirect vulnerability
- [ ] Run automated fix script
- [ ] Test application

### Day 2 (2 hours)
- [ ] Reduce cognitive complexity (contacts.ts:363) - biggest function
- [ ] Add optional chaining (8 instances)
- [ ] Convert forEach to for...of (12 instances)

### Day 3 (2 hours)
- [ ] Fix remaining cognitive complexity (4 functions)
- [ ] Fix SSRF vulnerability (godaddy.ts)
- [ ] Clean up useless assignments

### Week 2 (1-2 hours)
- [ ] Add readonly modifiers
- [ ] Fix nested ternary
- [ ] Remove commented code
- [ ] Handle exceptions properly

---

## ✅ Testing After Fixes

```bash
# 1. Lint check
npm run lint

# 2. Type check
npm run build

# 3. Run tests
npm run test

# 4. Security scans
npm run semgrep
npm run trivy:critical

# 5. Manual testing
# - Test CSV import
# - Test email tracking redirects
# - Test pagination
# - Test file uploads
```

---

## 📊 Expected Improvement

**Before**:
- Code Quality Score: 75/100
- Technical Debt: 4-6 hours
- Maintainability Rating: B

**After**:
- Code Quality Score: 92/100
- Technical Debt: < 1 hour
- Maintainability Rating: A

---

## 🔗 References

- **ESLint**: https://eslint.org/docs/rules/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **SonarQube**: https://rules.sonarsource.com/typescript
- **Clean Code**: https://github.com/ryanmcdermott/clean-code-javascript

---

**Last Updated**: 2025-10-10
**Priority**: Medium
**Owner**: Development Team
