-- Migration: Fix Campaign Timestamps and Prevent Future Issues
-- Created: 2025-11-12
-- Purpose: Ensure all campaigns have valid timestamps and prevent NULL values

-- =========================================================================
-- STEP 1: Fix existing NULL timestamps using the most accurate method
-- =========================================================================

-- Fix campaigns with NULL created_at using sent_at (if available)
UPDATE campaigns
SET created_at = sent_at,
    updated_at = COALESCE(updated_at, sent_at)
WHERE created_at IS NULL
  AND sent_at IS NOT NULL;

-- Fix campaigns with NULL created_at using earliest email log (most accurate)
UPDATE campaigns c
SET created_at = (
  SELECT MIN(el.sent_at)
  FROM email_logs el
  WHERE el.campaign_id = c.id
    AND el.sent_at IS NOT NULL
),
updated_at = COALESCE(c.updated_at, NOW())
WHERE c.created_at IS NULL
  AND EXISTS (
    SELECT 1 FROM email_logs el
    WHERE el.campaign_id = c.id
      AND el.sent_at IS NOT NULL
  );

-- Fix remaining campaigns with NULL created_at (fallback to NOW)
UPDATE campaigns
SET created_at = NOW(),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL;

-- =========================================================================
-- STEP 2: Ensure columns have proper defaults
-- =========================================================================

-- Set default for created_at (if not already set)
ALTER TABLE campaigns
ALTER COLUMN created_at SET DEFAULT NOW();

-- Set default for updated_at (if not already set)
ALTER TABLE campaigns
ALTER COLUMN updated_at SET DEFAULT NOW();

-- =========================================================================
-- STEP 3: Add NOT NULL constraints to prevent future NULL values
-- =========================================================================

-- Ensure created_at cannot be NULL
ALTER TABLE campaigns
ALTER COLUMN created_at SET NOT NULL;

-- Ensure updated_at cannot be NULL
ALTER TABLE campaigns
ALTER COLUMN updated_at SET NOT NULL;

-- =========================================================================
-- STEP 4: Fix other campaign-related tables (preventive)
-- =========================================================================

-- Fix email_templates (if any NULL timestamps)
UPDATE email_templates
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE email_templates
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Ensure email_templates has defaults and constraints
ALTER TABLE email_templates
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE email_templates
ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE email_templates
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE email_templates
ALTER COLUMN updated_at SET NOT NULL;

-- =========================================================================
-- STEP 5: Create a function to auto-update updated_at
-- =========================================================================

-- Create or replace function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;

-- Create trigger for campaigns table
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for email_templates table
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- VERIFICATION QUERIES (Run these to confirm fix)
-- =========================================================================

-- Check campaigns (should show 0 with NULL timestamps)
DO $$
DECLARE
  total_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM campaigns;
  SELECT COUNT(*) INTO null_count FROM campaigns WHERE created_at IS NULL;

  RAISE NOTICE 'Campaigns: Total=%, With NULL created_at=%', total_count, null_count;

  IF null_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All campaigns have timestamps!';
  ELSE
    RAISE WARNING '⚠️  WARNING: % campaigns still have NULL timestamps', null_count;
  END IF;
END $$;

-- Check email_templates (should show 0 with NULL timestamps)
DO $$
DECLARE
  total_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM email_templates;
  SELECT COUNT(*) INTO null_count FROM email_templates WHERE created_at IS NULL;

  RAISE NOTICE 'Email Templates: Total=%, With NULL created_at=%', total_count, null_count;

  IF null_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All email templates have timestamps!';
  ELSE
    RAISE WARNING '⚠️  WARNING: % email templates still have NULL timestamps', null_count;
  END IF;
END $$;
