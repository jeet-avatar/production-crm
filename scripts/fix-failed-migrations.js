#!/usr/bin/env node

/**
 * Fix Failed Migrations Script
 *
 * This script resolves failed migrations that are blocking new migrations.
 * It marks migrations as "applied" when the schema changes already exist in the database.
 *
 * Context: After a previous deployment crash, some migrations are stuck with finished_at=null
 * This prevents new migrations (like audit_logs) from being applied.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Fix Failed Migrations                                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check for failed migrations (finished_at = null)
    console.log('→ Checking for failed migrations...');
    const failedMigrations = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at, logs
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
      ORDER BY started_at;
    `;

    if (failedMigrations.length === 0) {
      console.log('✓ No failed migrations found\n');
      return;
    }

    console.log(`\nFound ${failedMigrations.length} failed migration(s):\n`);
    failedMigrations.forEach((m, i) => {
      console.log(`${i + 1}. ${m.migration_name}`);
      console.log(`   Started: ${m.started_at}`);
      console.log(`   Status: FAILED (finished_at is null)`);
      if (m.logs) {
        console.log(`   Error: ${m.logs.substring(0, 100)}...`);
      }
      console.log('');
    });

    // For each failed migration, check if the schema changes already exist
    console.log('→ Verifying if schema changes are already applied...\n');

    for (const migration of failedMigrations) {
      const migrationName = migration.migration_name;
      let shouldResolve = false;
      let checkDescription = '';

      // Check each migration type
      if (migrationName === '20251101_add_email_template_link') {
        const columnExists = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'video_campaigns'
          AND column_name = 'emailTemplateId';
        `;
        shouldResolve = columnExists.length > 0;
        checkDescription = 'video_campaigns.emailTemplateId column';
      }
      else if (migrationName === '20251101_add_video_template_tracking') {
        const columnExists = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'email_templates'
          AND column_name = 'videoTemplateId';
        `;
        shouldResolve = columnExists.length > 0;
        checkDescription = 'email_templates.videoTemplateId column';
      }
      else if (migrationName.includes('video_progress')) {
        const columnsExist = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'video_campaigns'
          AND column_name IN ('videoGenerationStatus', 'videoGeneratedAt', 'videoError');
        `;
        shouldResolve = columnsExist.length >= 3;
        checkDescription = 'video progress columns (videoGenerationStatus, videoGeneratedAt, videoError)';
      }
      else if (migrationName.includes('forwarding_detection')) {
        const columnExists = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'email_events'
          AND column_name = 'forwardedTo';
        `;
        shouldResolve = columnExists.length > 0;
        checkDescription = 'email_events.forwardedTo column';
      }
      else {
        console.log(`⚠️  Migration ${migrationName}: Unknown migration type`);
        console.log('  Action: Skipping (manual resolution required)\n');
        continue;
      }

      // Resolve if schema changes exist
      if (shouldResolve) {
        console.log(`✓ Migration ${migrationName}:`);
        console.log(`  Schema changes ALREADY EXIST (${checkDescription})`);
        console.log('  Action: Marking as applied (resolved)\n');

        await prisma.$executeRaw`
          UPDATE "_prisma_migrations"
          SET finished_at = NOW(),
              logs = 'Migration resolved by fix-failed-migrations.js - schema changes already existed'
          WHERE migration_name = ${migrationName}
          AND finished_at IS NULL;
        `;

        console.log(`✓ Successfully resolved migration: ${migrationName}\n`);
      } else {
        console.log(`✗ Migration ${migrationName}:`);
        console.log(`  Schema changes DO NOT EXIST (${checkDescription})`);
        console.log('  Action: Cannot auto-resolve, manual intervention needed\n');
      }
    }

    // Verify resolution
    console.log('→ Verifying resolution...');
    const stillFailed = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL;
    `;

    if (stillFailed.length === 0) {
      console.log('✓ All failed migrations resolved!\n');
      console.log('✓ Database is ready for new migrations\n');
    } else {
      console.log(`⚠️  ${stillFailed.length} migration(s) still need manual resolution:\n`);
      stillFailed.forEach(m => console.log(`   - ${m.migration_name}`));
      console.log('');
    }

  } catch (error) {
    console.error('\n✗ Error fixing migrations:', error.message);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
