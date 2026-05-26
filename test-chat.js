const axios = require("axios");

async function testAIChat() {
  try {
    // First login to get a token
    const loginResponse = await axios.post("http://localhost:3000/api/auth/login", {
      email: "jeet@brandmonkz.com",
      password: "Test@123"
    });
    
    const token = loginResponse.data.token;
    console.log("✅ Login successful");
    
    // Test the AI chat with the users request about Irvine companies
    console.log("\n🤖 Testing AI Chat: Find companies in Irvine using NetSuite\n");
    
    const chatResponse = await axios.post(
      "http://localhost:3000/api/ai-chat/message",
      {
        message: "Find companies near Irvine, California that use NetSuite as their ERP system",
        sessionId: "test-session-" + Date.now()
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log("Response:", JSON.stringify(chatResponse.data, null, 2));
    
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testAIChat();
