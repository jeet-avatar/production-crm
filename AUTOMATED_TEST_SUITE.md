# 🧪 AUTOMATED TEST SUITE
## Regression, Concurrency, and Load Testing

**Purpose**: Ensure zero breaking changes and SOX compliance
**Coverage Target**: 100% of critical paths
**Test Types**: Unit, Integration, Regression, Concurrency, Load

---

## 📦 TEST INFRASTRUCTURE SETUP

### **1. Install Testing Dependencies**

```bash
cd /Users/jeet/Documents/production-crm/backend

# Install test frameworks
npm install --save-dev \
  jest \
  @types/jest \
  supertest \
  @types/supertest \
  ts-jest \
  @faker-js/faker \
  artillery \
  k6

# For concurrent testing
npm install --save-dev \
  async \
  p-limit \
  piscina
```

### **2. Configure Jest**

**File: `backend/jest.config.js`**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};
```

### **3. Test Setup File**

**File: `backend/tests/setup.ts`**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting test suite...');

  // Clean test database
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE audit_logs CASCADE`;

  console.log('✅ Test database cleaned');
});

// Global test teardown
afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Test suite completed');
});

// Export test utilities
export const testUtils = {
  createTestUser: async (role: 'OWNER' | 'MEMBER' = 'OWNER') => {
    return await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        firstName: 'Test',
        lastName: 'User',
        teamRole: role,
        emailVerified: true,
        isActive: true,
      },
    });
  },

  generateAuthToken: (userId: string) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },
};
```

---

## 🔄 REGRESSION TEST SUITE

### **Test 1: Authentication Regression**

**File: `backend/tests/regression/auth.test.ts`**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { testUtils } from '../setup';

describe('Authentication Regression Tests', () => {
  describe('Login Flow', () => {
    it('should allow existing users to login', async () => {
      // Create test user
      const user = await testUtils.createTestUser();

      // Attempt login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'testpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle expired tokens', async () => {
      const expiredToken = 'expired.jwt.token';

      const response = await request(app)
        .get('/api/team/members')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Password Change Flow', () => {
    it('should allow users to change password', async () => {
      const user = await testUtils.createTestUser();
      const token = testUtils.generateAuthToken(user.id);

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        });

      expect(response.status).toBe(200);
    });
  });
});
```

### **Test 2: Team System Regression**

**File: `backend/tests/regression/team.test.ts`**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { testUtils } from '../setup';

describe('Team System Regression Tests', () => {
  let ownerUser: any;
  let ownerToken: string;

  beforeEach(async () => {
    ownerUser = await testUtils.createTestUser('OWNER');
    ownerToken = testUtils.generateAuthToken(ownerUser.id);
  });

  describe('Team Invitations', () => {
    it('should allow owner to invite team member', async () => {
      const response = await request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'newmember@example.com',
          firstName: 'New',
          lastName: 'Member',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should prevent duplicate invitations', async () => {
      const inviteData = {
        email: 'duplicate@example.com',
        firstName: 'Duplicate',
        lastName: 'Test',
      };

      // First invitation
      await request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(inviteData);

      // Second invitation (should fail)
      const response = await request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(inviteData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already');
    });

    it('should prevent non-owners from inviting', async () => {
      const memberUser = await testUtils.createTestUser('MEMBER');
      const memberToken = testUtils.generateAuthToken(memberUser.id);

      const response = await request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Team Member Management', () => {
    it('should get team members list', async () => {
      const response = await request(app)
        .get('/api/team/members')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('members');
      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should allow owner to remove member', async () => {
      // Create member
      const member = await testUtils.createTestUser('MEMBER');

      const response = await request(app)
        .delete(`/api/team/members/${member.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent removing self', async () => {
      const response = await request(app)
        .delete(`/api/team/members/${ownerUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
    });
  });
});
```

### **Test 3: Data Isolation Regression**

**File: `backend/tests/regression/data-isolation.test.ts`**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { testUtils } from '../setup';
import { prisma } from '../../src/app';

describe('Data Isolation Regression Tests', () => {
  let owner1: any, owner2: any;
  let owner1Token: string, owner2Token: string;

  beforeEach(async () => {
    owner1 = await testUtils.createTestUser('OWNER');
    owner2 = await testUtils.createTestUser('OWNER');
    owner1Token = testUtils.generateAuthToken(owner1.id);
    owner2Token = testUtils.generateAuthToken(owner2.id);
  });

  it('should prevent users from seeing other users data', async () => {
    // Owner1 creates a contact
    const contact1 = await prisma.contact.create({
      data: {
        email: 'owner1-contact@example.com',
        firstName: 'Owner1',
        lastName: 'Contact',
        userId: owner1.id,
      },
    });

    // Owner2 tries to access Owner1's contact
    const response = await request(app)
        .get(`/api/contacts/${contact1.id}`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(response.status).toBe(404); // Should not find it
  });

  it('should allow owners to see team members data', async () => {
    // Create member under owner1
    const member = await prisma.user.create({
      data: {
        email: 'member@example.com',
        passwordHash: 'hash',
        firstName: 'Team',
        lastName: 'Member',
        teamRole: 'MEMBER',
        accountOwnerId: owner1.id,
        emailVerified: true,
        isActive: true,
      },
    });

    // Member creates contact
    const contact = await prisma.contact.create({
      data: {
        email: 'member-contact@example.com',
        firstName: 'Member',
        lastName: 'Contact',
        userId: member.id,
      },
    });

    // Owner1 should see member's contact
    const response = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${owner1Token}`);

    expect(response.status).toBe(200);
    const contacts = response.body;
    const foundContact = contacts.find((c: any) => c.id === contact.id);
    expect(foundContact).toBeDefined();
  });
});
```

---

## ⚡ CONCURRENCY TEST SUITE

### **Test 4: Concurrent Invitations**

**File: `backend/tests/concurrency/concurrent-invites.test.ts`**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { testUtils } from '../setup';
import pLimit from 'p-limit';

describe('Concurrent Team Invitations', () => {
  let ownerToken: string;

  beforeEach(async () => {
    const owner = await testUtils.createTestUser('OWNER');
    ownerToken = testUtils.generateAuthToken(owner.id);
  });

  it('should handle 100 simultaneous invitations', async () => {
    const limit = pLimit(10); // 10 concurrent requests at a time

    const invitations = Array.from({ length: 100 }, (_, i) => ({
      email: `concurrent-${i}@example.com`,
      firstName: `User${i}`,
      lastName: `Test`,
    }));

    const promises = invitations.map(invite =>
      limit(() =>
        request(app)
          .post('/api/team/invite')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send(invite)
      )
    );

    const results = await Promise.all(promises);

    // All should succeed
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBe(100);

    console.log(`✅ Successfully sent ${successCount}/100 concurrent invitations`);
  });

  it('should prevent duplicate invitations under concurrency', async () => {
    const duplicateEmail = 'duplicate-concurrent@example.com';
    const inviteData = {
      email: duplicateEmail,
      firstName: 'Duplicate',
      lastName: 'Test',
    };

    // Send same invitation 10 times concurrently
    const promises = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(inviteData)
    );

    const results = await Promise.allSettled(promises);

    // Only one should succeed
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 200
    ).length;

    expect(successCount).toBeLessThanOrEqual(1);
    console.log(`✅ Only ${successCount}/10 duplicate invitations succeeded (expected: 1)`);
  });
});
```

### **Test 5: Concurrent Acceptance**

**File: `backend/tests/concurrency/concurrent-acceptance.test.ts`**
```typescript
import request from 'supertest';
import { app } from '../../src/app';
import { testUtils } from '../setup';
import { prisma } from '../../src/app';
import crypto from 'crypto';

describe('Concurrent Invitation Acceptance', () => {
  it('should handle multiple accepts of same token safely', async () => {
    // Create pending invitation
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const user = await prisma.user.create({
      data: {
        email: 'pending@example.com',
        passwordHash: 'temp',
        firstName: 'Pending',
        lastName: 'User',
        teamRole: 'MEMBER',
        inviteToken,
        isActive: false,
        emailVerified: false,
      },
    });

    // Try to accept 5 times concurrently
    const promises = Array.from({ length: 5 }, () =>
      request(app)
        .post('/api/team/accept-invite')
        .send({
          token: inviteToken,
          password: 'newpassword123',
        })
    );

    const results = await Promise.allSettled(promises);

    // Only one should succeed
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 200
    ).length;

    expect(successCount).toBe(1);
    console.log(`✅ Only ${successCount}/5 concurrent accepts succeeded`);
  });
});
```

---

## 📊 LOAD TESTING

### **Test 6: Load Test with Artillery**

**File: `backend/tests/load/artillery-config.yml`**
```yaml
config:
  target: "https://brandmonkz.com"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/second
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 requests/second
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100 # 100 requests/second
      name: "Peak load"
  processor: "./load-test-processor.js"

scenarios:
  - name: "Team Invitation Flow"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "{{ $randomEmail() }}"
            password: "testpassword123"
          capture:
            - json: "$.token"
              as: "token"
      - post:
          url: "/api/team/invite"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            email: "{{ $randomEmail() }}"
            firstName: "{{ $randomString() }}"
            lastName: "{{ $randomString() }}"

  - name: "Get Team Members"
    weight: 50
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "owner@example.com"
            password: "testpassword123"
          capture:
            - json: "$.token"
              as: "token"
      - get:
          url: "/api/team/members"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Accept Invitation"
    weight: 20
    flow:
      - post:
          url: "/api/team/accept-invite"
          json:
            token: "{{ $randomString() }}"
            password: "testpassword123"
```

**Run load test**:
```bash
cd backend/tests/load
artillery run artillery-config.yml --output report.json
artillery report report.json
```

---

## 🏃 RUNNING ALL TESTS

### **Create Test Scripts**

**File: `backend/package.json`** (add scripts):
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:regression": "jest tests/regression",
    "test:concurrency": "jest tests/concurrency",
    "test:load": "artillery run tests/load/artillery-config.yml",
    "test:all": "npm run test:regression && npm run test:concurrency && npm run test:load"
  }
}
```

### **Run Complete Test Suite**

```bash
# Run all tests
npm run test:all

# Expected output:
# ✅ Regression Tests: 25/25 passed
# ✅ Concurrency Tests: 10/10 passed
# ✅ Load Tests: 95th percentile < 500ms
# ✅ Overall: 100% pass rate
```

---

## 📈 CONTINUOUS INTEGRATION

### **GitHub Actions Workflow**

**File: `.github/workflows/test.yml`**
```yaml
name: Automated Tests

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run regression tests
        run: npm run test:regression
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

      - name: Run concurrency tests
        run: npm run test:concurrency
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## ✅ TEST EXECUTION CHECKLIST

**Before Production Deployment**:
- [ ] All regression tests pass (100%)
- [ ] All concurrency tests pass (100%)
- [ ] Load test: 95th percentile < 500ms
- [ ] Load test: Error rate < 1%
- [ ] Code coverage > 80%
- [ ] No memory leaks detected
- [ ] Database connection pool stable
- [ ] All SOX audit logs working

**Sign-off Required**:
- [ ] QA Team
- [ ] Security Team
- [ ] Engineering Lead
- [ ] Product Owner

---

## 🎯 NEXT: Create Staging Environment

Once tests are passing, proceed to:
1. ✅ Staging environment setup
2. ✅ SOX audit logging
3. ✅ Zero-downtime deployment

**Ready to proceed?**
