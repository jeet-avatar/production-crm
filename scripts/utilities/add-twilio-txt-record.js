/**
 * Add Twilio Domain Verification TXT Record to GoDaddy
 *
 * This script automatically adds the Twilio verification TXT record
 * to your brandmonkz.com domain via GoDaddy API
 */

const axios = require('axios');

const GODADDY_API_KEY = 'dKYWxHe7j3wd_FXuq3VphgvJDXMEh9fKD2K';
const GODADDY_API_SECRET = 'Ds5b9aQ5Jt5LUeAF8h4aBN';
const DOMAIN = 'brandmonkz.com';

async function addTwilioTxtRecord() {
  console.log('🔧 Adding Twilio Verification TXT Record to GoDaddy\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get existing DNS records
    console.log('📝 Step 1: Fetching existing DNS records...');

    const getResponse = await axios.get(
      `https://api.godaddy.com/v1/domains/${DOMAIN}/records/TXT`,
      {
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Found ${getResponse.data.length} existing TXT record(s)\n`);

    // Check if Twilio verification record already exists
    const existingTwilioRecord = getResponse.data.find(
      record => record.data && record.data.includes('twilio-domain-verification')
    );

    if (existingTwilioRecord) {
      console.log('⚠️  Twilio verification TXT record already exists!');
      console.log(`   Current value: ${existingTwilioRecord.data}`);
      console.log(`   Name: ${existingTwilioRecord.name}\n`);

      console.log('🔄 Updating existing record...\n');
    }

    // Step 2: Prepare new TXT records array
    console.log('📝 Step 2: Preparing TXT records...');

    // Filter out any old Twilio verification records
    const otherRecords = getResponse.data.filter(
      record => !record.data || !record.data.includes('twilio-domain-verification')
    );

    // Add the new Twilio verification record
    const newRecords = [
      ...otherRecords,
      {
        type: 'TXT',
        name: '@',
        data: 'twilio-domain-verification=f87c96d677e46514e543ab6b0dfbe606',
        ttl: 3600
      }
    ];

    console.log(`✅ Prepared ${newRecords.length} TXT record(s) (including Twilio verification)\n`);

    // Step 3: Update DNS records
    console.log('📝 Step 3: Updating DNS records via GoDaddy API...');

    const updateResponse = await axios.put(
      `https://api.godaddy.com/v1/domains/${DOMAIN}/records/TXT`,
      newRecords,
      {
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ DNS records updated successfully!\n');

    // Step 4: Verify the record was added
    console.log('📝 Step 4: Verifying record was added...');

    const verifyResponse = await axios.get(
      `https://api.godaddy.com/v1/domains/${DOMAIN}/records/TXT/@`,
      {
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const twilioRecord = verifyResponse.data.find(
      record => record.data && record.data.includes('twilio-domain-verification')
    );

    if (twilioRecord) {
      console.log('✅ Twilio verification TXT record confirmed!\n');
      console.log('📋 Record Details:');
      console.log(`   Type: ${twilioRecord.type}`);
      console.log(`   Name: ${twilioRecord.name}`);
      console.log(`   Value: ${twilioRecord.data}`);
      console.log(`   TTL: ${twilioRecord.ttl} seconds\n`);
    } else {
      console.log('⚠️  Record added but not found in verification. May take a moment to propagate.\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TWILIO DOMAIN VERIFICATION TXT RECORD ADDED!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('⏰ DNS Propagation:');
    console.log('   - GoDaddy: Immediate to 10 minutes');
    console.log('   - Global: 5-30 minutes (typically)');
    console.log('   - Full propagation: Up to 48 hours (rare)\n');

    console.log('🔍 Check DNS Propagation:');
    console.log('   - Online tool: https://dnschecker.org/#TXT/brandmonkz.com');
    console.log('   - Command line: dig TXT brandmonkz.com\n');

    console.log('📝 Next Steps:');
    console.log('   1. ⏰ Wait 5-10 minutes for DNS propagation');
    console.log('   2. 🔍 Check DNS using: dig TXT brandmonkz.com');
    console.log('   3. ✅ Go to Twilio console and click "Verify Domain"');
    console.log('   4. 🎉 Domain verified - SMS ready to use!\n');

  } catch (error) {
    console.error('\n❌ ERROR ADDING TXT RECORD!');
    console.error('═══════════════════════════════════════════════════════\n');

    if (error.response) {
      console.error('API Error Response:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || 'Unknown error'}`);
      console.error(`   Code: ${error.response.data.code || 'N/A'}`);

      if (error.response.data.fields) {
        console.error(`   Fields:`, error.response.data.fields);
      }

      if (error.response.status === 401 || error.response.status === 403) {
        console.error('\n⚠️  Authentication Error!');
        console.error('   Please check your GoDaddy API credentials:');
        console.error(`   - API Key: ${GODADDY_API_KEY.substring(0, 10)}...`);
        console.error('   - Credentials may be invalid or expired\n');
      }

      if (error.response.status === 422) {
        console.error('\n⚠️  Validation Error!');
        console.error('   The DNS record format may be invalid.');
        console.error('   Check the TXT record value and try again.\n');
      }
    } else if (error.request) {
      console.error('No response from GoDaddy API');
      console.error('Error:', error.message);
      console.error('\n⚠️  Network Error!');
      console.error('   - Check internet connection');
      console.error('   - GoDaddy API may be down\n');
    } else {
      console.error('Error:', error.message);
    }

    console.error('\n📝 Manual Setup Instructions:');
    console.error('   1. Go to: https://dcc.godaddy.com/');
    console.error('   2. Find domain: brandmonkz.com');
    console.error('   3. Click "DNS" → "Add Record"');
    console.error('   4. Type: TXT');
    console.error('   5. Name: @');
    console.error('   6. Value: twilio-domain-verification=f87c96d677e46514e543ab6b0dfbe606');
    console.error('   7. Save\n');

    process.exit(1);
  }
}

// Run the script
addTwilioTxtRecord()
  .then(() => {
    console.log('✅ Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
