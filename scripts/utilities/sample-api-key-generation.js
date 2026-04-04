/**
 * BrandMonkz API Key Generation - Sample Implementation
 *
 * This demonstrates how API keys are generated for users
 */

const crypto = require('crypto');

// API Key Generation Function
function generateApiKey(type = 'LIVE') {
  // Generate 32 random bytes (256 bits) for the key
  const randomBytes = crypto.randomBytes(32).toString('hex');

  // Create prefix based on type
  let prefixType = 'live';
  if (type === 'TEST') prefixType = 'test';
  if (type === 'SECRET') prefixType = 'secret';

  // Generate a unique prefix with random 4 bytes
  const prefix = `bmz_${prefixType}_${crypto.randomBytes(4).toString('hex')}`;

  // Full key that user sees ONCE
  const fullKey = `${prefix}_${randomBytes}`;

  // Hash for secure storage (SHA-256)
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

  return { fullKey, prefix, hash };
}

// Generate sample keys for demonstration
console.log('='.repeat(80));
console.log('BRANDMONKZ API KEY GENERATION SAMPLES');
console.log('='.repeat(80));
console.log();

// Sample 1: LIVE API Key (Production use)
console.log('1️⃣  LIVE API KEY (Production):');
console.log('-'.repeat(80));
const liveKey = generateApiKey('LIVE');
console.log('Full Key (shown once):');
console.log(`   ${liveKey.fullKey}`);
console.log();
console.log('Prefix (for display):');
console.log(`   ${liveKey.prefix}`);
console.log();
console.log('Hash (stored in database):');
console.log(`   ${liveKey.hash}`);
console.log();
console.log('Key Length:', liveKey.fullKey.length, 'characters');
console.log();

// Sample 2: TEST API Key (Development/Testing)
console.log('2️⃣  TEST API KEY (Development):');
console.log('-'.repeat(80));
const testKey = generateApiKey('TEST');
console.log('Full Key (shown once):');
console.log(`   ${testKey.fullKey}`);
console.log();
console.log('Prefix (for display):');
console.log(`   ${testKey.prefix}`);
console.log();

// Sample 3: SECRET API Key (Admin/Internal use)
console.log('3️⃣  SECRET API KEY (Admin/Internal):');
console.log('-'.repeat(80));
const secretKey = generateApiKey('SECRET');
console.log('Full Key (shown once):');
console.log(`   ${secretKey.fullKey}`);
console.log();
console.log('Prefix (for display):');
console.log(`   ${secretKey.prefix}`);
console.log();

// Explain the format
console.log('='.repeat(80));
console.log('API KEY FORMAT BREAKDOWN:');
console.log('='.repeat(80));
console.log();
console.log('Structure: bmz_{type}_{random4}_{random32}');
console.log();
console.log('Components:');
console.log('  • bmz          = BrandMonkz identifier');
console.log('  • {type}       = live|test|secret');
console.log('  • {random4}    = 4 bytes of randomness (8 hex chars)');
console.log('  • {random32}   = 32 bytes of randomness (64 hex chars)');
console.log();
console.log('Total Length: ~85 characters');
console.log('Security: 256-bit entropy (cryptographically secure)');
console.log();

// Usage example
console.log('='.repeat(80));
console.log('USAGE EXAMPLE:');
console.log('='.repeat(80));
console.log();
console.log('curl -X GET "https://api.brandmonkz.com/api/leads" \\');
console.log(`  -H "Authorization: Bearer ${liveKey.fullKey}" \\`);
console.log('  -H "Content-Type: application/json"');
console.log();

// Storage explanation
console.log('='.repeat(80));
console.log('STORAGE & SECURITY:');
console.log('='.repeat(80));
console.log();
console.log('✅ STORED IN DATABASE:');
console.log('  • Key Prefix: ' + liveKey.prefix);
console.log('  • Key Hash (SHA-256): ' + liveKey.hash);
console.log('  • User ID, Name, Scopes, Products, Rate Limits, etc.');
console.log();
console.log('❌ NEVER STORED:');
console.log('  • Full API Key (only shown once at creation)');
console.log();
console.log('🔒 SECURITY BENEFITS:');
console.log('  • Even if database is compromised, keys cannot be recovered');
console.log('  • One-way hash makes reverse engineering impossible');
console.log('  • Each key is cryptographically unique');
console.log('  • 256-bit entropy prevents brute force attacks');
console.log();

// Sample API Key Record
console.log('='.repeat(80));
console.log('SAMPLE DATABASE RECORD:');
console.log('='.repeat(80));
console.log();
const sampleRecord = {
  id: 'clx123abc456def789',
  userId: 'user_abc123',
  name: 'Production API Key - Lead Discovery',
  keyPrefix: liveKey.prefix,
  keyHash: liveKey.hash,
  keyType: 'LIVE',
  status: 'ACTIVE',
  scopes: ['leads:read', 'leads:write', 'campaigns:read'],
  products: ['LEAD_DISCOVERY', 'AI_CONTENT'],
  rateLimit: 20,        // requests per second
  burstLimit: 50,       // max burst requests
  dailyLimit: 10000,    // daily request limit
  ipWhitelist: ['192.168.1.100', '10.0.0.50'],
  environment: 'production',
  description: 'Main production key for lead discovery integration',
  createdAt: new Date().toISOString(),
  lastUsedAt: null,
  expiresAt: null
};

console.log(JSON.stringify(sampleRecord, null, 2));
console.log();

console.log('='.repeat(80));
console.log('VALIDATION PROCESS:');
console.log('='.repeat(80));
console.log();
console.log('When user makes API request:');
console.log('  1. Extract API key from Authorization header');
console.log('  2. Hash the provided key using SHA-256');
console.log('  3. Look up keyHash in database');
console.log('  4. If found, check:');
console.log('     ✓ Status = ACTIVE');
console.log('     ✓ Not expired (expiresAt)');
console.log('     ✓ IP whitelist (if set)');
console.log('     ✓ Rate limits');
console.log('     ✓ Required scopes for the endpoint');
console.log('  5. Allow or deny request');
console.log();

console.log('='.repeat(80));
