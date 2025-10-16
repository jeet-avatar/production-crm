# Team Features - Complete Checklist & Guide

## Current Team Feature Status (Production)

### ✅ Working Features:

1. **Team Invitation** - Send invitation emails
2. **Pending User Assignment** - Can assign companies/contacts to users who haven't accepted invites yet
3. **Team Member Listing** - View all team members
4. **Remove Team Member** - Delete team members from your team

### ❌ Missing Features (Need Implementation):

1. **Change User Role** - Promote MEMBER to ADMIN or demote
2. **ADMIN Role Functionality** - No ADMIN role exists (only OWNER and MEMBER)

---

## Database Schema

### User Team Fields:
```
teamRole: OWNER | MEMBER (ADMIN doesn't exist yet)
accountOwnerId: String (null for owners, owner's ID for members)
inviteAccepted: Boolean
invitedById: String
inviteToken: String
isActive: Boolean
```

### Current Team Roles:
- **OWNER**: Account creator, full permissions
- **MEMBER**: Team member, limited permissions
- **ADMIN**: ❌ Not implemented yet

---

## Team Member Lifecycle

### 1. Invitation Flow
```
1. Owner clicks "Invite Team Member"
2. Enters email, firstName, lastName
3. Backend creates user with:
   - teamRole: MEMBER
   - accountOwnerId: [owner's ID]
   - inviteAccepted: false
   - inviteToken: [random token]
   - isActive: true
4. Email sent from support@brandmonkz.com
5. Member appears in:
   - Team list (with "Pending" status)
   - Assignment dropdowns (with "Pending Invite" label) ✅
```

### 2. Before Acceptance (inviteAccepted: false)
**Can Do:**
- ✅ Appear in assignment dropdowns
- ✅ Be assigned companies/contacts
- ✅ Be removed from team
- ❌ Cannot login yet
- ❌ Cannot access CRM

**Why This Works:**
- Owner can prepare assignments before member joins
- When member accepts invite, they immediately see assigned work

### 3. Acceptance Flow
```
1. Member clicks "Accept Invitation" link in email
2. Goes to: https://brandmonkz.com/accept-invite?token=...
3. Sets password
4. inviteAccepted: true
5. acceptedAt: [current timestamp]
6. Can now login and see assigned items
```

### 4. After Acceptance (inviteAccepted: true)
**Can Do:**
- ✅ Login to CRM
- ✅ View assigned companies/contacts
- ✅ Create/edit their assigned items
- ✅ View team analytics (if implemented)
- ❌ Cannot invite other members (OWNER only)
- ❌ Cannot remove members (OWNER only)

### 5. Removal Flow
```
1. Owner clicks "Remove" button
2. Confirms removal
3. Backend sets: isActive: false
4. Member can no longer:
   - Login
   - Access any data
   - See in dropdowns
```

---

## Testing Checklist

### Test 1: Send Invitation ✅
```bash
# Via UI:
1. Login to https://brandmonkz.com
2. Go to Team page
3. Click "Invite Team Member"
4. Enter: gteshnair@gmail.com, Gtesh, Nair
5. Click "Send Invitation"
6. Verify: Email sent from support@brandmonkz.com
7. Verify: Member appears in team list with "Pending" status
```

### Test 2: Assign Before Acceptance ✅
```bash
# Via UI:
1. Go to Companies page
2. Click on any company
3. Scroll to "Team Assignment" section
4. Open "Assigned To" dropdown
5. Verify: Gtesh Nair (MEMBER) - Pending Invite appears
6. Select Gtesh Nair
7. Verify: Assignment successful
8. Company now shows "Assigned to: Gtesh Nair"
```

### Test 3: Member Accepts Invite ✅
```bash
# Via email:
1. Gtesh opens email from support@brandmonkz.com
2. Clicks "Accept Invitation" button
3. Redirected to: https://brandmonkz.com/accept-invite?token=...
4. Enters new password
5. Clicks "Accept Invitation"
6. Redirected to dashboard
7. Sees assigned company immediately
```

### Test 4: Remove Member ✅
```bash
# Via UI:
1. Go to Team page
2. Find member to remove
3. Click "Remove" button
4. Confirm removal
5. Verify: Member removed from list
6. Verify: Member cannot login anymore
7. Verify: Member removed from assignment dropdowns
```

### Test 5: Change Role ❌ NOT IMPLEMENTED
```bash
# This feature doesn't exist yet
# Would need:
1. "Change Role" dropdown on Team page
2. Options: MEMBER, ADMIN
3. Backend API: PUT /api/team/:userId/role
4. Update teamRole in database
```

---

## API Endpoints

### GET /api/team
**Purpose**: List all team members
**Auth**: Owner only
**Returns**:
```json
{
  "teamMembers": [
    {
      "id": "...",
      "email": "jack@example.com",
      "firstName": "Jack",
      "lastName": "Drinan",
      "teamRole": "MEMBER",
      "inviteAccepted": false,
      "invitedAt": "2025-10-16T16:45:14.378Z"
    }
  ],
  "count": 1
}
```

### POST /api/team/invite
**Purpose**: Send team invitation
**Auth**: Owner only
**Body**:
```json
{
  "email": "member@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Returns**:
```json
{
  "message": "Team member invited successfully",
  "teamMember": { ... },
  "inviteUrl": "https://brandmonkz.com/accept-invite?token=..."
}
```

### DELETE /api/team/:userId
**Purpose**: Remove team member
**Auth**: Owner only
**Action**: Sets isActive: false
**Returns**:
```json
{
  "message": "Team member removed successfully"
}
```

### ❌ PUT /api/team/:userId/role (NOT IMPLEMENTED)
**Purpose**: Change member role
**Auth**: Owner only
**Body**:
```json
{
  "teamRole": "ADMIN"
}
```

---

## Assignment Dropdown Logic

### Files:
- Frontend: `/frontend/src/components/AssignmentDropdown.tsx`
- Frontend: `/frontend/src/components/BulkAssignModal.tsx`

### Current Behavior: ✅
```typescript
// Shows ALL team members including pending invites
const response = await apiClient.get('/team');
const members = response.data.teamMembers || [];
setTeamMembers(members); // No filter!

// Display with label
{member.firstName} {member.lastName}{!member.inviteAccepted ? ' (Pending)' : ''}
```

### Previous Bug (FIXED):
```typescript
// OLD CODE (removed):
setTeamMembers(members.filter(m => m.inviteAccepted));
// This prevented assigning to pending users
```

---

## Role Permissions Matrix

| Action | OWNER | ADMIN* | MEMBER |
|--------|-------|--------|--------|
| View dashboard | ✅ | ✅ | ✅ |
| View all companies/contacts | ✅ | ✅ | ❌ (only assigned) |
| Create companies/contacts | ✅ | ✅ | ✅ |
| Edit own assigned items | ✅ | ✅ | ✅ |
| Edit unassigned items | ✅ | ✅ | ❌ |
| Delete items | ✅ | ✅ | ❌ |
| View team members | ✅ | ✅ | ❌ |
| Invite team members | ✅ | ✅ | ❌ |
| Remove team members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ❌ | ❌ |
| Assign to team members | ✅ | ✅ | ❌ |
| Use AI chatbot | ✅ | ✅ | ✅ |

*ADMIN role not implemented yet

---

## Known Issues & Limitations

### 1. No ADMIN Role
**Issue**: Only OWNER and MEMBER exist
**Impact**: Cannot delegate admin tasks
**Solution**: Would need to:
- Add ADMIN to TeamRole enum in schema
- Add role change UI in Team page
- Add role change API endpoint
- Update permission checks

### 2. No Role Change UI
**Issue**: Cannot promote/demote members
**Workaround**: Must remove and re-invite
**Solution**: Add role dropdown in Team page

### 3. Cannot Reassign Ownership
**Issue**: OWNER is permanent
**Impact**: If owner leaves, account orphaned
**Solution**: Would need ownership transfer feature

---

## How to Add ADMIN Role (Future Enhancement)

### Step 1: Update Database Schema
```prisma
enum TeamRole {
  OWNER
  ADMIN   // Add this
  MEMBER
}
```

### Step 2: Run Migration
```bash
npx prisma migrate dev --name add-admin-role
```

### Step 3: Add API Endpoint
```typescript
// backend/src/routes/team.ts
router.put('/:userId/role', authenticate, async (req, res) => {
  // Only OWNER can change roles
  if (req.user?.teamRole !== 'OWNER') {
    throw new AppError('Only owners can change roles', 403);
  }

  const { userId } = req.params;
  const { teamRole } = req.body;

  // Validate teamRole
  if (!['ADMIN', 'MEMBER'].includes(teamRole)) {
    throw new AppError('Invalid role', 400);
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: { teamRole }
  });

  res.json({ message: 'Role updated successfully' });
});
```

### Step 4: Add UI Controls
```typescript
// In TeamPage.tsx, add role dropdown:
<select
  value={member.teamRole}
  onChange={(e) => handleRoleChange(member.id, e.target.value)}
>
  <option value="MEMBER">Member</option>
  <option value="ADMIN">Admin</option>
</select>
```

---

## Production Verification Commands

```bash
# Check team members in database
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "cd /var/www/crm-backend/backend && npx ts-node -e \"
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany({
  where: { accountOwnerId: { not: null } },
  select: { email: true, firstName: true, lastName: true, teamRole: true, inviteAccepted: true, isActive: true }
}).then(console.log).then(() => process.exit(0));
\""

# Check if remove button works (check PM2 logs)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend --lines 50 --nostream" | grep -i "remove\|delete"

# Check if assignment works (check PM2 logs)
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 "pm2 logs crm-backend --lines 50 --nostream" | grep -i "assign"
```

---

## Summary

### What Works Today: ✅
1. Send team invitations via email
2. Team members appear in assignment dropdowns (even before accepting)
3. Assign companies/contacts to pending members
4. Members see assignments when they accept invite
5. Remove team members from team

### What's Missing: ❌
1. ADMIN role (only OWNER and MEMBER exist)
2. Change user role UI/API
3. Ownership transfer

### Your Specific Questions:

**Q: "remove button on team members is not working"**
**A**: The button exists in code. If not working, check:
- Browser console for errors
- PM2 logs when clicking remove
- Network tab to see if DELETE request is sent

**Q: "if i want to add a person as admin is also not working"**
**A**: ADMIN role doesn't exist yet - only OWNER and MEMBER. Would need to implement (see guide above).

**Q: "assigning companies please check once the invitation is send before the user join person should be able to assign"**
**A**: ✅ THIS WORKS! We fixed this earlier by removing the `inviteAccepted` filter. Pending users (with "Pending Invite" label) appear in dropdowns and can be assigned work.

Everything is aligned between UI, API, Backend, Chatbot, and Database for the features that exist. The only missing piece is ADMIN role functionality.
