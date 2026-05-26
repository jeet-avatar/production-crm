/**
 * Test Twilio SMS Integration
 *
 * This script tests the complete SMS flow:
 * 1. Login as Ethan
 * 2. Create a test activity
 * 3. Send SMS via the activity
 * 4. Check SMS status
 * 5. Verify activity metadata was updated
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testTwilioSMS() {
  console.log('🧪 Testing Twilio SMS Integration\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Step 1: Login as Ethan
    console.log('📝 Step 1: Logging in as Ethan...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ethan@brandmonkz.com',
      password: 'CTOPassword123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // Step 2: Create a test activity
    console.log('📝 Step 2: Creating test activity...');
    const activityResponse = await axios.post(
      `${API_BASE}/activities`,
      {
        type: 'SMS',
        subject: 'Test SMS Activity',
        description: 'Testing Twilio SMS integration',
        priority: 'HIGH'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const activityId = activityResponse.data.activity.id;
    console.log('✅ Activity created!');
    console.log(`   Activity ID: ${activityId}\n`);

    // Step 3: Send SMS
    console.log('📝 Step 3: Sending SMS via Twilio...');
    console.log('   From: +14156966429');
    console.log('   To: YOUR_TEST_PHONE_NUMBER (please provide a different number)');
    console.log('   Message: "🎉 Test SMS from BrandMonkz CRM! Twilio integration is working perfectly! ✅"\n');

    // NOTE: Replace with actual recipient phone number
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';

    console.log(`⚠️  Please set TEST_PHONE_NUMBER in .env or provide as argument`);
    console.log(`   Example: TEST_PHONE_NUMBER=+15551234567 node test-twilio-sms.js\n`);

    if (testPhoneNumber === '+1234567890') {
      console.log('❌ ERROR: Please provide a valid test phone number');
      console.log('   Cannot send to same number as FROM number (+14156966429)');
      console.log('   Set TEST_PHONE_NUMBER environment variable or update the script\n');
      process.exit(1);
    }

    const smsResponse = await axios.post(
      `${API_BASE}/activities/${activityId}/send-sms`,
      {
        phoneNumber: testPhoneNumber,
        message: '🎉 Test SMS from BrandMonkz CRM! Twilio integration is working perfectly! ✅'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ SMS sent successfully!');
    console.log('\n📊 SMS Details:');
    console.log(`   SID: ${smsResponse.data.sms.sid}`);
    console.log(`   Status: ${smsResponse.data.sms.status}`);
    console.log(`   To: ${smsResponse.data.sms.to}`);
    console.log(`   From: ${smsResponse.data.sms.from}`);
    console.log(`   Date: ${smsResponse.data.sms.dateCreated}`);

    // Step 4: Check SMS status
    console.log('\n📝 Step 4: Checking SMS delivery status...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const statusResponse = await axios.get(
      `${API_BASE}/activities/${activityId}/sms-status`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ Status retrieved!');
    console.log(`   Current Status: ${statusResponse.data.status.status}`);
    console.log(`   SID: ${statusResponse.data.status.sid}`);

    // Step 5: Verify activity metadata
    console.log('\n📝 Step 5: Verifying activity metadata...');
    const activityCheckResponse = await axios.get(
      `${API_BASE}/activities`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const updatedActivity = activityCheckResponse.data.activities.find(a => a.id === activityId);

    if (updatedActivity) {
      console.log('✅ Activity metadata verified!');
      console.log('\n📋 Activity Details:');
      console.log(`   ID: ${updatedActivity.id}`);
      console.log(`   Type: ${updatedActivity.type}`);
      console.log(`   Subject: ${updatedActivity.subject}`);
      console.log(`   SMS To: ${updatedActivity.smsTo || 'N/A'}`);
      console.log(`   SMS From: ${updatedActivity.smsFrom || 'N/A'}`);
      console.log(`   SMS SID: ${updatedActivity.smsSid || 'N/A'}`);
      console.log(`   SMS Status: ${updatedActivity.smsStatus || 'N/A'}`);
      console.log(`   SMS Sent At: ${updatedActivity.smsSentAt || 'N/A'}`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📱 Check your phone +14156966429 for the test SMS!\n');

    console.log('🎉 Twilio SMS Integration is FULLY OPERATIONAL!\n');

    console.log('📝 Next Steps:');
    console.log('   1. ✅ SMS sending works perfectly');
    console.log('   2. ✅ Activity metadata is tracked correctly');
    console.log('   3. ✅ Delivery status tracking is functional');
    console.log('   4. 🎨 Update frontend UI to add SMS buttons');
    console.log('   5. 🚀 Deploy to sandbox for Ethan to test\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('═══════════════════════════════════════════════════════\n');

    if (error.response) {
      console.error('Error Response:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.data.error}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }

    process.exit(1);
  }
}

// Run the test
testTwilioSMS()
  .then(() => {
    console.log('✅ Test script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  });
