const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testAssignment() {
  console.log("🧪 Testing Assignment Feature\n");

  // Get JM's user ID
  const jmUser = await prisma.user.findUnique({
    where: { email: "jm@techcloudpro.com" }
  });

  if (!jmUser) {
    console.log("❌ JM user not found");
    await prisma.$disconnect();
    return;
  }

  console.log("✅ Found JM:", jmUser.firstName, jmUser.lastName);
  console.log("   User ID:", jmUser.id);

  // Get Jeet's user ID (account owner)
  const jeetUser = await prisma.user.findUnique({
    where: { email: "jeetnair.in@gmail.com" }
  });

  console.log("\n✅ Found Account Owner:", jeetUser.firstName, jeetUser.lastName);

  // Get 5 contacts to assign to JM
  const contactsToAssign = await prisma.contact.findMany({
    where: {
      userId: jeetUser.id,
      isActive: true,
      assignedToId: null
    },
    include: {
      company: {
        select: { name: true }
      }
    },
    take: 5
  });

  console.log(`\n📇 Found ${contactsToAssign.length} contacts to assign\n`);

  // Assign contacts to JM
  for (const contact of contactsToAssign) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { assignedToId: jmUser.id }
    });
    console.log(`✅ Assigned: ${contact.firstName} ${contact.lastName} (${contact.company?.name || 'No company'})`);
  }

  // Get 3 companies to assign to JM
  const companiesToAssign = await prisma.company.findMany({
    where: {
      userId: jeetUser.id,
      isActive: true,
      assignedToId: null
    },
    take: 3
  });

  console.log(`\n🏢 Found ${companiesToAssign.length} companies to assign\n`);

  // Assign companies to JM
  for (const company of companiesToAssign) {
    await prisma.company.update({
      where: { id: company.id },
      data: { assignedToId: jmUser.id }
    });
    console.log(`✅ Assigned: ${company.name}`);
  }

  // Check assigned counts
  const assignedContactsCount = await prisma.contact.count({
    where: { assignedToId: jmUser.id }
  });

  const assignedCompaniesCount = await prisma.company.count({
    where: { assignedToId: jmUser.id }
  });

  console.log("\n" + "=".repeat(50));
  console.log("📊 JM's Assignment Summary:");
  console.log("=".repeat(50));
  console.log(`📇 Contacts assigned to JM: ${assignedContactsCount}`);
  console.log(`🏢 Companies assigned to JM: ${assignedCompaniesCount}`);
  console.log("=".repeat(50));

  await prisma.$disconnect();
}

testAssignment().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
