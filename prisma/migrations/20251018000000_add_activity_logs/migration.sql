-- CreateEnum
CREATE TYPE "ActivityLogAction" AS ENUM (
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CONTACT_DELETED',
  'COMPANY_CREATED',
  'COMPANY_UPDATED',
  'COMPANY_DELETED',
  'DEAL_CREATED',
  'DEAL_UPDATED',
  'DEAL_DELETED',
  'EMAIL_SENT',
  'VIDEO_GENERATED',
  'DATABASE_QUERY',
  'SETTINGS_CHANGED',
  'PASSWORD_RESET',
  'API_KEY_ROTATED',
  'TEAM_INVITE_SENT',
  'TEAM_MEMBER_REMOVED'
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" "ActivityLogAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_idx" ON "activity_logs"("entityType");

-- CreateIndex
CREATE INDEX "activity_logs_ipAddress_idx" ON "activity_logs"("ipAddress");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
