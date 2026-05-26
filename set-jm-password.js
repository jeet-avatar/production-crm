const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setJMPassword() {
  console.log("🔐 Setting Password for JM\n");

  // Set a secure password
  const newPassword = "JM@TechCloud2025!";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log("Generated password:", newPassword);
  console.log("Password hash:", hashedPassword.substring(0, 20) + "...");

  // Update JM user with new password
  const updatedUser = await prisma.user.update({
    where: { email: "jm@techcloudpro.com" },
    data: {
      passwordHash: hashedPassword,
      inviteAccepted: true
    }
  });

  console.log("\n✅ Password Updated Successfully!");
  console.log("=".repeat(60));
  console.log("Login Credentials:");
  console.log("=".repeat(60));
  console.log(`Email: ${updatedUser.email}`);
  console.log(`Password: ${newPassword}`);
  console.log(`Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
  console.log(`Role: ${updatedUser.teamRole}`);
  console.log("=".repeat(60));
  console.log("\n🌐 Login at: https://brandmonkz.com");
  console.log("\n⚠️  IMPORTANT: Share these credentials securely!");
  console.log("   Recommend changing password after first login.");

  await prisma.$disconnect();
}

setJMPassword().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
