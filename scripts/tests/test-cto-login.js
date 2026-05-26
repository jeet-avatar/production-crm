/**
 * Test CTO Login
 */

const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing CTO Login...');
    console.log('Email: rajesh.sharma@brandmonkz.com');
    console.log('Password: CTO@BrandMonkz2025!');
    console.log('');

    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'rajesh.sharma@brandmonkz.com',
      password: 'CTO@BrandMonkz2025!'
    });

    console.log('✅ Login Successful!');
    console.log('');
    console.log('User:', response.data.user);
    console.log('Token:', response.data.token.substring(0, 50) + '...');
    console.log('');
    console.log('🎉 CTO can now log in with these credentials!');

  } catch (error) {
    console.error('❌ Login Failed!');
    console.error('');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
