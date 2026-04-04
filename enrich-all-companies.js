const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

// Configuration
const API_URL = 'http://localhost:3000'; // Use localhost since we're running on the server
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enrichCompany(company, token) {
  try {
    console.log(`\n🔄 Enriching: ${company.name}`);
    console.log(`   LinkedIn: ${company.linkedin || 'N/A'}`);

    const response = await axios.post(
      `${API_URL}/api/enrichment/companies/${company.id}/enrich`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout per request
      }
    );

    if (response.data && response.data.company) {
      const enriched = response.data.company;
      console.log(`   ✅ Enriched successfully!`);
      if (enriched.website) console.log(`   🌐 Website: ${enriched.website}`);
      if (enriched.industry) console.log(`   🏢 Industry: ${enriched.industry}`);
      if (enriched.employeeCount) console.log(`   👥 Employees: ${enriched.employeeCount}`);
      if (enriched.pitch) console.log(`   💡 Pitch: ${enriched.pitch.substring(0, 100)}...`);

      return { success: true, company: enriched };
    }

    return { success: false, error: 'No data returned' };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return { success: false, error: error.message };
  }
}

async function enrichAllCompanies() {
  try {
    console.log('🚀 Starting AI Enrichment for All Companies...\n');
    console.log('This will take approximately 2-3 minutes for 61 companies\n');

    // Generate auth token
    const jwt = require('jsonwebtoken');
    const user = await prisma.user.findUnique({
      where: { email: 'jeetnair.in@gmail.com' }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || '5fa7fba74f76e2b147bf34ebbe267fa51baee4d123edab0afe8d300764cad920bf1a291ccb6dd6a18135572604d332b9c7b2b23038cc0e3f85504b4a18a26d5e',
      { expiresIn: '7d' }
    );

    console.log('✅ Authentication token generated\n');

    // Get all companies (enrichment will update them)
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        linkedin: true,
        website: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${companies.length} companies to enrich\n`);
    console.log('─'.repeat(80));

    const results = {
      total: companies.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`\n[${i + 1}/${companies.length}] Processing: ${company.name}`);

      const result = await enrichCompany(company, token);

      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({
          company: company.name,
          error: result.error
        });
      }

      // Rate limiting: wait between requests
      if (i < companies.length - 1) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000}s before next request...`);
        await sleep(DELAY_BETWEEN_REQUESTS);
      }
    }

    console.log('\n');
    console.log('═'.repeat(80));
    console.log('📊 ENRICHMENT SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Companies: ${results.total}`);
    console.log(`✅ Successful: ${results.successful} (${((results.successful/results.total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.failed} (${((results.failed/results.total)*100).toFixed(1)}%)`);

    if (results.errors.length > 0) {
      console.log('\n❌ Failed Companies:');
      results.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.company}: ${err.error}`);
      });
    }

    // Save results to file
    require('fs').writeFileSync('enrichment-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to enrichment-results.json');

    // Get updated statistics
    const enrichedCount = await prisma.company.count({
      where: { enriched: true }
    });
    const totalCount = await prisma.company.count();

    console.log('\n📈 Database Statistics:');
    console.log(`Enriched Companies: ${enrichedCount}/${totalCount} (${((enrichedCount/totalCount)*100).toFixed(1)}%)`);

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the enrichment
enrichAllCompanies();
