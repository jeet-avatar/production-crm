-- CreateTable
CREATE TABLE "ui_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ui_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branding_configs" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "tagline" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branding_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_credentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "system_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ui_themes_isActive_idx" ON "ui_themes"("isActive");

-- CreateIndex
CREATE INDEX "branding_configs_isActive_idx" ON "branding_configs"("isActive");

-- CreateIndex
CREATE INDEX "system_credentials_type_idx" ON "system_credentials"("type");

-- CreateIndex
CREATE INDEX "system_credentials_service_idx" ON "system_credentials"("service");

-- CreateIndex
CREATE INDEX "system_credentials_isActive_idx" ON "system_credentials"("isActive");
