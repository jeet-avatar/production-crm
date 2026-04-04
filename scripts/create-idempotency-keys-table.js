/**
 * Migration Script: Create IdempotencyKey Table
 *
 * Purpose: Creates the idempotency_keys table required by enrichment endpoints
 *
 * Background:
 * - IdempotencyKey model exists in prisma/schema.prisma
 * - Prisma Client was regenerated with this model
 * - But database table was never created (no migration run)
 * - This causes P2021 error when enrichment endpoints try to query the table
 *
 * Solution:
 * - Run SQL migration to create table with all indexes and constraints
 * - Safe to run multiple times (uses IF NOT EXISTS)
 *
 * Related Files:
 * - prisma/schema.prisma (line 1923: IdempotencyKey model)
 * - src/middleware/idempotency.ts (uses this table)
 * - src/routes/enrichment.ts (applies idempotency middleware)
 *
 * Date: 2025-11-05
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Migration: Create IdempotencyKey Table                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if table already exists
    console.log('→ Checking if idempotency_keys table exists...');

    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'idempotency_keys'
      ) as exists;
    `;

    if (tableExists[0].exists) {
      console.log('✓ idempotency_keys table already exists, skipping creation\n');

      // Verify indexes exist
      console.log('→ Verifying indexes...');
      const indexes = await prisma.$queryRaw`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'idempotency_keys';
      `;
      console.log(`✓ Found ${indexes.length} indexes on idempotency_keys table\n`);

      return;
    }

    console.log('⚠️  Table does not exist, creating now...\n');

    // Read SQL migration file
    const sqlFilePath = path.join(__dirname, 'create-idempotency-keys-table.sql');

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('→ Executing SQL migration...');
    console.log('  File:', sqlFilePath);
    console.log('  Size:', sqlContent.length, 'bytes\n');

    // Execute SQL statements one by one in correct order
    const statements = sqlContent.split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^--/));

    console.log(`  Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Show progress
      const statementType = statement.split(' ')[0];
      console.log(`  [${i + 1}/${statements.length}] Executing ${statementType}...`);

      try {
        // Execute each statement individually
        await prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (error) {
        // Check if error is due to object already existing
        if (error.message &&  (
            error.message.includes('already exists') ||
            error.code === '42P07' ||  // table exists
            error.code === '42710' ||  // index exists
            error.message.includes('duplicate key')
          )) {
          console.log(`    ℹ️  Already exists, skipping`);
          skipCount++;
        } else {
          console.error(`    ✗ Failed: ${error.message}`);
          throw error;
        }
      }
    }

    console.log(`\n✓ Executed ${successCount} statements, skipped ${skipCount} (already exist)\n`);

    // Verify table was created
    console.log('→ Verifying table creation...');

    const verifyTable = await prisma.$queryRaw`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'IdempotencyKey'
      ORDER BY ordinal_position;
    `;

    if (verifyTable.length === 0) {
      throw new Error('Table verification failed: No columns found');
    }

    console.log(`✓ Table created with ${verifyTable.length} columns:\n`);

    verifyTable.forEach(col => {
      console.log(`  • ${col.column_name.padEnd(15)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    });

    console.log('');

    // Verify indexes
    console.log('→ Verifying indexes...');
    const verifyIndexes = await prisma.$queryRaw`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'IdempotencyKey';
    `;

    console.log(`✓ Created ${verifyIndexes.length} indexes:\n`);

    verifyIndexes.forEach(idx => {
      console.log(`  • ${idx.indexname}`);
    });

    console.log('');

    // Verify foreign key constraint
    console.log('→ Verifying foreign key constraints...');
    const verifyForeignKeys = await prisma.$queryRaw`
      SELECT
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'public."IdempotencyKey"'::regclass
      AND contype = 'f';
    `;

    if (verifyForeignKeys.length > 0) {
      console.log(`✓ Created ${verifyForeignKeys.length} foreign key constraint(s):\n`);
      verifyForeignKeys.forEach(fk => {
        console.log(`  • ${fk.constraint_name}`);
      });
    } else {
      console.log('⚠️  No foreign key constraints found (may need manual check)\n');
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
