const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function comprehensiveAudit() {
  try {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE CRM DATA QUALITY AUDIT');
    console.log('='.repeat(80));
    console.log();

    // ============================================================
    // 1. CHECK FOR DUPLICATE COMPANIES
    // ============================================================
    console.log('📊 SECTION 1: DUPLICATE COMPANY DETECTION\n');

    const allCompanies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        website: true,
        industry: true,
        userId: true,
        _count: {
          select: { contacts: true, campaigns: true }
        }
      }
    });

    console.log(`Total companies: ${allCompanies.length}\n`);

    // Check for duplicate names
    const nameMap = {};
    allCompanies.forEach(c => {
      const normalizedName = c.name.toLowerCase().trim();
      if (!nameMap[normalizedName]) {
        nameMap[normalizedName] = [];
      }
      nameMap[normalizedName].push(c);
    });

    const duplicateNames = Object.entries(nameMap).filter(([name, companies]) => companies.length > 1);

    console.log(`🔍 Duplicate Company Names: ${duplicateNames.length}\n`);

    duplicateNames.forEach(([name, companies]) => {
      console.log(`❌ "${companies[0].name}" - ${companies.length} duplicates:`);
      companies.forEach(c => {
        console.log(`   ID: ${c.id}`);
        console.log(`   Domain: ${c.domain || 'N/A'}`);
        console.log(`   Contacts: ${c._count.contacts}, Campaigns: ${c._count.campaigns}`);
        console.log();
      });
    });

    // Check for duplicate domains
    const domainMap = {};
    allCompanies.forEach(c => {
      if (c.domain) {
        const normalizedDomain = c.domain.toLowerCase().replace(/^www\./, '').trim();
        if (!domainMap[normalizedDomain]) {
          domainMap[normalizedDomain] = [];
        }
        domainMap[normalizedDomain].push(c);
      }
    });

    const duplicateDomains = Object.entries(domainMap).filter(([domain, companies]) => companies.length > 1);

    console.log(`\n🔍 Duplicate Domains: ${duplicateDomains.length}\n`);

    duplicateDomains.forEach(([domain, companies]) => {
      console.log(`❌ Domain: ${domain} - Used by ${companies.length} companies:`);
      companies.forEach(c => {
        console.log(`   "${c.name}" (ID: ${c.id})`);
        console.log(`   Contacts: ${c._count.contacts}, Campaigns: ${c._count.campaigns}`);
        console.log();
      });
    });

    // ============================================================
    // 2. CHECK FOR NAME/DOMAIN MISMATCHES
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 SECTION 2: NAME/DOMAIN MISMATCHES\n');

    const csvCompanies = allCompanies.filter(c => c.domain);
    let mismatchCount = 0;
    const mismatches = [];

    csvCompanies.forEach(company => {
      const nameParts = company.name.toLowerCase()
        .replace(/[,\.]/g, '')
        .split(/[\s\-_]+/)
        .filter(p => p.length > 3 && !['inc', 'llc', 'corp', 'ltd'].includes(p));

      const domain = (company.domain || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      const nameInDomain = nameParts.some(part => domain.includes(part));

      if (!nameInDomain && domain) {
        mismatchCount++;
        mismatches.push({
          id: company.id,
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          contacts: company._count.contacts,
          campaigns: company._count.campaigns
        });
      }
    });

    console.log(`Total mismatches: ${mismatchCount}\n`);

    mismatches.forEach((m, idx) => {
      console.log(`${idx + 1}. "${m.name}"`);
      console.log(`   ID: ${m.id}`);
      console.log(`   Domain: ${m.domain}`);
      console.log(`   Industry: ${m.industry || 'N/A'}`);
      console.log(`   Contacts: ${m.contacts}, Campaigns: ${m.campaigns}`);
      console.log();
    });

    // ============================================================
    // 3. CHECK FOR COMPANIES WITH DEPENDENCIES
    // ============================================================
    console.log('='.repeat(80));
    console.log('📊 SECTION 3: COMPANIES WITH DEPENDENCIES (CRITICAL FOR CLEANUP)\n');

    const companiesWithDeps = allCompanies.filter(c =>
      c._count.contacts > 0 || c._count.campaigns > 0
    );

    console.log(`Companies with contacts or campaigns: ${companiesWithDeps.length}\n`);

    // Check which mismatched companies have dependencies
    const criticalMismatches = mismatches.filter(m => m.contacts > 0 || m.campaigns > 0);

    console.log(`⚠️  CRITICAL: ${criticalMismatches.length} mismatched companies have contacts/campaigns:`);
    console.log(`These require careful handling to avoid breaking functionality!\n`);

    criticalMismatches.forEach((m, idx) => {
      console.log(`${idx + 1}. "${m.name}" (${m.domain})`);
      console.log(`   ${m.contacts} contacts, ${m.campaigns} campaigns - CANNOT auto-fix`);
      console.log();
    });

    // ============================================================
    // 4. SAFE CLEANUP RECOMMENDATIONS
    // ============================================================
    console.log('='.repeat(80));
    console.log('📊 SECTION 4: SAFE CLEANUP RECOMMENDATIONS\n');

    const safeToFix = mismatches.filter(m => m.contacts === 0 && m.campaigns === 0);

    console.log(`✅ Safe to auto-fix: ${safeToFix.length} companies`);
    console.log(`   (No contacts, no campaigns, can re-enrich from domain)\n`);

    console.log(`⚠️  Requires manual review: ${criticalMismatches.length} companies`);
    console.log(`   (Has contacts/campaigns, manual decision needed)\n`);

    // ============================================================
    // 5. GENERATE CLEANUP ACTIONS
    // ============================================================
    console.log('='.repeat(80));
    console.log('📊 SECTION 5: RECOMMENDED ACTIONS\n');

    console.log('IMMEDIATE ACTIONS:');
    console.log('1. Fix duplicate domains - Merge companies with same domain');
    console.log(`   → ${duplicateDomains.length} domain conflicts to resolve`);
    console.log();

    console.log('2. Re-enrich safe mismatches - Update company info from domain');
    console.log(`   → ${safeToFix.length} companies safe to auto-fix`);
    console.log();

    console.log('3. Manual review critical mismatches');
    console.log(`   → ${criticalMismatches.length} companies need human decision`);
    console.log();

    console.log('NEXT STEPS:');
    console.log('→ Export detailed CSV report for manual review');
    console.log('→ Create backup before any changes');
    console.log('→ Run cleanup script on safe companies first');
    console.log('→ Test with single company before bulk operations');

    console.log('\n' + '='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
}

comprehensiveAudit();
