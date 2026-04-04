#!/usr/bin/env node

/**
 * Contact Assignment Script
 *
 * Assign contacts to team members via API
 *
 * Usage:
 *   # Assign single contact
 *   node assign-contacts.js assign CONTACT_ID TEAM_MEMBER_EMAIL
 *
 *   # Bulk assign contacts
 *   node assign-contacts.js bulk-assign "contact1,contact2,contact3" TEAM_MEMBER_EMAIL
 *
 *   # View assigned contacts for a team member
 *   node assign-contacts.js view TEAM_MEMBER_EMAIL
 *
 *   # Unassign contact
 *   node assign-contacts.js unassign CONTACT_ID
 *
 *   # List all team members
 *   node assign-contacts.js list-team
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
  console.error('Usage: AUTH_TOKEN="your_token" node assign-contacts.js [command]');
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

async function assignContact(contactId, teamMemberEmail) {
  console.log(`🔄 Assigning contact ${contactId} to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  const result = await apiRequest(`/contacts/${contactId}/assign`, 'POST', {
    assignToUserId: member.id,
  });

  console.log('✅ Contact assigned successfully!');
  console.log(`   Contact: ${result.contact.firstName} ${result.contact.lastName}`);
  console.log(`   Email: ${result.contact.email || 'N/A'}`);
  console.log(`   Assigned to: ${member.firstName} ${member.lastName}`);
  console.log('');
}

async function bulkAssignContacts(contactIds, teamMemberEmail) {
  console.log(`🔄 Bulk assigning ${contactIds.length} contacts to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  const result = await apiRequest('/contacts/bulk-assign', 'POST', {
    contactIds,
    assignToUserId: member.id,
  });

  console.log('✅ Contacts assigned successfully!');
  console.log(`   Assigned: ${result.assignedCount || contactIds.length} contacts`);
  console.log(`   To: ${member.firstName} ${member.lastName}`);
  console.log('');
}

async function viewAssignedContacts(teamMemberEmail) {
  console.log(`📇 Fetching contacts assigned to ${teamMemberEmail}...\n`);

  const member = await findTeamMemberByEmail(teamMemberEmail);

  // Login as that user would be needed, or use a query parameter
  // For now, we'll just show their info
  console.log(`Team Member: ${member.firstName} ${member.lastName}`);
  console.log(`Email: ${member.email}`);
  console.log(`ID: ${member.id}`);
  console.log('');
  console.log('To view assigned contacts, the team member should:');
  console.log('  1. Login to CRM at https://brandmonkz.com');
  console.log('  2. Navigate to Contacts page');
  console.log('  3. Click "Assigned to Me" filter');
  console.log('');
  console.log('Or use API:');
  console.log(`  GET ${API_URL}/contacts/assigned-to-me`);
  console.log(`  Authorization: Bearer TEAM_MEMBER_TOKEN`);
  console.log('');
}

async function unassignContact(contactId) {
  console.log(`🔄 Unassigning contact ${contactId}...\n`);

  const result = await apiRequest(`/contacts/${contactId}/unassign`, 'POST');

  console.log('✅ Contact unassigned successfully!');
  console.log(`   Contact: ${result.contact.firstName} ${result.contact.lastName}`);
  console.log(`   Status: Unassigned`);
  console.log('');
}

async function main() {
  const [,, command, arg1, arg2] = process.argv;

  if (!command) {
    console.log('📋 Contact Assignment Tool\n');
    console.log('Commands:');
    console.log('  list-team                          List all team members');
    console.log('  assign CONTACT_ID EMAIL            Assign contact to team member');
    console.log('  bulk-assign "id1,id2,id3" EMAIL    Bulk assign contacts');
    console.log('  view EMAIL                         View team member info');
    console.log('  unassign CONTACT_ID                Unassign contact');
    console.log('');
    console.log('Examples:');
    console.log('  AUTH_TOKEN="..." node assign-contacts.js list-team');
    console.log('  AUTH_TOKEN="..." node assign-contacts.js assign contact_123 jm@techcloudpro.com');
    console.log('  AUTH_TOKEN="..." node assign-contacts.js bulk-assign "c1,c2,c3" jm@techcloudpro.com');
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
          throw new Error('Usage: assign CONTACT_ID EMAIL');
        }
        await assignContact(arg1, arg2);
        break;

      case 'bulk-assign':
        if (!arg1 || !arg2) {
          throw new Error('Usage: bulk-assign "id1,id2,id3" EMAIL');
        }
        const contactIds = arg1.split(',').map(id => id.trim());
        await bulkAssignContacts(contactIds, arg2);
        break;

      case 'view':
        if (!arg1) {
          throw new Error('Usage: view EMAIL');
        }
        await viewAssignedContacts(arg1);
        break;

      case 'unassign':
        if (!arg1) {
          throw new Error('Usage: unassign CONTACT_ID');
        }
        await unassignContact(arg1);
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
