const axios = require('axios');

async function testGetCompany() {
  try {
    const companyId = 'cmgmxdqk400k9ls8o1q1gduq1';
    const apiUrl = 'http://localhost:3000';

    console.log('=== TESTING GET COMPANY API ===\n');
    console.log(`Company ID: ${companyId}`);
    console.log(`URL: ${apiUrl}/api/companies/${companyId}\n`);

    // First, we need to login to get a token
    console.log('Step 1: Login...');
    const loginResponse = await axios.post(`${apiUrl}/api/auth/login`, {
      email: 'jeetnair.in@gmail.com',
      password: 'your-password-here' // You'll need to provide this
    }).catch(err => {
      console.log('Login failed - need valid password');
      return null;
    });

    if (!loginResponse) {
      console.log('\nSkipping auth test. Testing without auth (will fail)...');

      // Try without auth to see error
      const response = await axios.get(`${apiUrl}/api/companies/${companyId}`)
        .catch(err => {
          console.log('Error (expected):', err.response?.status, err.response?.statusText);
          return null;
        });
    } else {
      const token = loginResponse.data.token;
      console.log('✅ Login successful\n');

      // Get company
      console.log('Step 2: Get company...');
      const response = await axios.get(`${apiUrl}/api/companies/${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('✅ API Response:\n');
      console.log(JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGetCompany();
