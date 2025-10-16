#!/bin/bash
# Migration script to add leads table to production database

echo "🚀 Starting migration: Add leads table"
echo "========================================"

# Database connection details from .env
DB_HOST="brandmonkz-crm-db.c23qcukqe810.us-east-1.rds.amazonaws.com"
DB_USER="brandmonkz"
DB_NAME="brandmonkz_crm_sandbox"
DB_PASSWORD="BrandMonkz2024SecureDB"

# SQL Migration
MIGRATION_SQL="
-- Create enums if they don't exist
DO \$\$ BEGIN
  CREATE TYPE \"LeadType\" AS ENUM ('INDIVIDUAL', 'COMPANY');
EXCEPTION
  WHEN duplicate_object THEN null;
END \$\$;

DO \$\$ BEGIN
  CREATE TYPE \"LeadStatus\" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'IMPORTED', 'REJECTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END \$\$;

-- Create leads table
CREATE TABLE IF NOT EXISTS \"leads\" (
  \"id\" TEXT NOT NULL PRIMARY KEY,
  \"type\" \"LeadType\" NOT NULL,
  \"status\" \"LeadStatus\" NOT NULL DEFAULT 'NEW',

  \"leadName\" TEXT NOT NULL,
  \"email\" TEXT,
  \"phone\" TEXT,
  \"jobTitle\" TEXT,
  \"company\" TEXT,
  \"location\" TEXT,
  \"headquarters\" TEXT,
  \"industry\" TEXT,
  \"website\" TEXT,
  \"linkedinLink\" TEXT,
  \"leadScore\" INTEGER,

  \"searchQuery\" TEXT,
  \"searchMode\" TEXT,
  \"searchLocation\" TEXT,
  \"searchIndustry\" TEXT,
  \"searchTechStack\" TEXT,

  \"rawData\" JSONB,

  \"imported\" BOOLEAN NOT NULL DEFAULT false,
  \"importedAt\" TIMESTAMP(3),
  \"importedAsContactId\" TEXT,
  \"importedAsCompanyId\" TEXT,

  \"notes\" TEXT,
  \"tags\" TEXT[],
  \"isActive\" BOOLEAN NOT NULL DEFAULT true,
  \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  \"userId\" TEXT NOT NULL,

  CONSTRAINT \"leads_userId_fkey\" FOREIGN KEY (\"userId\")
    REFERENCES \"users\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint if it doesn't exist
DO \$\$ BEGIN
  ALTER TABLE \"leads\" ADD CONSTRAINT \"leads_userId_email_key\" UNIQUE (\"userId\", \"email\");
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN duplicate_table THEN null;
END \$\$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS \"leads_userId_idx\" ON \"leads\"(\"userId\");
CREATE INDEX IF NOT EXISTS \"leads_type_idx\" ON \"leads\"(\"type\");
CREATE INDEX IF NOT EXISTS \"leads_status_idx\" ON \"leads\"(\"status\");
CREATE INDEX IF NOT EXISTS \"leads_imported_idx\" ON \"leads\"(\"imported\");
CREATE INDEX IF NOT EXISTS \"leads_leadScore_idx\" ON \"leads\"(\"leadScore\");
CREATE INDEX IF NOT EXISTS \"leads_createdAt_idx\" ON \"leads\"(\"createdAt\");
CREATE INDEX IF NOT EXISTS \"leads_email_idx\" ON \"leads\"(\"email\");
CREATE INDEX IF NOT EXISTS \"leads_company_idx\" ON \"leads\"(\"company\");
CREATE INDEX IF NOT EXISTS \"leads_searchQuery_idx\" ON \"leads\"(\"searchQuery\");

-- Verify table was created
SELECT 'Table created successfully!' as result;
SELECT COUNT(*) as initial_count FROM \"leads\";
"

echo "📝 Executing SQL migration..."
echo "$MIGRATION_SQL" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"

if [ $? -eq 0 ]; then
  echo "✅ Migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Verify the leads table exists: SELECT * FROM leads LIMIT 1;"
  echo "2. Test the API endpoints"
  echo "3. Deploy updated backend code"
else
  echo "❌ Migration failed!"
  exit 1
fi
