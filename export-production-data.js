/**
 * Export All Production Data to Local
 * Exports: Companies, Contacts, Campaigns, Users, Email Logs
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportAllData() {
  console.log('=== Exporting Production Data ===\n');

  try {
    // Export Users
    console.log('Exporting users...');
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            companies: true,
            campaigns: true,
          },
        },
      },
    });
    console.log(`✓ Found ${users.length} users`);

    // Export Companies
    console.log('Exporting companies...');
    const companies = await prisma.company.findMany({
      include: {
        contacts: true,
        campaigns: true,
      },
    });
    console.log(`✓ Found ${companies.length} companies`);

    // Export Contacts
    console.log('Exporting contacts...');
    const contacts = await prisma.contact.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    console.log(`✓ Found ${contacts.length} contacts`);

    // Export Campaigns
    console.log('Exporting campaigns...');
    const campaigns = await prisma.campaign.findMany({
      include: {
        emailLogs: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
    console.log(`✓ Found ${campaigns.length} campaigns`);

    // Export Email Logs
    console.log('Exporting email logs...');
    const emailLogs = await prisma.emailLog.findMany({
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    console.log(`✓ Found ${emailLogs.length} email logs`);

    // Create export package
    const exportData = {
      exportDate: new Date().toISOString(),
      stats: {
        users: users.length,
        companies: companies.length,
        contacts: contacts.length,
        campaigns: campaigns.length,
        emailLogs: emailLogs.length,
      },
      data: {
        users,
        companies,
        contacts,
        campaigns,
        emailLogs,
      },
    };

    // Save to file
    const exportFile = '/tmp/production-data-export.json';
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Export complete: ${exportFile}`);
    console.log(`File size: ${(fs.statSync(exportFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Create summary
    console.log('\n=== Export Summary ===');
    console.log(`Users: ${users.length}`);
    console.log(`Companies: ${companies.length}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log(`Campaigns: ${campaigns.length}`);
    console.log(`Email Logs: ${emailLogs.length}`);

    // List top companies
    console.log('\n=== Top 10 Companies ===');
    companies.slice(0, 10).forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.contacts.length} contacts, ${c.campaigns.length} campaigns)`);
    });

  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
