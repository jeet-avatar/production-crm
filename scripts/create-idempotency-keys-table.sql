-- Migration: Create idempotency_keys table
-- Purpose: Enable idempotency middleware for enrichment endpoints
-- Date: 2025-11-05
-- Related: src/middleware/idempotency.ts, src/routes/enrichment.ts

-- Create idempotency_keys table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" JSONB,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- Create unique index on key field
CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "public"."idempotency_keys"("key");

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idempotency_keys_userId_idx" ON "public"."idempotency_keys"("userId");
CREATE INDEX IF NOT EXISTS "idempotency_keys_status_idx" ON "public"."idempotency_keys"("status");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expiresAt_idx" ON "public"."idempotency_keys"("expiresAt");
