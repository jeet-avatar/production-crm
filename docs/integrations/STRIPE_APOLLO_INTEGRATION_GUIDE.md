# Stripe + Apollo.io Integration Guide

## Quick Setup Summary

### 1. Environment Variables Needed

Add to `.env`:
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...

# Apollo.io
APOLLO_API_KEY=your_apollo_api_key
```

### 2. Database Schema Addition

Add to `prisma/schema.prisma`:

```prisma
enum SubscriptionPlan {
  TRIAL
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  UNPAID
  TRIALING
}

model Subscription {
  id                String             @id @default(cuid())
  userId            String             @unique
  user              User               @relation(fields: [userId], references: [id])

  plan              SubscriptionPlan   @default(TRIAL)
  status            SubscriptionStatus @default(TRIALING)

  stripeCustomerId      String?        @unique
  stripeSubscriptionId  String?        @unique
  stripePriceId         String?

  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean        @default(false)

  // Usage limits
  contactsLimit         Int            @default(1000)
  emailsLimit           Int            @default(1000)
  aiGenerationsLimit    Int            @default(0)
  smsLimit              Int            @default(0)

  // Usage tracking
  contactsUsed          Int            @default(0)
  emailsUsed            Int            @default(0)
  aiGenerationsUsed     Int            @default(0)
  smsUsed               Int            @default(0)

  trialEndsAt           DateTime?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@index([userId])
  @@index([stripeCustomerId])
}

model UsageLog {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])

  resourceType   String   // email, sms, ai_generation, contact
  amount         Int      @default(1)
  metadata       Json?

  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
  @@index([resourceType])
}
```

### 3. Stripe Products Setup (Stripe Dashboard)

Create in https://dashboard.stripe.com/test/products:

#### Starter Plan
- **Product**: CRM Starter
- **Monthly Price**: $29/month (recurring)
- **Annual Price**: $290/year (recurring)

#### Professional Plan
- **Product**: CRM Professional
- **Monthly Price**: $99/month (recurring)
- **Annual Price**: $990/year (recurring)

#### Enterprise Plan
- **Product**: CRM Enterprise
- **Monthly Price**: $299/month (recurring)
- **Annual Price**: $2,990/year (recurring)

### 4. Key Files to Create

#### A. Stripe Service (`src/services/stripe.ts`)
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    metadata: { userId },
  });

  return session;
}

export async function createCustomerPortal(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/settings/billing`,
  });

  return session;
}
```

#### B. Apollo.io Service (`src/services/apollo.ts`)
```typescript
import axios from 'axios';

const apolloClient = axios.create({
  baseURL: 'https://api.apollo.io/v1',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
});

export async function enrichContact(email: string) {
  const response = await apolloClient.post('/people/match', {
    api_key: process.env.APOLLO_API_KEY,
    email,
  });

  return response.data.person;
}

export async function enrichCompany(domain: string) {
  const response = await apolloClient.post('/organizations/enrich', {
    api_key: process.env.APOLLO_API_KEY,
    domain,
  });

  return response.data.organization;
}

export async function searchPeople(filters: any) {
  const response = await apolloClient.post('/mixed_people/search', {
    api_key: process.env.APOLLO_API_KEY,
    ...filters,
  });

  return response.data.people;
}
```

#### C. Subscription Routes (`src/routes/subscriptions.ts`)
```typescript
// POST /api/subscriptions/checkout
// POST /api/subscriptions/portal
// POST /api/subscriptions/webhook (Stripe webhooks)
// GET  /api/subscriptions/usage
// POST /api/subscriptions/cancel
```

#### D. Usage Tracking Middleware (`src/middleware/usageTracking.ts`)
```typescript
export async function trackEmailUsage(req, res, next) {
  const subscription = await getSubscription(req.user.id);

  if (subscription.emailsUsed >= subscription.emailsLimit) {
    return res.status(403).json({
      error: 'Email limit reached. Please upgrade your plan.'
    });
  }

  await incrementUsage(subscription.id, 'emailsUsed');
  next();
}
```

### 5. API Endpoints

```
POST   /api/subscriptions/checkout          # Create Stripe checkout
POST   /api/subscriptions/portal            # Customer portal
POST   /api/subscriptions/webhook           # Stripe webhooks
GET    /api/subscriptions/current           # Current subscription
GET    /api/subscriptions/usage             # Usage stats
POST   /api/subscriptions/cancel            # Cancel subscription
POST   /api/subscriptions/upgrade           # Upgrade plan

POST   /api/apollo/enrich-contact           # Enrich contact data
POST   /api/apollo/enrich-company           # Enrich company data
POST   /api/apollo/search                   # Search leads
```

### 6. Stripe Webhooks

Handle these events in `/api/subscriptions/webhook`:

- `checkout.session.completed` - Create subscription
- `customer.subscription.updated` - Update subscription
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Renew subscription
- `invoice.payment_failed` - Handle failed payment

### 7. Plan Limits Configuration

```typescript
export const PLAN_LIMITS = {
  TRIAL: {
    contacts: 100,
    emails: 500,
    aiGenerations: 10,
    sms: 0,
    users: 1,
  },
  STARTER: {
    contacts: 1000,
    emails: 1000,
    aiGenerations: 0,
    sms: 0,
    users: 1,
  },
  PROFESSIONAL: {
    contacts: 10000,
    emails: 10000,
    aiGenerations: 100,
    sms: 500,
    users: 5,
  },
  ENTERPRISE: {
    contacts: -1, // unlimited
    emails: 50000,
    aiGenerations: -1, // unlimited
    sms: -1, // unlimited
    users: -1, // unlimited
  },
};
```

### 8. Frontend Pricing Page

Create React component at `src/pages/Pricing.tsx`:

```tsx
const plans = [
  {
    name: 'Starter',
    price: 29,
    priceId: process.env.REACT_APP_STRIPE_PRICE_STARTER_MONTHLY,
    features: ['1,000 contacts', '1,000 emails/month', '1 user'],
  },
  {
    name: 'Professional',
    price: 99,
    priceId: process.env.REACT_APP_STRIPE_PRICE_PRO_MONTHLY,
    features: ['10,000 contacts', '10,000 emails/month', '5 users', 'AI features'],
  },
  {
    name: 'Enterprise',
    price: 299,
    priceId: process.env.REACT_APP_STRIPE_PRICE_ENTERPRISE_MONTHLY,
    features: ['Unlimited contacts', '50,000 emails/month', 'Unlimited users', 'Unlimited AI'],
  },
];

async function handleSubscribe(priceId) {
  const { sessionId } = await fetch('/api/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  }).then(r => r.json());

  const stripe = await loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
  stripe.redirectToCheckout({ sessionId });
}
```

### 9. Implementation Steps

1. **Set up Stripe:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Create products and prices in dashboard
# Copy price IDs to .env
```

2. **Set up Apollo.io:**
```bash
# Get API key from https://app.apollo.io/#/settings/integrations/api
# Add to .env
```

3. **Run database migration:**
```bash
npx prisma migrate dev --name add_subscriptions
npx prisma generate
```

4. **Test Stripe webhook locally:**
```bash
stripe listen --forward-to localhost:3000/api/subscriptions/webhook
```

5. **Test checkout flow:**
- Visit `/pricing`
- Click "Subscribe"
- Use test card: `4242 4242 4242 4242`
- Verify subscription created

### 10. Apollo.io Integration Examples

#### Enrich Contact on Creation:
```typescript
// In contact creation route
const enrichedData = await enrichContact(contact.email);

await prisma.contact.update({
  where: { id: contact.id },
  data: {
    jobTitle: enrichedData.title,
    linkedinUrl: enrichedData.linkedin_url,
    city: enrichedData.city,
    country: enrichedData.country,
  },
});
```

#### Search for Leads:
```typescript
const leads = await searchPeople({
  person_titles: ['CEO', 'CTO', 'Founder'],
  organization_num_employees_ranges: ['11-50', '51-200'],
  person_locations: ['United States'],
  per_page: 25,
});
```

### 11. Usage Tracking Example

```typescript
// Before sending email
await trackUsage(req.user.id, 'email', 1);

// Before AI generation
await trackUsage(req.user.id, 'ai_generation', 1);

// Check limits
const canSendEmail = await checkLimit(req.user.id, 'email');
if (!canSendEmail) {
  throw new Error('Email limit reached');
}
```

### 12. Testing

```bash
# Test Stripe checkout
curl -X POST http://localhost:3000/api/subscriptions/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"priceId": "price_..."}'

# Test Apollo enrichment
curl -X POST http://localhost:3000/api/apollo/enrich-contact \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email": "test@example.com"}'

# Check usage
curl http://localhost:3000/api/subscriptions/usage \
  -H "Authorization: Bearer $TOKEN"
```

---

## Summary

This integration provides:
- ✅ Stripe subscription management
- ✅ Usage-based billing
- ✅ Plan limits enforcement
- ✅ Apollo.io lead enrichment
- ✅ Complete checkout flow
- ✅ Customer portal for managing billing

**Full implementation**: ~2-3 hours
**Files to create**: 8-10 files
**Database changes**: 2 new models

Ready to implement? Let me know and I'll build it step by step!
