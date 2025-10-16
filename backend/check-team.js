const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkTeam() {
  // Find Jeet Nair (account owner)
  const jeetUser = await prisma.user.findUnique({
    where: { email: "jeetnair.in@gmail.com" },
    include: {
      teamMembers: true  // Get all team members invited by Jeet
    }
  });

  if (!jeetUser) {
    console.log("❌ User jeetnair.in@gmail.com not found");
    await prisma.$disconnect();
    return;
  }

  console.log("✅ Account Owner:", JSON.stringify({
    id: jeetUser.id,
    email: jeetUser.email,
    name: jeetUser.firstName + " " + jeetUser.lastName,
    teamRole: jeetUser.teamRole
  }, null, 2));

  console.log("\n👥 Team Members:");
  if (jeetUser.teamMembers && jeetUser.teamMembers.length > 0) {
    jeetUser.teamMembers.forEach(member => {
      console.log(JSON.stringify({
        id: member.id,
        email: member.email,
        name: member.firstName + " " + member.lastName,
        teamRole: member.teamRole,
        inviteAccepted: member.inviteAccepted
      }, null, 2));
    });
  } else {
    console.log("  No team members found");
  }

  // Count Jeet's contacts and companies
  const jeetContacts = await prisma.contact.count({ where: { userId: jeetUser.id } });
  const jeetCompanies = await prisma.company.count({ where: { userId: jeetUser.id } });

  console.log("\n📊 Account Owner Resources:");
  console.log("  - Total Contacts:", jeetContacts);
  console.log("  - Total Companies:", jeetCompanies);

  await prisma.$disconnect();
}

checkTeam().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
