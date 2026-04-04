# 📋 Team Assignment Scripts - User Guide

**Created**: October 14, 2025
**Purpose**: Manage contact and company assignments via API

---

## 🎯 Overview

These scripts allow you to assign contacts and companies to team members using the CRM API. They're useful for:

- **Bulk assignment** - Distribute work among team members efficiently
- **Territory management** - Assign by location, industry, or other criteria
- **Workload balancing** - Evenly distribute contacts/companies
- **Testing** - Test assignment features before UI is complete
- **Automation** - Integrate with other tools/scripts

---

## 📦 What's Included

| Script | Purpose |
|--------|---------|
| `assign-contacts.js` | Assign contacts to team members |
| `assign-companies.js` | Assign companies to team members |

---

## 🚀 Quick Start

### Step 1: Get Your Auth Token

1. Login to CRM at https://brandmonkz.com
2. Open browser console (Press `F12`)
3. Type: `localStorage.getItem("token")`
4. Copy the token value (long string)

### Step 2: Set Environment Variable

```bash
export AUTH_TOKEN="your_token_here"
```

Or use inline:

```bash
AUTH_TOKEN="your_token" node script.js [command]
```

### Step 3: Run Commands

```bash
# List team members
node scripts/assign-contacts.js list-team

# Assign a contact
node scripts/assign-contacts.js assign CONTACT_ID jm@techcloudpro.com
```

---

## 📖 Contact Assignment Commands

### List Team Members

```bash
node scripts/assign-contacts.js list-team
```

**Output:**
```
📋 Fetching team members...

Found 2 team member(s):

1. Samiksh Manoharan
   Email: jm@techcloudpro.com
   ID: cmgps60kq0001yi4nq4b3s1oo
   Role: MEMBER
   Status: ✅ Active

2. Rajesh Manoharan
   Email: rajesh@techcloudpro.com
   ID: user_rajesh_id
   Role: MEMBER
   Status: ⏳ Pending
```

### Assign Single Contact

```bash
node scripts/assign-contacts.js assign CONTACT_ID EMAIL
```

**Example:**
```bash
node scripts/assign-contacts.js assign cmgmxdp560005ls8o33t2hv7i jm@techcloudpro.com
```

**Output:**
```
🔄 Assigning contact cmgmxdp560005ls8o33t2hv7i to jm@techcloudpro.com...

✅ Contact assigned successfully!
   Contact: James Kimball
   Email: james@example.com
   Assigned to: Samiksh Manoharan
```

### Bulk Assign Contacts

```bash
node scripts/assign-contacts.js bulk-assign "ID1,ID2,ID3" EMAIL
```

**Example:**
```bash
node scripts/assign-contacts.js bulk-assign "contact1,contact2,contact3,contact4,contact5" jm@techcloudpro.com
```

**Output:**
```
🔄 Bulk assigning 5 contacts to jm@techcloudpro.com...

✅ Contacts assigned successfully!
   Assigned: 5 contacts
   To: Samiksh Manoharan
```

### View Team Member Info

```bash
node scripts/assign-contacts.js view EMAIL
```

**Example:**
```bash
node scripts/assign-contacts.js view jm@techcloudpro.com
```

**Output:**
```
📇 Fetching contacts assigned to jm@techcloudpro.com...

Team Member: Samiksh Manoharan
Email: jm@techcloudpro.com
ID: cmgps60kq0001yi4nq4b3s1oo

To view assigned contacts, the team member should:
  1. Login to CRM at https://brandmonkz.com
  2. Navigate to Contacts page
  3. Click "Assigned to Me" filter

Or use API:
  GET https://brandmonkz.com/api/contacts/assigned-to-me
  Authorization: Bearer TEAM_MEMBER_TOKEN
```

### Unassign Contact

```bash
node scripts/assign-contacts.js unassign CONTACT_ID
```

**Example:**
```bash
node scripts/assign-contacts.js unassign cmgmxdp560005ls8o33t2hv7i
```

**Output:**
```
🔄 Unassigning contact cmgmxdp560005ls8o33t2hv7i...

✅ Contact unassigned successfully!
   Contact: James Kimball
   Status: Unassigned
```

---

## 🏢 Company Assignment Commands

### List Team Members

```bash
node scripts/assign-companies.js list-team
```

(Same output as contacts)

### Assign Single Company

```bash
node scripts/assign-companies.js assign COMPANY_ID EMAIL
```

**Example:**
```bash
node scripts/assign-companies.js assign cmgmxdp4l0001ls8o6c9m6b8r jm@techcloudpro.com
```

**Output:**
```
🔄 Assigning company cmgmxdp4l0001ls8o6c9m6b8r to jm@techcloudpro.com...

✅ Company assigned successfully!
   Company: Slingshot Sports
   Website: https://slingshot.com
   Assigned to: Samiksh Manoharan
```

### Bulk Assign Companies

```bash
node scripts/assign-companies.js bulk-assign "ID1,ID2,ID3" EMAIL
```

**Example:**
```bash
node scripts/assign-companies.js bulk-assign "company1,company2,company3" rajesh@techcloudpro.com
```

### Unassign Company

```bash
node scripts/assign-companies.js unassign COMPANY_ID
```

---

## 💡 Common Use Cases

### Use Case 1: Distribute Leads by Territory

**Scenario**: You have 50 new leads. Assign California leads to JM, Texas leads to Rajesh.

```bash
# First, get contact IDs for California contacts
# (Use CRM UI or API to filter by location)

# Assign California contacts to JM
node scripts/assign-contacts.js bulk-assign "ca_contact1,ca_contact2,ca_contact3..." jm@techcloudpro.com

# Assign Texas contacts to Rajesh
node scripts/assign-contacts.js bulk-assign "tx_contact1,tx_contact2,tx_contact3..." rajesh@techcloudpro.com
```

### Use Case 2: Assign by Industry

```bash
# Assign tech companies to JM (who has tech experience)
node scripts/assign-companies.js bulk-assign "tech_company1,tech_company2..." jm@techcloudpro.com

# Assign manufacturing companies to Rajesh
node scripts/assign-companies.js bulk-assign "mfg_company1,mfg_company2..." rajesh@techcloudpro.com
```

### Use Case 3: Workload Balancing

```bash
# Assign first 25 contacts to JM
node scripts/assign-contacts.js bulk-assign "contact1,contact2,...,contact25" jm@techcloudpro.com

# Assign next 25 contacts to Rajesh
node scripts/assign-contacts.js bulk-assign "contact26,contact27,...,contact50" rajesh@techcloudpro.com
```

### Use Case 4: Reassign Work

```bash
# Unassign from JM (who is on vacation)
node scripts/assign-contacts.js unassign contact1
node scripts/assign-contacts.js unassign contact2

# Reassign to Rajesh
node scripts/assign-contacts.js assign contact1 rajesh@techcloudpro.com
node scripts/assign-contacts.js assign contact2 rajesh@techcloudpro.com
```

---

## 🔍 Getting Contact/Company IDs

### Method 1: From CRM UI

1. Go to Contacts or Companies page
2. Click on a contact/company
3. Look at the URL: `https://brandmonkz.com/contacts/CONTACT_ID`
4. The ID is in the URL

### Method 2: From API

```bash
# Get contacts
curl https://brandmonkz.com/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.contacts[].id'

# Get companies
curl https://brandmonkz.com/api/companies \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.companies[].id'
```

### Method 3: From Database

```bash
# SSH to server
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224

# Query database
PGPASSWORD='...' psql -h ... -U brandmonkz -d brandmonkz_crm_sandbox \
  -c "SELECT id, \"firstName\", \"lastName\", email FROM contacts LIMIT 10;"
```

---

## 🛠️ Advanced Usage

### Create a Bash Script for Bulk Operations

```bash
#!/bin/bash
# assign-california-leads.sh

# California contact IDs (from CRM export or API)
CONTACTS=(
  "contact_id_1"
  "contact_id_2"
  "contact_id_3"
  # ... more IDs
)

# Join array into comma-separated string
IDS=$(IFS=,; echo "${CONTACTS[*]}")

# Assign to JM
AUTH_TOKEN="$AUTH_TOKEN" node scripts/assign-contacts.js bulk-assign "$IDS" jm@techcloudpro.com
```

### Integrate with CSV Import

```javascript
// assign-from-csv.js
const fs = require('fs');
const csv = require('csv-parser');

const contactsToAssign = [];

fs.createReadStream('contacts.csv')
  .pipe(csv())
  .on('data', (row) => {
    if (row.territory === 'California') {
      contactsToAssign.push(row.contact_id);
    }
  })
  .on('end', () => {
    const ids = contactsToAssign.join(',');
    console.log(`Assigning ${contactsToAssign.length} contacts...`);
    // Run assign command
  });
```

---

## ⚠️ Important Notes

### Security

- **Never commit** your AUTH_TOKEN to git
- **Rotate tokens** periodically
- **Use environment variables** for sensitive data
- **Limit script access** to authorized users only

### Limitations

- Token expires after some time - get a fresh one if script fails
- Bulk operations may take time for large datasets
- Team member must have `inviteAccepted: true` to be assigned work
- Only account owners can assign resources

### Best Practices

1. **Test first** - Try with one contact before bulk operations
2. **Keep records** - Log what you assign to whom
3. **Communicate** - Tell team members when you assign work
4. **Balance workload** - Don't overload one team member
5. **Regular reviews** - Check assignments periodically

---

## 🐛 Troubleshooting

### Error: "AUTH_TOKEN environment variable is required"

**Solution**: Set your token:
```bash
export AUTH_TOKEN="your_token_here"
```

### Error: "Team member not found with email: ..."

**Solution**:
1. Check email spelling
2. Run `list-team` to see available members
3. Ensure team member has accepted invitation

### Error: "Invalid token" or "Unauthorized"

**Solution**:
1. Get a fresh token from browser console
2. Make sure you're logged in as account owner
3. Check token wasn't truncated when copying

### Error: "Contact not found"

**Solution**:
1. Verify contact ID is correct
2. Check if contact still exists in database
3. Make sure you have permission to access this contact

---

## 📊 Workflow Example

Here's a complete workflow for assigning 50 new leads:

```bash
# Step 1: List your team
AUTH_TOKEN="your_token" node scripts/assign-contacts.js list-team

# Step 2: Get contact IDs from CRM (example IDs)
# California leads: c1, c2, c3, ... c25
# Texas leads: c26, c27, c28, ... c50

# Step 3: Assign California leads to JM
AUTH_TOKEN="your_token" node scripts/assign-contacts.js bulk-assign \
  "c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14,c15,c16,c17,c18,c19,c20,c21,c22,c23,c24,c25" \
  jm@techcloudpro.com

# Step 4: Assign Texas leads to Rajesh
AUTH_TOKEN="your_token" node scripts/assign-contacts.js bulk-assign \
  "c26,c27,c28,c29,c30,c31,c32,c33,c34,c35,c36,c37,c38,c39,c40,c41,c42,c43,c44,c45,c46,c47,c48,c49,c50" \
  rajesh@techcloudpro.com

# Step 5: Verify (team members login and check "Assigned to Me")
```

---

## 🎉 Success!

You now have powerful CLI tools to manage team assignments!

**Next Steps:**
1. Try the `list-team` command
2. Assign a test contact
3. Login as team member to verify
4. Scale up to bulk operations

**Questions?**
- Check `/tmp/COLLABORATION_MODEL_EXPLAINED.md` for detailed info
- Review API documentation in backend code
- Test in sandbox environment first

---

**Created with** 🤖 **Claude Code**
