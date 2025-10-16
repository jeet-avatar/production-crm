const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkJMResources() {
  // Find JM user
  const jmUser = await prisma.user.findUnique({
    where: { email: "jm@techcloudpro.com" }
  });

  if (!jmUser) {
    console.log("❌ User jm@techcloudpro.com not found");
    await prisma.$disconnect();
    return;
  }

  console.log("✅ Team Member:", JSON.stringify({
    id: jmUser.id,
    email: jmUser.email,
    name: jmUser.firstName + " " + jmUser.lastName,
    teamRole: jmUser.teamRole,
    accountOwnerId: jmUser.accountOwnerId,
    inviteAccepted: jmUser.inviteAccepted
  }, null, 2));

  // Count contacts owned by JM
  const jmContactsOwned = await prisma.contact.count({
    where: { userId: jmUser.id }
  });

  // Count contacts shared with JM
  const jmContactsShared = await prisma.contactShare.count({
    where: { userId: jmUser.id }
  });

  // Get actual shared contacts with details
  const sharedContactDetails = await prisma.contactShare.findMany({
    where: { userId: jmUser.id },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: {
            select: {
              name: true
            }
          }
        }
      }
    },
    take: 5
  });

  // Count companies owned by JM
  const jmCompaniesOwned = await prisma.company.count({
    where: { userId: jmUser.id }
  });

  // Count companies shared with JM
  const jmCompaniesShared = await prisma.companyShare.count({
    where: { userId: jmUser.id }
  });

  // Get actual shared companies with details
  const sharedCompanyDetails = await prisma.companyShare.findMany({
    where: { userId: jmUser.id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          website: true,
          dataSource: true
        }
      }
    },
    take: 5
  });

  console.log("\n📊 Resources Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📇 CONTACTS:");
  console.log("  - Owned by JM:", jmContactsOwned);
  console.log("  - Shared with JM:", jmContactsShared);
  console.log("  - Total accessible:", jmContactsOwned + jmContactsShared);

  console.log("\n🏢 COMPANIES:");
  console.log("  - Owned by JM:", jmCompaniesOwned);
  console.log("  - Shared with JM:", jmCompaniesShared);
  console.log("  - Total accessible:", jmCompaniesOwned + jmCompaniesShared);

  if (sharedContactDetails.length > 0) {
    console.log("\n📋 Sample Shared Contacts:");
    sharedContactDetails.forEach((share, idx) => {
      console.log(`  ${idx + 1}. ${share.contact.firstName} ${share.contact.lastName} - ${share.contact.company?.name || 'No company'}`);
    });
  }

  if (sharedCompanyDetails.length > 0) {
    console.log("\n🏭 Sample Shared Companies:");
    sharedCompanyDetails.forEach((share, idx) => {
      console.log(`  ${idx + 1}. ${share.company.name} (${share.company.dataSource})`);
    });
  }

  await prisma.$disconnect();
}

checkJMResources().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
