const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

// Safety configuration
const DRY_RUN = false; // Set to true to test without making changes
const BACKUP_FILE = '/tmp/company-backup.json';

async function safeCleanupCompanies() {
  try {
    console.log('='.repeat(80));
    console.log('SAFE COMPANY DATA CLEANUP SCRIPT');
    console.log('='.repeat(80));
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✅ LIVE MODE (making changes)'}`);
    console.log();

    // ============================================================
    // STEP 1: IDENTIFY SAFE COMPANIES
    // ============================================================
    console.log('STEP 1: Identifying safe companies to fix...\n');

    const allCompanies = await prisma.company.findMany({
      where: {
        domain: { not: null }
      },
      include: {
        _count: {
          select: { contacts: true, campaigns: true }
        }
      }
    });

    const safeCompanies = [];

    allCompanies.forEach(company => {
      // Skip if has contacts or campaigns
      if (company._count.contacts > 0 || company._count.campaigns > 0) {
        return;
      }

      // Check for name/domain mismatch
      const nameParts = company.name.toLowerCase()
        .replace(/[,\.]/g, '')
        .split(/[\s\-_]+/)
        .filter(p => p.length > 3 && !['inc', 'llc', 'corp', 'ltd', 'test'].includes(p));

      const domain = company.domain.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameInDomain = nameParts.some(part => domain.includes(part));

      if (!nameInDomain && domain) {
        safeCompanies.push(company);
      }
    });

    console.log(`✅ Found ${safeCompanies.length} companies safe to fix`);
    console.log(`✅ All have 0 contacts and 0 campaigns\n`);

    if (safeCompanies.length === 0) {
      console.log('✅ No companies need fixing. Exiting.');
      await prisma.$disconnect();
      return;
    }

    // ============================================================
    // STEP 2: CREATE BACKUP
    // ============================================================
    console.log('STEP 2: Creating backup...\n');

    const fs = require('fs');
    const backup = safeCompanies.map(c => ({
      id: c.id,
      name: c.name,
      domain: c.domain,
      website: c.website,
      industry: c.industry,
      description: c.description,
      linkedin: c.linkedin
    }));

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log(`✅ Backup created: ${BACKUP_FILE}`);
    console.log(`✅ ${backup.length} companies backed up\n`);

    // ============================================================
    // STEP 3: PROCESS EACH COMPANY
    // ============================================================
    console.log('STEP 3: Processing companies...\n');

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (let i = 0; i < safeCompanies.length; i++) {
      const company = safeCompanies[i];
      console.log(`[${i + 1}/${safeCompanies.length}] Processing: "${company.name}"`);
      console.log(`   Domain: ${company.domain}`);

      try {
        // Extract domain from website or use domain field
        const websiteUrl = company.website || `https://${company.domain}`;
        let cleanDomain = company.domain.replace(/^www\./, '');

        // Try to extract company name from domain
        let suggestedName = cleanDomain
          .split('.')[0] // Get part before .com
          .split(/[-_]/) // Split on hyphens/underscores
          .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
          .join(' ');

        // Special cases
        if (company.domain.includes('slingshotsports')) {
          suggestedName = 'Slingshot Sports';
        } else if (company.domain.includes('ukg.com')) {
          suggestedName = 'UKG';
        } else if (company.domain.includes('keap.com')) {
          suggestedName = 'Keap';
        } else if (company.domain.includes('mackspw')) {
          suggestedName = "Mack's Prairie Wings";
        } else if (company.domain.includes('newmansown')) {
          suggestedName = "Newman's Own";
        }

        console.log(`   Suggested name: "${suggestedName}"`);

        if (!DRY_RUN) {
          // Update company with corrected name
          await prisma.company.update({
            where: { id: company.id },
            data: {
              name: suggestedName,
              // Clear enrichment data to force re-enrichment with correct name
              enriched: false,
              enrichedAt: null
            }
          });
        }

        results.push({
          id: company.id,
          oldName: company.name,
          newName: suggestedName,
          domain: company.domain,
          status: 'success'
        });

        successCount++;
        console.log(`   ✅ ${DRY_RUN ? 'Would update' : 'Updated'} successfully\n`);

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({
          id: company.id,
          oldName: company.name,
          domain: company.domain,
          status: 'failed',
          error: error.message
        });
        failCount++;
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // ============================================================
    // STEP 4: SUMMARY
    // ============================================================
    console.log('='.repeat(80));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log();

    if (!DRY_RUN) {
      console.log('📄 Changes saved to database');
      console.log('💾 Backup available at:', BACKUP_FILE);
      console.log();
      console.log('NEXT STEPS:');
      console.log('1. These companies will re-enrich automatically on next access');
      console.log('2. Chatbot will now use correct company names');
      console.log('3. Review backup file if you need to restore any data');
    } else {
      console.log('🔍 DRY RUN: No changes were made to database');
      console.log('   Set DRY_RUN = false to apply changes');
    }

    console.log();
    console.log('='.repeat(80));

    // Save detailed results
    fs.writeFileSync('/tmp/cleanup-results.json', JSON.stringify(results, null, 2));
    console.log('📊 Detailed results saved to: /tmp/cleanup-results.json');

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

safeCleanupCompanies();
