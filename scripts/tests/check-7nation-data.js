#!/usr/bin/env node

/**
 * Check 7 Nation company data and LinkedIn employee information
 */

const fetch = require('node-fetch');

const API_URL = 'https://brandmonkz.com/api';

async function check7NationData() {
  try {
    // You need to provide auth token
    const token = process.env.AUTH_TOKEN;

    if (!token) {
      console.error('❌ Error: AUTH_TOKEN environment variable is required');
      console.log('\nUsage:');
      console.log('  AUTH_TOKEN="your_token" node check-7nation-data.js');
      console.log('\nGet your token from browser console:');
      console.log('  localStorage.getItem("token")');
      process.exit(1);
    }

    console.log('🔍 Searching for 7 Nation company...\n');

    // Search for the company
    const searchResponse = await fetch(`${API_URL}/companies?search=7+Nation`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!searchResponse.ok) {
      throw new Error(`API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.companies || searchData.companies.length === 0) {
      console.log('❌ Company "7 Nation" not found');
      return;
    }

    const company = searchData.companies[0];
    console.log('✅ Company found:', company.name);
    console.log('\n📊 Company Details:');
    console.log('  ID:', company.id);
    console.log('  Website:', company.website || 'Not set');
    console.log('  LinkedIn:', company.linkedin || 'Not set');
    console.log('  Employee Count:', company.employeeCount || 'Not set');
    console.log('  Industry:', company.industry || 'Not set');
    console.log('  Location:', company.location || 'Not set');

    // Get full company details
    console.log('\n🔍 Fetching full company details...\n');

    const detailResponse = await fetch(`${API_URL}/companies/${company.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!detailResponse.ok) {
      throw new Error(`API error: ${detailResponse.status} ${detailResponse.statusText}`);
    }

    const fullCompany = await detailResponse.json();

    console.log('📧 Contacts:', fullCompany.contacts?.length || 0);
    if (fullCompany.contacts && fullCompany.contacts.length > 0) {
      console.log('\n👥 Contact List:');
      fullCompany.contacts.forEach((contact, i) => {
        console.log(`  ${i + 1}. ${contact.firstName} ${contact.lastName}`);
        if (contact.title) console.log(`     Title: ${contact.title}`);
        if (contact.email) console.log(`     Email: ${contact.email}`);
      });
    }

    console.log('\n🔄 Enrichment Status:');
    console.log('  AI Enriched:', fullCompany.enriched ? 'Yes' : 'No');
    console.log('  SocialFlow Enriched:', fullCompany.socialFlowEnriched ? 'Yes' : 'No');

    if (fullCompany.socialFlowData) {
      console.log('\n📦 SocialFlow Data:');
      console.log(JSON.stringify(fullCompany.socialFlowData, null, 2));
    }

    // Check if there's a way to get LinkedIn employees
    console.log('\n💡 Analysis:');
    console.log('─────────────────────────────────────────────────────────');

    if (!fullCompany.linkedin) {
      console.log('⚠️  No LinkedIn URL set for this company');
      console.log('   Action needed: Add LinkedIn company URL to enable employee scraping');
    } else {
      console.log('✅ LinkedIn URL is set:', fullCompany.linkedin);

      if (!fullCompany.socialFlowEnriched) {
        console.log('⚠️  SocialFlow enrichment not performed yet');
        console.log('   Action: Click "Enrich with AI" button to fetch LinkedIn data');
      } else {
        console.log('✅ SocialFlow enrichment completed');

        if (fullCompany.socialFlowData?.employees) {
          console.log('✅ Employee data available:', fullCompany.socialFlowData.employees);
        } else {
          console.log('❌ No employee data found in SocialFlow');
          console.log('   This may indicate:');
          console.log('   1. LinkedIn URL is not accessible');
          console.log('   2. LinkedIn data requires authentication');
          console.log('   3. SocialFlow API does not provide employee lists');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

check7NationData();
