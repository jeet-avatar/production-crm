-- Add email verification fields to Contact model
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailPattern" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerificationMethod" TEXT;
