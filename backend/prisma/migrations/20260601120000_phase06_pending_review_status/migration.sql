-- Phase 06 Plan 02: Pending Review queue status values for personalized_email_sends
--
-- The `status` column is typed as `TEXT` (NOT a Postgres ENUM), so adding
-- 'pending_review' and 'rejected' as legal values is a pure documentation
-- change at the DB layer. Application-layer code in apollo.ts (plans 06-03
-- and 06-04) writes the new values explicitly.
--
-- We record this migration so the `_prisma_migrations` table reflects the
-- Phase 06 transition for audit purposes (same pattern as Phase 05's
-- 20260531120000_phase05_personalized_email_send).
--
-- No DDL needed. This migration is intentionally a no-op SELECT — it satisfies
-- prisma migrate deploy's "must run something" requirement while writing zero
-- bytes of data.

SELECT 'Phase 06 plan 02: status column now admits pending_review + rejected (additive, no DDL)' AS phase06_marker;
