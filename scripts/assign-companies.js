#!/usr/bin/env node

/**
 * Company Assignment Script
 *
 * Assign companies to team members via API
 *
 * Usage:
 *   # Assign single company
 *   node assign-companies.js assign COMPANY_ID TEAM_MEMBER_EMAIL
 *
 *   # Bulk assign companies
 *   node assign-companies.js bulk-assign "company1,company2,company3" TEAM_MEMBER_EMAIL
 *
 *   # View assigned companies for a team member
 *   node assign-companies.js view TEAM_MEMBER_EMAIL
 *
 *   # Unassign company
 *   node assign-companies.js unassign COMPANY_ID
 *
 *   # List all team members
 *   node assign-companies.js list-team
 */

const API_URL = process.env.API_URL || 'https://brandmonkz.com/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ Error: AUTH_TOKEN environment variable is required');
  console.error('');
  console.error('Get your token:');
  console.error('  1. Login to CRM at https://brandmonkz.com');
  console.error('  2. Open browser console (F12)');
  console.error('  3. Type: localStorage.getItem("token")');
  console.error('  4. Copy the token value');
  console.error('');
  console.error('Usage: AUTH_TOKEN="your_token" node assign-companies.js [command]');
  process.exit(1);
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

async function listTeamMembers() {
  console.log('📋 Fetching team members...\n');

  const data = await apiRequest('/team');
  const members = data.teamMembers || [];

  if (members.length === 0) {
    console.log('No team members found.');
    return [];
  }

  console.log(`Found ${members.length} team member(s):\n`);
  members.forEach((member, index) => {
    console.log(`${index + 1}. ${member.firstName} ${member.lastName}`);
    console.log(`   Email: ${member.email}`);
    console.log(`   ID: ${member.id}`);
    console.log(`   Role: ${member.teamRole}`);
    console.log(`   Status: ${member.inviteAccepted ? '✅ Active' : '⏳ Pending'}`);
    console.log('');
  });

  return members;
}

async function findTeamMemberByEmail(email) {
  const members = await apiRequest('/team');
  const member = (members.teamMembers || []).find(m =>
    m.email.toLowerCase() === email.toLowerCase()
  );

  if (!member) {
    throw new Error(`Team member not found with email: ${email}`);
  }

  return member;
}

async function assignCompany(companyId, teamMemberEmail) {
  console.log(`🔄 Assigning company ${companyId} to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  const result = await apiRequest(`/companies/${companyId}/assign`, 'POST', {
    assignToUserId: member.id,
  });

  console.log('✅ Company assigned successfully!');
  console.log(`   Company: ${result.company.name}`);
  console.log(`   Website: ${result.company.website || 'N/A'}`);
  console.log(`   Assigned to: ${member.firstName} ${member.lastName}`);
  console.log('');
}

async function bulkAssignCompanies(companyIds, teamMemberEmail) {
  console.log(`🔄 Bulk assigning ${companyIds.length} companies to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  const result = await apiRequest('/companies/bulk-assign', 'POST', {
    companyIds,
    assignToUserId: member.id,
  });

  console.log('✅ Companies assigned successfully!');
  console.log(`   Assigned: ${result.assignedCount || companyIds.length} companies`);
  console.log(`   To: ${member.firstName} ${member.lastName}`);
  console.log('');
}

async function viewAssignedCompanies(teamMemberEmail) {
  console.log(`🏢 Fetching companies assigned to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  console.log(`Team Member: ${member.firstName} ${member.lastName}`);
  console.log(`Email: ${member.email}`);
  console.log(`ID: ${member.id}`);
  console.log('');
  console.log('To view assigned companies, the team member should:');
  console.log('  1. Login to CRM at https://brandmonkz.com');
  console.log('  2. Navigate to Companies page');
  console.log('  3. Click "Assigned to Me" filter');
  console.log('');
  console.log('Or use API:');
  console.log(`  GET ${API_URL}/companies/assigned-to-me`);
  console.log(`  Authorization: Bearer TEAM_MEMBER_TOKEN`);
  console.log('');
}

async function unassignCompany(companyId) {
  console.log(`🔄 Unassigning company ${companyId}...\n`);

  const result = await apiRequest(`/companies/${companyId}/unassign`, 'POST');

  console.log('✅ Company unassigned successfully!');
  console.log(`   Company: ${result.company.name}`);
  console.log(`   Status: Unassigned`);
  console.log('');
}

async function main() {
  const [,, command, arg1, arg2] = process.argv;

  if (!command) {
    console.log('🏢 Company Assignment Tool\n');
    console.log('Commands:');
    console.log('  list-team                          List all team members');
    console.log('  assign COMPANY_ID EMAIL            Assign company to team member');
    console.log('  bulk-assign "id1,id2,id3" EMAIL    Bulk assign companies');
    console.log('  view EMAIL                         View team member info');
    console.log('  unassign COMPANY_ID                Unassign company');
    console.log('');
    console.log('Examples:');
    console.log('  AUTH_TOKEN="..." node assign-companies.js list-team');
    console.log('  AUTH_TOKEN="..." node assign-companies.js assign company_123 jm@techcloudpro.com');
    console.log('  AUTH_TOKEN="..." node assign-companies.js bulk-assign "c1,c2,c3" jm@techcloudpro.com');
    console.log('');
    process.exit(0);
  }

  try {
    switch (command) {
      case 'list-team':
        await listTeamMembers();
        break;

      case 'assign':
        if (!arg1 || !arg2) {
          throw new Error('Usage: assign COMPANY_ID EMAIL');
        }
        await assignCompany(arg1, arg2);
        break;

      case 'bulk-assign':
        if (!arg1 || !arg2) {
          throw new Error('Usage: bulk-assign "id1,id2,id3" EMAIL');
        }
        const companyIds = arg1.split(',').map(id => id.trim());
        await bulkAssignCompanies(companyIds, arg2);
        break;

      case 'view':
        if (!arg1) {
          throw new Error('Usage: view EMAIL');
        }
        await viewAssignedCompanies(arg1);
        break;

      case 'unassign':
        if (!arg1) {
          throw new Error('Usage: unassign COMPANY_ID');
        }
        await unassignCompany(arg1);
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
