#!/bin/bash

# Direct SQL cleanup of manual migration - run from /var/www/crm-backend

cd /var/www/crm-backend

if [ -f ".env.production" ]; then
    source .env.production

    echo "Removing 'manual' migration from _prisma_migrations table..."
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" << EOSQL
DELETE FROM "_prisma_migrations" WHERE migration_name = 'manual';
EOSQL

    echo "✓ Manual migration record removed"

    echo "Removing manual migration directory from backend..."
    rm -rf backend/prisma/migrations/manual
    echo "✓ Directory removed"
else
    echo "ERROR: .env.production not found in /var/www/crm-backend"
    exit 1
fi
