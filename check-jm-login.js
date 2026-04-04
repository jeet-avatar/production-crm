const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkJMLogin() {
  console.log("🔍 Checking JM Login Issues\n");

  // Find JM user
  const jmUser = await prisma.user.findUnique({
    where: { email: "jm@techcloudpro.com" }
  });

  if (!jmUser) {
    console.log("❌ User not found: jm@techcloudpro.com");
    await prisma.$disconnect();
    return;
  }

  console.log("✅ User Found:");
  console.log("=".repeat(60));
  console.log(`Email: ${jmUser.email}`);
  console.log(`Name: ${jmUser.firstName} ${jmUser.lastName}`);
  console.log(`Role: ${jmUser.teamRole}`);
  console.log(`Account Owner ID: ${jmUser.accountOwnerId}`);
  console.log(`Invite Accepted: ${jmUser.inviteAccepted}`);
  console.log(`Created: ${jmUser.createdAt}`);
  console.log(`Has Password: ${!!jmUser.password}`);
  console.log(`Password Length: ${jmUser.password ? jmUser.password.length : 0} characters`);
  console.log("=".repeat(60));

  // Test if password hash is valid
  if (jmUser.password) {
    const isBcryptHash = jmUser.password.startsWith('$2a$') || jmUser.password.startsWith('$2b$');
    console.log(`\nPassword Hash Format: ${isBcryptHash ? '✅ Valid bcrypt' : '❌ Invalid format'}`);

    if (!isBcryptHash) {
      console.log(`⚠️  Password appears to be plain text or incorrect format!`);
      console.log(`   Current value starts with: ${jmUser.password.substring(0, 10)}...`);
      console.log(`\n🔧 Need to reset password with proper bcrypt hash`);
    }
  } else {
    console.log("\n❌ No password set for this user!");
  }

  await prisma.$disconnect();
}

checkJMLogin().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
