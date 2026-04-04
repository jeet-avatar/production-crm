const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAndFixLinkedInUrls() {
  console.log('🔍 Analyzing LinkedIn URLs in database...\n');

  // Get all companies
  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, linkedin: true, website: true }
  });

  const stats = {
    total: allCompanies.length,
    withLinkedIn: 0,
    validCompanyUrls: 0,
    personalProfileUrls: 0,
    otherInvalidUrls: 0,
    noLinkedIn: 0
  };

  const needsFixing = [];
  const alreadyCorrect = [];

  for (const company of allCompanies) {
    if (!company.linkedin) {
      stats.noLinkedIn++;
      continue;
    }

    stats.withLinkedIn++;

    // Check if it's a valid company URL
    if (company.linkedin.includes('linkedin.com/company/')) {
      stats.validCompanyUrls++;
      alreadyCorrect.push(company);
    }
    // Check if it's a personal profile URL
    else if (company.linkedin.includes('linkedin.com/in/')) {
      stats.personalProfileUrls++;
      needsFixing.push({
        ...company,
        issue: 'personal_profile',
        currentUrl: company.linkedin
      });
    }
    // Other invalid formats
    else {
      stats.otherInvalidUrls++;
      needsFixing.push({
        ...company,
        issue: 'invalid_format',
        currentUrl: company.linkedin
      });
    }
  }

  // Print statistics
  console.log('📊 Statistics:');
  console.log(`   Total companies: ${stats.total}`);
  console.log(`   Companies with LinkedIn URL: ${stats.withLinkedIn}`);
  console.log(`   ✅ Valid company URLs: ${stats.validCompanyUrls}`);
  console.log(`   ❌ Personal profile URLs: ${stats.personalProfileUrls}`);
  console.log(`   ⚠️  Other invalid URLs: ${stats.otherInvalidUrls}`);
  console.log(`   ⚪ No LinkedIn URL: ${stats.noLinkedIn}`);
  console.log('');

  // Show companies that are already correct
  if (alreadyCorrect.length > 0) {
    console.log(`✅ Companies with CORRECT company URLs (${alreadyCorrect.length}):`);
    alreadyCorrect.forEach(c => {
      console.log(`   - ${c.name}: ${c.linkedin}`);
    });
    console.log('');
  }

  // Show companies that need fixing
  if (needsFixing.length > 0) {
    console.log(`❌ Companies that NEED FIXING (${needsFixing.length}):`);
    needsFixing.slice(0, 20).forEach(c => {
      console.log(`   - ${c.name}`);
      console.log(`     Current: ${c.currentUrl}`);
      console.log(`     Issue: ${c.issue === 'personal_profile' ? 'Personal profile URL (should be company URL)' : 'Invalid format'}`);
      if (c.website) {
        console.log(`     Website: ${c.website} (use this to find company LinkedIn)`);
      }
      console.log('');
    });

    if (needsFixing.length > 20) {
      console.log(`   ... and ${needsFixing.length - 20} more companies`);
      console.log('');
    }
  }

  // Suggest action
  console.log('🔧 RECOMMENDED ACTIONS:\n');

  if (stats.personalProfileUrls > 0 || stats.otherInvalidUrls > 0) {
    console.log('Option 1: Clear all invalid URLs (recommended for clean start)');
    console.log('   Run this SQL query:');
    console.log('   ```sql');
    console.log('   UPDATE Company SET linkedin = NULL');
    console.log('   WHERE linkedin NOT LIKE "%linkedin.com/company/%"');
    console.log('   OR linkedin IS NULL;');
    console.log('   ```');
    console.log('');

    console.log('Option 2: Export list and manually update important ones');
    console.log('   - Focus on top 10-20 most important companies');
    console.log('   - Search "[Company Name] LinkedIn company" on Google');
    console.log('   - Look for URLs with /company/ in them');
    console.log('   - Update via the CRM interface');
    console.log('');

    console.log('Option 3: Use this script to auto-clear (will run now if you uncomment)');
    console.log('');
  }

  // Export to CSV for manual fixing
  console.log('📄 Exporting companies that need fixing to CSV format:\n');
  console.log('Company Name,Current Invalid URL,Website,Action Needed');
  needsFixing.forEach(c => {
    const websiteValue = c.website || 'N/A';
    console.log(`"${c.name}","${c.currentUrl}","${websiteValue}","Find and add company LinkedIn URL"`);
  });
  console.log('');

  // Optionally clear invalid URLs (commented out for safety)
  // Uncomment the section below to actually clear invalid URLs from database
  /*
  console.log('🧹 Clearing invalid LinkedIn URLs...');
  const result = await prisma.company.updateMany({
    where: {
      OR: [
        { linkedin: { contains: 'linkedin.com/in/' } },
        {
          AND: [
            { linkedin: { not: null } },
            { linkedin: { not: { contains: 'linkedin.com/company/' } } }
          ]
        }
      ]
    },
    data: {
      linkedin: null
    }
  });
  console.log(`✅ Cleared ${result.count} invalid LinkedIn URLs`);
  */

  await prisma.$disconnect();
}

analyzeAndFixLinkedInUrls().catch(console.error);
