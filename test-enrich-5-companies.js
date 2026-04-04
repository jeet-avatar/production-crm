// Test Contact Enrichment for 5 Companies
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LIVE_LEADS_API = 'http://13.53.133.99:8000/api/live-leads';

const companies = [
  { id: 'cmhk5cjis00073a8jyx4alx1w', name: 'Techcloudpro', userId: 'cmgzeth9g000011pl79rq8k6e' },
  { id: 'cmhk5wl3f000l3a8jd18xm727', name: 'techcloudpro', userId: 'cmhf55zcl013afix3rsq4i2d8' },
  { id: 'cmhlb8zsy0007dkjc00s97y9e', name: 'Slingshot Sports', userId: 'cmgla99e20000u0yuebp3yg2p' },
  { id: 'cmhlb8ztq000fdkjcw77j3lx8', name: 'Abernathy', userId: 'cmgla99e20000u0yuebp3yg2p' },
  { id: 'cmhlb8zub000ndkjcsr44zss3', name: 'AbleTo', userId: 'cmgla99e20000u0yuebp3yg2p' },
];

async function enrichContacts(company) {
  console.log(`\n📧 Enriching contacts for: ${company.name}`);
  console.log(`   Company ID: ${company.id}`);

  try {
    // Call Live Leads API
    const params = new URLSearchParams({
      query: company.name,
      mode: 'individual'
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${LIVE_LEADS_API}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Live Leads API returned status ${response.status}`);
    }

    const apiData = await response.json();

    // Extract leads from categories
    let leads = [];
    if (apiData.categories && Array.isArray(apiData.categories)) {
      leads = apiData.categories.flatMap((category) => category.leads || []);
    }

    const leadsWithEmail = leads.filter(lead => lead.email);
    console.log(`   Found ${leads.length} total leads, ${leadsWithEmail.length} with emails`);

    // Create or update contacts
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const lead of leadsWithEmail) {
      try {
        const nameParts = (lead.LeadName || '').split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';

        const existing = await prisma.contact.findUnique({
          where: { email: lead.email }
        });

        if (existing) {
          if (existing.userId === company.userId) {
            await prisma.contact.update({
              where: { email: lead.email },
              data: {
                title: lead.jobTitle || existing.title,
                linkedin: lead.LinkedinLink || existing.linkedin,
                location: lead.location || existing.location,
                companyId: company.id,
              }
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.contact.create({
            data: {
              email: lead.email,
              firstName,
              lastName,
              title: lead.jobTitle,
              linkedin: lead.LinkedinLink,
              location: lead.location,
              companyId: company.id,
              userId: company.userId,
              isActive: true,
              source: 'Live Leads API',
            }
          });
          created++;
        }
      } catch (error) {
        errors.push(`${lead.email}: ${error.message}`);
      }
    }

    // Update company enrichment status
    await prisma.company.update({
      where: { id: company.id },
      data: {
        contactsEnriched: true,
        contactsEnrichedAt: new Date(),
      }
    });

    console.log(`   ✅ Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return {
      company: company.name,
      success: true,
      stats: { totalLeads: leads.length, leadsWithEmail: leadsWithEmail.length, created, updated, skipped, errors: errors.length }
    };

  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return {
      company: company.name,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Contact Email Enrichment Test - 5 Companies');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];

  for (const company of companies) {
    const result = await enrichContacts(company);
    results.push(result);

    // Small delay between companies to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.company}`);
    if (result.success) {
      console.log(`   ✅ SUCCESS`);
      console.log(`   Total Leads: ${result.stats.totalLeads}`);
      console.log(`   Leads with Email: ${result.stats.leadsWithEmail}`);
      console.log(`   Contacts Created: ${result.stats.created}`);
      console.log(`   Contacts Updated: ${result.stats.updated}`);
      console.log(`   Contacts Skipped: ${result.stats.skipped}`);
      console.log(`   Errors: ${result.stats.errors}`);
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);
    }
    console.log('');
  });

  // Final verification
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DATABASE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const company of companies) {
    const contactCount = await prisma.contact.count({
      where: {
        companyId: company.id,
        email: { not: null }
      }
    });

    const companyRecord = await prisma.company.findUnique({
      where: { id: company.id },
      select: { contactsEnriched: true, contactsEnrichedAt: true }
    });

    console.log(`${company.name}:`);
    console.log(`   Contacts with emails: ${contactCount}`);
    console.log(`   Contacts enriched: ${companyRecord.contactsEnriched}`);
    console.log(`   Enriched at: ${companyRecord.contactsEnrichedAt || 'N/A'}`);
    console.log('');
  }

  await prisma.$disconnect();

  const successCount = results.filter(r => r.success).length;
  const totalContacts = results.reduce((sum, r) => sum + (r.success ? r.stats.created : 0), 0);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✓ Test Complete: ${successCount}/${companies.length} companies enriched successfully`);
  console.log(`  ✓ Total contacts created: ${totalContacts}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
