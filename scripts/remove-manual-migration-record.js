#!/usr/bin/env node

/**
 * Remove the "manual" migration record from _prisma_migrations table
 * This is blocking Prisma from running migrations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Remove Manual Migration Record from _prisma_migrations      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Check if manual migration record exists
    const manualMigration = await prisma.$queryRawUnsafe(`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = 'manual'
    `);

    if (manualMigration.length > 0) {
      console.log('→ Found manual migration record(s):');
      console.log(`  Count: ${manualMigration.length}`);
      console.log('');

      // Delete the manual migration record
      console.log('→ Deleting manual migration record(s)...');
      const result = await prisma.$executeRawUnsafe(`
        DELETE FROM "_prisma_migrations"
        WHERE migration_name = 'manual'
      `);

      console.log(`  ✓ Deleted ${result} record(s)`);
      console.log('');

      // Also remove the directory if it exists
      const fs = require('fs');
      const path = require('path');
      const manualDir = path.join(__dirname, '../prisma/migrations/manual');

      if (fs.existsSync(manualDir)) {
        console.log('→ Removing manual migration directory...');
        fs.rmSync(manualDir, { recursive: true, force: true });
        console.log('  ✓ Directory removed');
      }

      console.log('');
      console.log('✅ SUCCESS: Manual migration record removed!');
      console.log('   Prisma migrations should now work correctly.');

    } else {
      console.log('✓ No manual migration record found - nothing to clean up');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
