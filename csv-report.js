const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function generateCSVReport() {
  try {
    const allCompanies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        website: true,
        industry: true,
        description: true,
        linkedin: true,
        _count: {
          select: { contacts: true, campaigns: true }
        }
      }
    });

    // Find mismatches
    const mismatches = [];

    allCompanies.forEach(company => {
      if (!company.domain) return;

      const nameParts = company.name.toLowerCase()
        .replace(/[,\.]/g, '')
        .split(/[\s\-_]+/)
        .filter(p => p.length > 3 && !['inc', 'llc', 'corp', 'ltd'].includes(p));

      const domain = company.domain.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameInDomain = nameParts.some(part => domain.includes(part));

      if (!nameInDomain && domain) {
        mismatches.push({
          id: company.id,
          name: company.name,
          domain: company.domain,
          website: company.website || '',
          industry: company.industry || '',
          description: (company.description || '').substring(0, 200).replace(/"/g, '""'),
          linkedin: company.linkedin || '',
          contacts: company._count.contacts,
          campaigns: company._count.campaigns,
          status: (company._count.contacts > 0 || company._count.campaigns > 0) ? 'CRITICAL' : 'SAFE_TO_FIX'
        });
      }
    });

    // Generate CSV
    const csvHeader = 'ID,Company Name,Domain,Website,Industry,Contacts,Campaigns,Status,Description,LinkedIn\n';
    const csvRows = mismatches.map(m =>
      `${m.id},"${m.name}",${m.domain},${m.website},"${m.industry}",${m.contacts},${m.campaigns},${m.status},"${m.description}",${m.linkedin}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file
    fs.writeFileSync('/tmp/company-mismatches-report.csv', csvContent);

    console.log('✅ CSV Report generated successfully!');
    console.log(`📄 Location: /tmp/company-mismatches-report.csv`);
    console.log(`📊 Total mismatches: ${mismatches.length}`);
    console.log(`✅ Safe to fix: ${mismatches.filter(m => m.status === 'SAFE_TO_FIX').length}`);
    console.log(`⚠️  Critical (has data): ${mismatches.filter(m => m.status === 'CRITICAL').length}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

generateCSVReport();
