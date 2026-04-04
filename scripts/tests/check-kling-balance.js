const axios = require('axios');
const jwt = require('jsonwebtoken');

// Kling AI Credentials
const ACCESS_KEY = 'AJLAyhBEAJ4Pat9yAHEk8QpMDdQNfLb8';
const SECRET_KEY = 'gCK3LQYrTFfhPyk4NKf3YhYJrnK3NgYD';
const BASE_URL = 'https://api-singapore.klingai.com';

// Generate JWT token
function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ACCESS_KEY,
    exp: now + 1800,
    nbf: now - 5,
  };

  return jwt.sign(payload, SECRET_KEY, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' },
  });
}

async function checkAccountBalance() {
  console.log('💰 Checking Kling AI Account Balance');
  console.log('====================================\n');

  try {
    const token = generateJWT();
    console.log('✅ JWT Token generated\n');

    // Query last 30 days
    const endTime = Date.now();
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // 30 days ago

    console.log('📅 Querying resource packs from:', new Date(startTime).toISOString());
    console.log('📅 To:', new Date(endTime).toISOString());
    console.log('');

    const response = await axios.get(`${BASE_URL}/account/costs`, {
      params: {
        start_time: startTime,
        end_time: endTime,
      },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📦 Response Status:', response.status);
    console.log('📦 Response Data:\n');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.code === 0) {
      const resourcePacks = response.data.data?.resource_pack_subscribe_infos || [];

      console.log('\n\n📊 Account Summary');
      console.log('==================\n');

      if (resourcePacks.length === 0) {
        console.log('❌ No resource packs found');
        console.log('');
        console.log('💡 Action Required:');
        console.log('   1. Go to https://klingai.com');
        console.log('   2. Purchase a resource pack (video generation credits)');
        console.log('   3. Wait for the pack to become active');
        console.log('   4. Run this script again to verify');
        console.log('');
        console.log('💰 Recommended: Start with 10,000 entries pack for testing');
      } else {
        console.log(`Total Resource Packs: ${resourcePacks.length}\n`);

        resourcePacks.forEach((pack, index) => {
          console.log(`📦 Pack ${index + 1}: ${pack.resource_pack_name}`);
          console.log(`   ID: ${pack.resource_pack_id}`);
          console.log(`   Type: ${pack.resource_pack_type}`);
          console.log(`   Status: ${pack.status}`);
          console.log(`   Total: ${pack.total_quantity}`);
          console.log(`   Remaining: ${pack.remaining_quantity} (updated every 12 hours)`);
          console.log(`   Usage: ${((pack.total_quantity - pack.remaining_quantity) / pack.total_quantity * 100).toFixed(1)}% used`);
          console.log(`   Purchased: ${new Date(pack.purchase_time).toISOString()}`);
          console.log(`   Effective: ${new Date(pack.effective_time).toISOString()}`);
          console.log(`   Expires: ${new Date(pack.invalid_time).toISOString()}`);

          // Check if pack is usable
          const now = Date.now();
          const isActive = pack.status === 'online';
          const hasCredits = pack.remaining_quantity > 0;
          const notExpired = pack.invalid_time > now;

          if (isActive && hasCredits && notExpired) {
            console.log(`   ✅ READY TO USE`);
          } else if (pack.status === 'toBeOnline') {
            console.log(`   ⏳ PENDING - Not yet effective`);
          } else if (pack.status === 'expired') {
            console.log(`   ⚠️ EXPIRED - Cannot use`);
          } else if (pack.status === 'runOut') {
            console.log(`   ⚠️ USED UP - No credits remaining`);
          } else if (!hasCredits) {
            console.log(`   ⚠️ NO CREDITS - Remaining quantity is 0`);
          }

          console.log('');
        });

        // Summary
        const activePacks = resourcePacks.filter(p =>
          p.status === 'online' &&
          p.remaining_quantity > 0 &&
          p.invalid_time > Date.now()
        );

        const totalCredits = activePacks.reduce((sum, p) => sum + p.remaining_quantity, 0);

        console.log('═══════════════════════════════');
        if (activePacks.length > 0) {
          console.log(`✅ ${activePacks.length} active pack(s) with ${totalCredits.toFixed(0)} credits available`);
          console.log('');
          console.log('🎬 You can now generate videos!');
          console.log('');
          console.log('Next steps:');
          console.log('1. Go to https://brandmonkz.com/video-campaigns');
          console.log('2. Click "Create with AI (15s)" button');
          console.log('3. Fill in the form and generate your video');
        } else {
          console.log(`⚠️ No active resource packs found`);
          console.log('');
          console.log('Possible reasons:');
          console.log('- All packs are expired');
          console.log('- All packs are used up');
          console.log('- Packs are pending activation');
          console.log('');
          console.log('💡 Purchase a new resource pack at https://klingai.com');
        }
      }
    } else {
      console.error('\n❌ API returned an error');
      console.error('Code:', response.data.code);
      console.error('Message:', response.data.message);
    }
  } catch (error) {
    console.error('\n❌ ERROR!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);

    if (error.response) {
      console.error('\nResponse status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 429 && error.response.data?.code === 1102) {
        console.error('\n💡 This error means you need to purchase a resource pack');
        console.error('   Go to https://klingai.com and buy credits');
      }
    }
  }
}

checkAccountBalance();
