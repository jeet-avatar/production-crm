-- CreateTable: audit_logs
-- Enterprise-grade audit trail for SOC 2 compliance
-- Tracks all enrichment operations and critical user actions

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: userId for fast user audit queries
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex: action for audit log filtering by action type
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey: FK to users table with SET NULL on delete (preserve audit trail)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'audit_logs_userId_fkey'
    ) THEN
        ALTER TABLE "audit_logs"
        ADD CONSTRAINT "audit_logs_userId_fkey"
        FOREIGN KEY ("userId")
        REFERENCES "users"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;

-- SOC 2 Compliance: Table created for complete audit trail
-- Maintains record of:
-- - Company enrichments (COMPANY_ENRICHED)
-- - Contact creations (CONTACT_CREATED)
-- - Deal modifications (DEAL_MODIFIED)
-- - User authentication events (future)
