const axios = require('axios');
const jwt = require('jsonwebtoken');

// Kling AI Credentials
const ACCESS_KEY = 'AJLAyhBEAJ4Pat9yAHEk8QpMDdQNfLb8';
const SECRET_KEY = 'gCK3LQYrTFfhPyk4NKf3YhYJrnK3NgYD';
const BASE_URL = 'https://api-singapore.klingai.com/v1'; // Updated to Singapore endpoint

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

async function testKlingAPI() {
  console.log('🎬 Testing Kling AI API Directly');
  console.log('================================\n');

  const token = generateJWT();
  console.log('✅ JWT Token generated');
  console.log('Token preview:', token.substring(0, 50) + '...\n');

  const prompt = 'A modern tech office with professionals collaborating, bright lighting, innovative atmosphere';

  const requestBody = {
    model_name: 'kling-v1',
    prompt: prompt,
    negative_prompt: '',
    cfg_scale: 0.5,
    aspect_ratio: '16:9',
    duration: 10,
  };

  console.log('📝 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    console.log('📡 Sending request to Kling AI...');
    const response = await axios.post(
      `${BASE_URL}/videos/text2video`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    console.log('\n✅ SUCCESS!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data?.data?.task_id) {
      console.log('\n🎉 Task ID:', response.data.data.task_id);
      console.log('✅ Kling AI video generation started successfully!');
    }

  } catch (error) {
    console.log('\n❌ ERROR!');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);

    if (error.response) {
      console.log('\nResponse status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      console.log('Response headers:', JSON.stringify(error.response.headers, null, 2));
    } else {
      console.log('Full error:', error);
    }
  }
}

testKlingAPI();
