import godaddyService from '../src/services/godaddy';

async function testGoDaddy() {
  console.log('🔍 Testing GoDaddy API Connection...\n');

  // Check if configured
  const isConfigured = godaddyService.isConfigured();
  console.log('✓ GoDaddy configured:', isConfigured);

  if (!isConfigured) {
    console.error('❌ GoDaddy API credentials not found in .env');
    process.exit(1);
  }

  try {
    // List domains
    console.log('\n📋 Fetching your domains...');
    const domainsResult = await godaddyService.listDomains();

    if (domainsResult.success && domainsResult.domains) {
      console.log(`\n✅ Found ${domainsResult.domains.length} domain(s):\n`);

      domainsResult.domains.forEach((domain: any) => {
        console.log(`  📍 ${domain.domain}`);
        console.log(`     Status: ${domain.status}`);
        console.log(`     Expires: ${new Date(domain.expires).toLocaleDateString()}`);
        console.log(`     Auto Renew: ${domain.renewAuto ? 'Yes' : 'No'}`);
        console.log('');
      });

      // Check if brandmonkz.com is in the list
      const brandmonkz = domainsResult.domains.find((d: any) => d.domain === 'brandmonkz.com');

      if (brandmonkz) {
        console.log('✅ brandmonkz.com found in your account!');

        // Get DNS records for brandmonkz.com
        console.log('\n📋 Fetching DNS records for brandmonkz.com...');
        const dnsResult = await godaddyService.getDNSRecords('brandmonkz.com');

        if (dnsResult.success) {
          console.log(`\n✅ Found ${dnsResult.records.length} DNS record(s):\n`);

          dnsResult.records.forEach((record: any) => {
            console.log(`  ${record.type.padEnd(6)} ${record.name.padEnd(20)} → ${record.data}`);
          });
        }
      } else {
        console.log('⚠️  brandmonkz.com not found in your GoDaddy account');
        console.log('   Make sure you own this domain and it\'s in the same account as your API key');
      }

    }

    console.log('\n✅ GoDaddy integration is working!\n');

  } catch (error: any) {
    console.error('\n❌ Error testing GoDaddy:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Invalid API key or secret');
    console.error('  2. API key doesn\'t have required permissions');
    console.error('  3. Network/firewall blocking the request');
    process.exit(1);
  }
}

testGoDaddy();
