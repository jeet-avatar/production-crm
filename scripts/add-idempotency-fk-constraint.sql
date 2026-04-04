-- Migration: Add foreign key constraint to idempotency_keys table
-- Purpose: Enforce referential integrity between idempotency_keys.userId and users.id
-- Date: 2025-11-05
-- Related: scripts/create-idempotency-keys-table.sql, src/middleware/idempotency.ts

-- Add foreign key constraint with CASCADE delete/update
-- Safe to run multiple times (checks if constraint exists)

DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'idempotency_keys_userId_fkey'
          AND conrelid = 'idempotency_keys'::regclass
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE "idempotency_keys"
          ADD CONSTRAINT "idempotency_keys_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE;

        RAISE NOTICE '✓ Foreign key constraint "idempotency_keys_userId_fkey" added successfully';
    ELSE
        RAISE NOTICE 'ℹ️  Foreign key constraint "idempotency_keys_userId_fkey" already exists';
    END IF;
END $$;

-- Verify constraint was created
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'idempotency_keys_userId_fkey'
    ) INTO constraint_exists;

    IF constraint_exists THEN
        RAISE NOTICE '✓ Verification passed: Foreign key constraint exists';
    ELSE
        RAISE EXCEPTION '✗ Verification failed: Foreign key constraint not found';
    END IF;
END $$;
