const { PrismaClient } = require('./node_modules/@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const prisma = new PrismaClient();
const USER_ID = 'cmglfhzs20000e339tvf74m0h';

async function importCompanies(csvPath) {
  console.log('Starting import...\n');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  console.log('Total rows:', records.length, '\n');
  
  let imported = 0, duplicates = 0;
  
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const name = r.name || r.Name || r['Company Name'];
    if (!name) continue;
    
    const exists = await prisma.company.findFirst({ where: { name, userId: USER_ID } });
    if (exists) { duplicates++; continue; }
    
    await prisma.company.create({
      data: {
        name, userId: USER_ID, dataSource: 'csv_import',
        linkedin: r.linkedin || r.LinkedIn || r['LinkedIn URL'] || null,
        website: r.website || r.Website || null,
        domain: r.domain || r.Domain || null,
        industry: r.industry || r.Industry || null,
      }
    });
    
    imported++;
    if (imported % 10 === 0) console.log('Imported:', imported);
  }
  
  console.log('\nDone! Imported:', imported, 'Duplicates:', duplicates);
  await prisma.$disconnect();
}

importCompanies(process.argv[2]).catch(console.error);
