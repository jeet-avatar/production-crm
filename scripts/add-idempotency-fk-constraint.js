/**
 * Migration Script: Add Foreign Key Constraint to IdempotencyKey Table
 *
 * Purpose: Add FK constraint from idempotency_keys.userId to users.id
 *
 * Background:
 * - idempotency_keys table was created without FK constraint
 * - Original migration failed due to wrong table name ("User" vs "users")
 * - This adds the constraint with correct CASCADE behavior
 *
 * Benefits:
 * - Enforces referential integrity at database level
 * - Auto-deletes idempotency keys when user is deleted
 * - Consistent with other 30 tables that reference users table
 *
 * Safety:
 * - Uses IF NOT EXISTS check (safe to run multiple times)
 * - Table currently has 0 records (no orphan risk)
 * - All future inserts go through middleware (always valid userId)
 *
 * Related Files:
 * - prisma/schema.prisma (line 1933: FK defined in model)
 * - scripts/create-idempotency-keys-table.sql (original migration)
 * - src/middleware/idempotency.ts (creates idempotency records)
 *
 * Date: 2025-11-05
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Migration: Add Foreign Key Constraint                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if constraint already exists
    console.log('→ Checking if FK constraint exists...');

    const constraintExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'idempotency_keys_userId_fkey'
          AND conrelid = 'idempotency_keys'::regclass
      ) as exists;
    `;

    if (constraintExists[0].exists) {
      console.log('✓ Foreign key constraint already exists, skipping\n');

      // Verify constraint details
      console.log('→ Verifying constraint configuration...');
      const constraintDetails = await prisma.$queryRaw`
        SELECT
          rc.constraint_name,
          rc.update_rule,
          rc.delete_rule,
          kcu.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON rc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON rc.constraint_name = ccu.constraint_name
        WHERE rc.constraint_name = 'idempotency_keys_userId_fkey';
      `;

      if (constraintDetails.length > 0) {
        const details = constraintDetails[0];
        console.log(`✓ Configuration verified:`);
        console.log(`  • Table: ${details.table_name}.${details.column_name}`);
        console.log(`  • References: ${details.foreign_table_name}.${details.foreign_column_name}`);
        console.log(`  • On Delete: ${details.delete_rule}`);
        console.log(`  • On Update: ${details.update_rule}\n`);
      }

      return;
    }

    console.log('⚠️  Constraint does not exist, adding now...\n');

    // Check for orphaned records before adding constraint
    console.log('→ Checking for orphaned userId values...');
    const orphanedRecords = await prisma.$queryRaw`
      SELECT COUNT(*) as orphan_count
      FROM idempotency_keys ik
      LEFT JOIN users u ON ik."userId" = u.id
      WHERE u.id IS NULL;
    `;

    const orphanCount = Number(orphanedRecords[0].orphan_count);
    console.log(`  Found ${orphanCount} orphaned records\n`);

    if (orphanCount > 0) {
      console.error('✗ Cannot add FK constraint: orphaned records exist');
      console.error('  Run this query to see orphaned records:');
      console.error('  SELECT * FROM idempotency_keys WHERE "userId" NOT IN (SELECT id FROM users);\n');
      process.exit(1);
    }

    // Add FK constraint using direct SQL execution
    console.log('→ Adding foreign key constraint...\n');

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "idempotency_keys"
          ADD CONSTRAINT "idempotency_keys_userId_fkey"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      `);
      console.log('✓ Foreign key constraint created successfully\n');
    } catch (error) {
      // Check if error is due to constraint already existing
      if (error.code === '42710' || error.message.includes('already exists')) {
        console.log('ℹ️  Constraint already exists (race condition), continuing...\n');
      } else {
        throw error;
      }
    }

    // Verify constraint was created
    console.log('→ Verifying constraint creation...');

    const verifyConstraint = await prisma.$queryRaw`
      SELECT
        conname as constraint_name,
        contype as constraint_type,
        conrelid::regclass::text as table_name,
        confrelid::regclass::text as foreign_table
      FROM pg_constraint
      WHERE conname = 'idempotency_keys_userId_fkey';
    `;

    if (verifyConstraint.length === 0) {
      throw new Error('Constraint verification failed: Constraint not found after creation');
    }

    console.log('✓ Constraint created successfully:\n');
    verifyConstraint.forEach(c => {
      console.log(`  • Name: ${c.constraint_name}`);
      console.log(`  • Type: ${c.constraint_type === 'f' ? 'FOREIGN KEY' : c.constraint_type}`);
      console.log(`  • Table: ${c.table_name}`);
      console.log(`  • References: ${c.foreign_table}`);
    });

    console.log('');

    // Verify CASCADE settings
    console.log('→ Verifying CASCADE settings...');
    const cascadeSettings = await prisma.$queryRaw`
      SELECT
        rc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.referential_constraints rc
      WHERE rc.constraint_name = 'idempotency_keys_userId_fkey';
    `;

    if (cascadeSettings.length > 0) {
      const settings = cascadeSettings[0];
      console.log('✓ CASCADE settings verified:\n');
      console.log(`  • On Delete: ${settings.delete_rule}`);
      console.log(`  • On Update: ${settings.update_rule}\n`);

      if (settings.delete_rule !== 'CASCADE' || settings.update_rule !== 'CASCADE') {
        console.error('⚠️  WARNING: CASCADE settings are not as expected!');
        console.error(`    Expected: DELETE CASCADE, UPDATE CASCADE`);
        console.error(`    Actual: DELETE ${settings.delete_rule}, UPDATE ${settings.update_rule}\n`);
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Migration completed successfully!                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ✗ Migration failed!                                         ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');

    console.error('Error:', error.message);

    if (error.code) {
      console.error('Error Code:', error.code);
    }

    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }

    console.error('\nStack:', error.stack);

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
