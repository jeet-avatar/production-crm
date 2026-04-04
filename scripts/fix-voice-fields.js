#!/usr/bin/env node

/**
 * Manual Migration: Add Voice and Video Progress Fields
 *
 * This script directly applies the SQL migrations that were blocked by
 * failed migration records in the _prisma_migrations table.
 *
 * Run this on production server after deployment.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Manual Migration: Add Voice & Video Progress Fields         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Check if columns already exist
    const checkVoiceId = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='video_campaigns' AND column_name='voiceId'
    `);

    const checkProgressPercent = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='video_campaigns' AND column_name='progressPercent'
    `);

    console.log('→ Checking existing schema...');
    console.log(`  voiceId column: ${checkVoiceId.length > 0 ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`  progressPercent column: ${checkProgressPercent.length > 0 ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log('');

    // Apply voice fields migration if needed
    if (checkVoiceId.length === 0) {
      console.log('→ Adding voice fields (voiceId, customVoiceUrl)...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "video_campaigns"
        ADD COLUMN IF NOT EXISTS "voiceId" TEXT,
        ADD COLUMN IF NOT EXISTS "customVoiceUrl" TEXT
      `);
      console.log('  ✓ Voice fields added successfully');
    } else {
      console.log('  ℹ Voice fields already exist, skipping');
    }

    // Apply video progress fields migration if needed
    if (checkProgressPercent.length === 0) {
      console.log('→ Adding video progress fields (processingStartedAt, progressPercent, estimatedCompletion)...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "video_campaigns"
        ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3),
        ADD COLUMN IF NOT EXISTS "progressPercent" INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "estimatedCompletion" TIMESTAMP(3)
      `);
      console.log('  ✓ Video progress fields added successfully');
    } else {
      console.log('  ℹ Video progress fields already exist, skipping');
    }

    // Verify all columns exist
    console.log('');
    console.log('→ Verifying final schema...');
    const allColumns = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='video_campaigns'
        AND column_name IN ('voiceId', 'customVoiceUrl', 'processingStartedAt', 'progressPercent', 'estimatedCompletion')
      ORDER BY column_name
    `);

    console.log(`  Found ${allColumns.length}/5 required columns:`);
    allColumns.forEach(col => {
      console.log(`    ✓ ${col.column_name}`);
    });

    if (allColumns.length === 5) {
      console.log('');
      console.log('✅ SUCCESS: All voice and video progress fields are now in place!');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Restart backend: pm2 restart crm-backend');
      console.log('  2. Regenerate Prisma Client: npx prisma generate');
      console.log('  3. Test video campaign creation with voice selection');
    } else {
      console.log('');
      console.log(`⚠️  WARNING: Only ${allColumns.length}/5 columns added. Manual intervention may be needed.`);
    }

  } catch (error) {
    console.error('');
    console.error('✗ ERROR: Migration failed');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
