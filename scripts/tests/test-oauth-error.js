// Test Google OAuth error details
const https = require('https');

const options = {
  hostname: 'brandmonkz.com',
  path: '/api/auth/google/callback?code=test&scope=email+profile',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
