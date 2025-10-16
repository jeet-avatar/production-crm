const { PrismaClient } = require('./node_modules/@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();
const USER_ID = 'cmglfhzs20000e339tvf74m0h';

async function updateCompaniesWithLinkedIn(csvPath) {
  console.log('Starting LinkedIn URL update...\n');

  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

  console.log('Total rows in CSV:', records.length, '\n');

  let updated = 0;
  let notFound = 0;
  let alreadyHasLinkedIn = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    // Get company name and LinkedIn URL
    const name = r['Company Name'] || r.name || r.Name;
    const linkedinUrl = r['Domain (LinkedIn)'] || r.linkedin || r.LinkedIn || r['LinkedIn URL'];

    if (!name) {
      console.log(`Row ${i + 1}: Skipping - no company name`);
      continue;
    }

    if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
      console.log(`Row ${i + 1}: Skipping ${name} - no valid LinkedIn URL`);
      continue;
    }

    // Find the company
    const company = await prisma.company.findFirst({
      where: { name, userId: USER_ID }
    });

    if (!company) {
      console.log(`Row ${i + 1}: NOT FOUND - ${name}`);
      notFound++;
      continue;
    }

    // Check if already has LinkedIn
    if (company.linkedin) {
      console.log(`Row ${i + 1}: SKIP - ${name} already has LinkedIn`);
      alreadyHasLinkedIn++;
      continue;
    }

    // Update with LinkedIn URL
    await prisma.company.update({
      where: { id: company.id },
      data: { linkedin: linkedinUrl }
    });

    updated++;
    console.log(`Row ${i + 1}: UPDATED - ${name} -> ${linkedinUrl}`);

    if (updated % 10 === 0) {
      console.log(`\n✅ Progress: ${updated} companies updated so far...\n`);
    }
  }

  console.log('\n========================================');
  console.log('UPDATE COMPLETE!');
  console.log('========================================');
  console.log('✅ Updated:', updated);
  console.log('⏭️  Already had LinkedIn:', alreadyHasLinkedIn);
  console.log('❌ Not found:', notFound);
  console.log('========================================\n');

  await prisma.$disconnect();
}

updateCompaniesWithLinkedIn(process.argv[2]).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
