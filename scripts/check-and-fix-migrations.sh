#!/bin/bash

# Check and fix migration issues on production

cd /var/www/crm-backend/backend

echo "Checking _prisma_migrations table for 'manual' migration..."
source .env.production

# Query the _prisma_migrations table
RESULT=$(PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -t -c "SELECT migration_name FROM _prisma_migrations WHERE migration_name = 'manual';" 2>/dev/null | xargs)

if [ -n "$RESULT" ]; then
    echo "Found 'manual' migration record in database - deleting..."
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "DELETE FROM _prisma_migrations WHERE migration_name = 'manual';"
    echo "✓ Deleted manual migration record"
else
    echo "No 'manual' migration record found in database"
fi

echo "Checking for manual migration directory..."
if [ -d "prisma/migrations/manual" ]; then
    echo "Found manual migration directory - removing..."
    rm -rf prisma/migrations/manual
    echo "✓ Removed manual migration directory"
else
    echo "No manual migration directory found"
fi

echo "✓ Migration cleanup complete"
