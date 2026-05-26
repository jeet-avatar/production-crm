const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcryptjs');

async function fixJMPassword() {
  // Create a NEW Prisma client instance to avoid cache issues
  const prisma = new PrismaClient();

  console.log("🔐 Setting Password for JM (Fresh Prisma Client)\n");

  try {
    // First, fetch the user to verify it exists
    const existingUser = await prisma.user.findUnique({
      where: { email: "jm@techcloudpro.com" }
    });

    if (!existingUser) {
      console.log("❌ User not found!");
      await prisma.$disconnect();
      return;
    }

    console.log("Found user:", existingUser.email);
    console.log("Current passwordHash:", existingUser.passwordHash ? `${existingUser.passwordHash.substring(0, 20)}...` : "NULL");

    // Set a secure password
    const newPassword = "JM@TechCloud2025!";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("\nNew password:", newPassword);
    console.log("New hash:", hashedPassword.substring(0, 30) + "...");

    // Update with explicit transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      return await tx.user.update({
        where: { email: "jm@techcloudpro.com" },
        data: {
          passwordHash: hashedPassword,
          inviteAccepted: true,
          updatedAt: new Date()
        }
      });
    });

    console.log("\n✅ Update complete! Verifying...\n");

    // Verify the update by fetching again
    const verifyUser = await prisma.user.findUnique({
      where: { email: "jm@techcloudpro.com" }
    });

    console.log("Verification:");
    console.log("  passwordHash is set:", !!verifyUser.passwordHash);
    console.log("  passwordHash length:", verifyUser.passwordHash ? verifyUser.passwordHash.length : 0);
    console.log("  passwordHash starts with:", verifyUser.passwordHash ? verifyUser.passwordHash.substring(0, 7) : "N/A");

    if (verifyUser.passwordHash && verifyUser.passwordHash.startsWith('$2')) {
      console.log("\n✅ Password successfully saved!");
      console.log("=".repeat(60));
      console.log("Login Credentials:");
      console.log("=".repeat(60));
      console.log(`Email: jm@techcloudpro.com`);
      console.log(`Password: ${newPassword}`);
      console.log("=".repeat(60));
      console.log("\n🌐 Login at: https://brandmonkz.com");
    } else {
      console.log("\n❌ Password still not saved correctly!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixJMPassword();
