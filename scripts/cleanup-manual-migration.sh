#!/bin/bash
# Cleanup the empty manual migration directory blocking Prisma

cd /var/www/crm-backend/backend

echo "Removing empty manual migration directory..."
rm -rf prisma/migrations/manual

echo "✓ Cleanup complete"
