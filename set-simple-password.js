const { PrismaClient } = require("@prisma/client");
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setSimplePassword() {
  const newPassword = "TechCloud2025";  // Simpler password, no special chars
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: "jm@techcloudpro.com" },
    data: { passwordHash: hashedPassword }
  });

  console.log("✅ Password Updated!");
  console.log("Email: jm@techcloudpro.com");
  console.log("Password:", newPassword);

  await prisma.$disconnect();
}

setSimplePassword();
