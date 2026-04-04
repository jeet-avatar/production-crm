/**
 * Create Ethan's Account on Sandbox Backend via API
 */

const axios = require('axios');

const SANDBOX_API = 'http://18.212.225.252:3000';

async function createEthanOnSandbox() {
  try {
    console.log('🔧 Creating Ethan\'s CTO account on Sandbox Backend...');
    console.log('Backend: ' + SANDBOX_API);
    console.log('');

    // Try to register Ethan
    console.log('📝 Attempting to register via API...');

    try {
      const response = await axios.post(`${SANDBOX_API}/api/auth/register`, {
        email: 'ethan@brandmonkz.com',
        password: 'CTOPassword123',
        firstName: 'Ethan',
        lastName: 'Varela',
        role: 'ADMIN'
      }, {
        timeout: 10000
      });

      console.log('✅ Registration successful!');
      console.log('');
      console.log('Response:', response.data);

    } catch (registerError) {
      if (registerError.response?.status === 409) {
        console.log('ℹ️  User already exists, trying to login instead...');

        // Try to login
        const loginResponse = await axios.post(`${SANDBOX_API}/api/auth/login`, {
          email: 'ethan@brandmonkz.com',
          password: 'CTOPassword123'
        });

        console.log('✅ Login successful! User already exists with correct password.');
        console.log('');
        console.log('User:', loginResponse.data.user);

      } else {
        throw registerError;
      }
    }

    // Verify login works
    console.log('');
    console.log('🧪 Testing login...');
    const testLogin = await axios.post(`${SANDBOX_API}/api/auth/login`, {
      email: 'ethan@brandmonkz.com',
      password: 'CTOPassword123'
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✅ ETHAN CAN NOW LOG IN TO SANDBOX!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('  Login URL:   http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com');
    console.log('  Email:       ethan@brandmonkz.com');
    console.log('  Password:    CTOPassword123');
    console.log('  Role:        ' + testLogin.data.user.role);
    console.log('  Name:        ' + testLogin.data.user.firstName + ' ' + testLogin.data.user.lastName);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('');

    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('⚠️  Cannot connect to sandbox backend!');
      console.error('   Backend may be down or firewall blocking connection.');
      console.error('');
      console.error('   Please SSH into EC2 and create user manually:');
      console.error('   See FIX_ETHAN_LOGIN_ISSUE.md for instructions');
    }

    process.exit(1);
  }
}

createEthanOnSandbox();
