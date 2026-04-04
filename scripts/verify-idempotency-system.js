/**
 * Comprehensive Idempotency System Verification Script
 *
 * Tests all components of the idempotency system:
 * - Database table structure
 * - Indexes
 * - Foreign key constraints
 * - Middleware integration
 * - Route integration
 *
 * Run: node scripts/verify-idempotency-system.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('  IDEMPOTENCY SYSTEM - COMPREHENSIVE VERIFICATION');
  console.log('='.repeat(70) + '\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // TEST 1: Table Structure
    console.log('TEST 1: Verifying table structure...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'idempotency_keys'
      ORDER BY ordinal_position;
    `;

    const expectedColumns = ['id', 'key', 'userId', 'response', 'status', 'expiresAt', 'createdAt'];
    const actualColumns = columns.map(c => c.column_name);

    if (expectedColumns.every(col => actualColumns.includes(col)) && columns.length === 7) {
      results.passed.push('Table structure (7 columns)');
      console.log('  PASS: All 7 required columns present\n');
    } else {
      results.failed.push('Table structure incorrect');
      console.log('  FAIL: Column mismatch\n');
    }

    // TEST 2: Indexes
    console.log('TEST 2: Verifying indexes...');
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'idempotency_keys';
    `;

    if (indexes.length >= 5) {
      results.passed.push(`Indexes (${indexes.length} found)`);
      console.log(`  PASS: ${indexes.length} indexes created\n`);
    } else {
      results.failed.push('Missing indexes');
      console.log(`  FAIL: Only ${indexes.length} indexes\n`);
    }

    // TEST 3: Foreign Key
    console.log('TEST 3: Verifying foreign key constraint...');
    const fk = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'idempotency_keys'
        AND tc.constraint_type = 'FOREIGN KEY';
    `;

    if (fk.length > 0 && fk[0].delete_rule === 'CASCADE') {
      results.passed.push('Foreign key with CASCADE');
      console.log('  PASS: FK constraint with CASCADE verified\n');
    } else if (fk.length > 0) {
      results.warnings.push('FK exists but no CASCADE');
      console.log('  WARNING: FK exists but CASCADE not verified\n');
    } else {
      results.failed.push('No foreign key constraint');
      console.log('  FAIL: No FK constraint found\n');
    }

    // TEST 4: Middleware File
    console.log('TEST 4: Verifying middleware file...');
    const middlewarePath = path.join(__dirname, '../backend/middleware/idempotency.js');

    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf8');
      if (content.includes('idempotencyMiddleware') && content.includes('markIdempotencyComplete')) {
        results.passed.push('Middleware file exists with required functions');
        console.log('  PASS: Middleware file verified\n');
      } else {
        results.failed.push('Middleware file incomplete');
        console.log('  FAIL: Missing required functions\n');
      }
    } else {
      results.failed.push('Middleware file not found');
      console.log('  FAIL: File not found\n');
    }

    // TEST 5: Route Integration
    console.log('TEST 5: Verifying route integration...');
    const routePath = path.join(__dirname, '../backend/routes/enrichment.js');

    if (fs.existsSync(routePath)) {
      const content = fs.readFileSync(routePath, 'utf8');
      if (content.includes('idempotencyMiddleware') && content.includes('router.use')) {
        results.passed.push('Middleware integrated in routes');
        console.log('  PASS: Middleware applied to routes\n');
      } else {
        results.failed.push('Middleware not integrated');
        console.log('  FAIL: Middleware not applied\n');
      }
    } else {
      results.failed.push('Route file not found');
      console.log('  FAIL: Route file not found\n');
    }

    // TEST 6: Database Access
    console.log('TEST 6: Testing database access...');
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM idempotency_keys;`;
    results.passed.push('Database table accessible');
    console.log(`  PASS: Table accessible (${count[0].count} records)\n`);

    // SUMMARY
    console.log('='.repeat(70));
    console.log('  TEST SUMMARY');
    console.log('='.repeat(70) + '\n');

    console.log(`PASSED:   ${results.passed.length} tests`);
    results.passed.forEach(p => console.log(`  - ${p}`));
    console.log();

    if (results.warnings.length > 0) {
      console.log(`WARNINGS: ${results.warnings.length}`);
      results.warnings.forEach(w => console.log(`  - ${w}`));
      console.log();
    }

    if (results.failed.length > 0) {
      console.log(`FAILED:   ${results.failed.length} tests`);
      results.failed.forEach(f => console.log(`  - ${f}`));
      console.log();
    }

    const total = results.passed.length + results.failed.length + results.warnings.length;
    const passRate = ((results.passed.length / total) * 100).toFixed(1);

    console.log(`Overall: ${results.passed.length}/${total} tests passed (${passRate}%)\n`);

    if (results.failed.length === 0) {
      console.log('='.repeat(70));
      console.log('  ALL CRITICAL TESTS PASSED!');
      console.log('='.repeat(70) + '\n');
      process.exit(0);
    } else {
      console.log('='.repeat(70));
      console.log('  SOME TESTS FAILED - REVIEW REQUIRED');
      console.log('='.repeat(70) + '\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\nVerification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch(console.error);
