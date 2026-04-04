const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function verifyJMAccess() {
  console.log("🔍 Verifying JM's Access to Assigned Resources\n");

  // Get JM's user
  const jmUser = await prisma.user.findUnique({
    where: { email: "jm@techcloudpro.com" }
  });

  console.log("✅ User:", jmUser.firstName, jmUser.lastName);
  console.log("   Email:", jmUser.email);
  console.log("   Role:", jmUser.teamRole);
  console.log("\n" + "=".repeat(60));

  // Get assigned contacts
  const assignedContacts = await prisma.contact.findMany({
    where: {
      assignedToId: jmUser.id,
      isActive: true
    },
    include: {
      company: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  console.log("\n📇 ASSIGNED CONTACTS:");
  console.log("=".repeat(60));
  assignedContacts.forEach((contact, idx) => {
    console.log(`${idx + 1}. ${contact.firstName} ${contact.lastName}`);
    console.log(`   Company: ${contact.company?.name || 'No company'}`);
    console.log(`   Status: ${contact.status}`);
    console.log(`   Created by: ${contact.user.firstName} ${contact.user.lastName}`);
    console.log(`   Contact ID: ${contact.id}`);
    console.log("");
  });

  // Get assigned companies
  const assignedCompanies = await prisma.company.findMany({
    where: {
      assignedToId: jmUser.id,
      isActive: true
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          contacts: true,
          deals: true
        }
      }
    }
  });

  console.log("\n🏢 ASSIGNED COMPANIES:");
  console.log("=".repeat(60));
  assignedCompanies.forEach((company, idx) => {
    console.log(`${idx + 1}. ${company.name}`);
    console.log(`   Website: ${company.website || 'N/A'}`);
    console.log(`   Location: ${company.location || 'N/A'}`);
    console.log(`   Contacts: ${company._count.contacts}`);
    console.log(`   Deals: ${company._count.deals}`);
    console.log(`   Created by: ${company.user.firstName} ${company.user.lastName}`);
    console.log(`   Company ID: ${company.id}`);
    console.log("");
  });

  console.log("=".repeat(60));
  console.log("✅ Summary:");
  console.log(`   Total Assigned Contacts: ${assignedContacts.length}`);
  console.log(`   Total Assigned Companies: ${assignedCompanies.length}`);
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

verifyJMAccess().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
