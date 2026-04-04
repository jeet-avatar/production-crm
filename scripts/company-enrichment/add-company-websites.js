const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Known company websites
const companyWebsites = {
  'Carrier Global Corporation': 'https://www.carrier.com',
  'Trane Technologies': 'https://www.tranetechnologies.com',
  'Lennox International': 'https://www.lennoxinternational.com',
  'Whirlpool Corporation': 'https://www.whirlpoolcorp.com',
  'Regal Rexnord Corporation': 'https://www.regalrexnord.com',
  'Johnson Controls': 'https://www.johnsoncontrols.com',
  'Honeywell': 'https://www.honeywell.com',
  'Emerson Electric': 'https://www.emerson.com',
  'Daikin': 'https://www.daikin.com',
  'Rheem': 'https://www.rheem.com'
};

async function addWebsites() {
  try {
    console.log('=== ADDING COMPANY WEBSITES ===\n');

    for (const [companyName, websiteUrl] of Object.entries(companyWebsites)) {
      try {
        const result = await prisma.company.updateMany({
          where: { name: companyName },
          data: { website: websiteUrl }
        });

        if (result.count > 0) {
          console.log(`✅ Updated: ${companyName} -> ${websiteUrl}`);
        } else {
          console.log(`⚠️  Not found: ${companyName}`);
        }
      } catch (err) {
        console.log(`❌ Error updating ${companyName}:`, err.message);
      }
    }

    console.log('\n=== VERIFICATION ===\n');
    const companies = await prisma.company.findMany({
      select: {
        name: true,
        website: true
      },
      where: {
        name: {
          in: Object.keys(companyWebsites)
        }
      }
    });

    companies.forEach(c => {
      console.log(`${c.name}: ${c.website || 'NO WEBSITE'}`);
    });

    await prisma.$disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

addWebsites();
