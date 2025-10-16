/**
 * Script to enrich SportStop.com and extract all executives and IT personnel
 */

const API_URL = 'https://brandmonkz.com/api';
const TOKEN = process.env.CRM_TOKEN || '';

async function enrichSportStop() {
  try {
    console.log('🔍 Finding SportStop.com company...\n');

    // Get companies
    const companiesResponse = await fetch(`${API_URL}/companies?search=SportStop`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    if (!companiesResponse.ok) {
      throw new Error('Failed to fetch companies');
    }

    const companiesData = await companiesResponse.json();
    const sportStop = companiesData.companies.find(c =>
      c.name.toLowerCase().includes('sportstop') ||
      c.website?.includes('sportstop.com')
    );

    if (!sportStop) {
      console.log('❌ SportStop.com not found in database');
      console.log('Available companies:', companiesData.companies.map(c => c.name));
      return;
    }

    console.log(`✅ Found company: ${sportStop.name} (ID: ${sportStop.id})`);
    console.log(`   Website: ${sportStop.website}`);
    console.log(`   Current contacts: ${sportStop._count?.contacts || 0}\n`);

    console.log('🚀 Starting AI enrichment to extract executives and IT personnel...\n');

    // Enrich the company
    const enrichResponse = await fetch(`${API_URL}/enrichment/companies/${sportStop.id}/enrich`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!enrichResponse.ok) {
      const errorData = await enrichResponse.json();
      throw new Error(`Enrichment failed: ${errorData.error || enrichResponse.statusText}`);
    }

    const enrichResult = await enrichResponse.json();

    console.log('✅ Enrichment complete!\n');
    console.log(`📊 Results:`);
    console.log(`   Confidence: ${enrichResult.enrichmentData.confidence}%`);
    console.log(`   Professionals created: ${enrichResult.professionalsCreated}\n`);

    // Get updated company with contacts
    const updatedCompanyResponse = await fetch(`${API_URL}/companies/${sportStop.id}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
      },
    });

    const updatedCompanyData = await updatedCompanyResponse.json();
    const contacts = updatedCompanyData.company.contacts || [];

    console.log('👥 EXTRACTED PERSONNEL:\n');
    console.log('═'.repeat(80));

    // Categorize contacts
    const executives = {
      ceo: [],
      cfo: [],
      controller: [],
      itHead: [],
      vpIT: [],
      itStaff: [],
      other: []
    };

    contacts.forEach(contact => {
      const title = (contact.title || '').toLowerCase();
      const role = (contact.role || '').toLowerCase();
      const fullTitle = `${title} ${role}`.toLowerCase();

      const person = {
        name: `${contact.firstName} ${contact.lastName}`,
        title: contact.title || contact.role || 'N/A',
        email: contact.email || 'N/A',
        phone: contact.phone || 'N/A',
        linkedin: contact.linkedin || 'N/A'
      };

      if (fullTitle.includes('ceo') || fullTitle.includes('chief executive')) {
        executives.ceo.push(person);
      } else if (fullTitle.includes('cfo') || fullTitle.includes('chief financial')) {
        executives.cfo.push(person);
      } else if (fullTitle.includes('controller')) {
        executives.controller.push(person);
      } else if (fullTitle.includes('cio') || fullTitle.includes('chief information') ||
                 (fullTitle.includes('it') && fullTitle.includes('head'))) {
        executives.itHead.push(person);
      } else if (fullTitle.includes('vp') && fullTitle.includes('it') ||
                 fullTitle.includes('vp') && fullTitle.includes('technology')) {
        executives.vpIT.push(person);
      } else if (fullTitle.includes('it ') || fullTitle.includes('technology') ||
                 fullTitle.includes('software') || fullTitle.includes('developer') ||
                 fullTitle.includes('engineer') || fullTitle.includes('technical')) {
        executives.itStaff.push(person);
      } else {
        executives.other.push(person);
      }
    });

    // Print results
    if (executives.ceo.length > 0) {
      console.log('\n📌 CEO / Chief Executive Officer:');
      executives.ceo.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.cfo.length > 0) {
      console.log('\n📌 CFO / Chief Financial Officer:');
      executives.cfo.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.controller.length > 0) {
      console.log('\n📌 Controller:');
      executives.controller.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.itHead.length > 0) {
      console.log('\n📌 IT Head / CIO:');
      executives.itHead.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.vpIT.length > 0) {
      console.log('\n📌 VP of IT:');
      executives.vpIT.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.itStaff.length > 0) {
      console.log('\n📌 IT Staff / Technical Team:');
      executives.itStaff.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    if (executives.other.length > 0) {
      console.log('\n📌 Other Key Personnel:');
      executives.other.forEach(p => {
        console.log(`   ✓ ${p.name} - ${p.title}`);
        console.log(`     Email: ${p.email}`);
        console.log(`     Phone: ${p.phone}`);
        console.log(`     LinkedIn: ${p.linkedin}\n`);
      });
    }

    console.log('═'.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Contacts: ${contacts.length}`);
    console.log(`   CEO: ${executives.ceo.length}`);
    console.log(`   CFO: ${executives.cfo.length}`);
    console.log(`   Controller: ${executives.controller.length}`);
    console.log(`   IT Head/CIO: ${executives.itHead.length}`);
    console.log(`   VP of IT: ${executives.vpIT.length}`);
    console.log(`   IT Staff: ${executives.itStaff.length}`);
    console.log(`   Other: ${executives.other.length}`);

    console.log('\n✅ Done! All executives and IT personnel have been extracted.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
enrichSportStop();
