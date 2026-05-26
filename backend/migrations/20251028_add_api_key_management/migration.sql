-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('LIVE', 'TEST', 'SECRET');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApiProduct" AS ENUM ('LEAD_DISCOVERY', 'AI_CONTENT', 'VIDEO_CAMPAIGN', 'EMAIL_INTELLIGENCE', 'ENRICHMENT', 'CRM_OPERATIONS', 'INTEGRATION', 'ALL_PRODUCTS');

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyType" "ApiKeyType" NOT NULL DEFAULT 'LIVE',
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" JSONB NOT NULL,
    "products" JSONB NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 20,
    "burstLimit" INTEGER NOT NULL DEFAULT 50,
    "dailyLimit" INTEGER NOT NULL DEFAULT 10000,
    "ipWhitelist" JSONB,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "environment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_usage" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "product" "ApiProduct" NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "leadCredits" INTEGER NOT NULL DEFAULT 0,
    "aiRequests" INTEGER NOT NULL DEFAULT 0,
    "videoCredits" INTEGER NOT NULL DEFAULT 0,
    "emailCredits" INTEGER NOT NULL DEFAULT 0,
    "enrichmentCredits" INTEGER NOT NULL DEFAULT 0,
    "crmApiCalls" INTEGER NOT NULL DEFAULT 0,
    "integrationCalls" INTEGER NOT NULL DEFAULT 0,
    "usedLeadCredits" INTEGER NOT NULL DEFAULT 0,
    "usedAiRequests" INTEGER NOT NULL DEFAULT 0,
    "usedVideoCredits" INTEGER NOT NULL DEFAULT 0,
    "usedEmailCredits" INTEGER NOT NULL DEFAULT 0,
    "usedEnrichmentCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCrmApiCalls" INTEGER NOT NULL DEFAULT 0,
    "usedIntegrationCalls" INTEGER NOT NULL DEFAULT 0,
    "billingCycle" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "api_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhooks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 60,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "successfulDeliveries" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "responseTime" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "api_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyPrefix_key" ON "api_keys"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- CreateIndex
CREATE INDEX "api_keys_keyType_idx" ON "api_keys"("keyType");

-- CreateIndex
CREATE INDEX "api_keys_createdAt_idx" ON "api_keys"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_usage_requestId_key" ON "api_key_usage"("requestId");

-- CreateIndex
CREATE INDEX "api_key_usage_apiKeyId_idx" ON "api_key_usage"("apiKeyId");

-- CreateIndex
CREATE INDEX "api_key_usage_timestamp_idx" ON "api_key_usage"("timestamp");

-- CreateIndex
CREATE INDEX "api_key_usage_date_idx" ON "api_key_usage"("date");

-- CreateIndex
CREATE INDEX "api_key_usage_product_idx" ON "api_key_usage"("product");

-- CreateIndex
CREATE INDEX "api_key_usage_statusCode_idx" ON "api_key_usage"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "api_subscriptions_userId_key" ON "api_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_subscriptions_stripeCustomerId_key" ON "api_subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "api_subscriptions_stripeSubscriptionId_key" ON "api_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "api_subscriptions_userId_idx" ON "api_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "api_subscriptions_status_idx" ON "api_subscriptions"("status");

-- CreateIndex
CREATE INDEX "api_subscriptions_currentPeriodEnd_idx" ON "api_subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "api_webhooks_userId_idx" ON "api_webhooks"("userId");

-- CreateIndex
CREATE INDEX "api_webhooks_isActive_idx" ON "api_webhooks"("isActive");

-- CreateIndex
CREATE INDEX "api_webhook_deliveries_webhookId_idx" ON "api_webhook_deliveries"("webhookId");

-- CreateIndex
CREATE INDEX "api_webhook_deliveries_status_idx" ON "api_webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "api_webhook_deliveries_createdAt_idx" ON "api_webhook_deliveries"("createdAt");

-- CreateIndex
CREATE INDEX "api_webhook_deliveries_nextRetryAt_idx" ON "api_webhook_deliveries"("nextRetryAt");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_usage" ADD CONSTRAINT "api_key_usage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_webhooks" ADD CONSTRAINT "api_webhooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_webhook_deliveries" ADD CONSTRAINT "api_webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "api_webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
