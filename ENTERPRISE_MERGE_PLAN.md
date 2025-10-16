# 🏢 ENTERPRISE-LEVEL MERGE PLAN
## Team Invitation System - Production Deployment

**Target Environment**: BrandMonkz CRM Production (https://brandmonkz.com)
**Compliance**: SOX, Regression Testing, Concurrency Testing
**Risk Level**: MEDIUM (Conflicts with existing code)
**Estimated Time**: 2-3 weeks (with full testing)

---

## ⚠️ CRITICAL: CONFLICTS IDENTIFIED

### 🔴 HIGH-SEVERITY CONFLICTS

| File | Production | New Code | Issue | Resolution |
|------|-----------|----------|-------|------------|
| **User Schema** | `passwordHash: String` | `password: String` | Field name mismatch | ✅ Keep `passwordHash`, update new code |
| **User Schema** | `teamRole: TeamRole` (enum) | `role: String` | Type mismatch | ✅ Keep `TeamRole` enum |
| **User Schema** | `inviteToken: String?` | `verificationToken: String?` | Field overlap | ✅ Use `inviteToken` for team invites |
| **Team Routes** | `/routes/team.ts` | `team.routes.ts` | Duplicate file | ✅ Merge features into existing |

### 🟡 MEDIUM-SEVERITY CONFLICTS

| File | Production | New Code | Issue | Resolution |
|------|-----------|----------|-------|------------|
| **AcceptInvite Page** | `AcceptInvitePage.tsx` | `AcceptInvite.tsx` | Duplicate functionality | ✅ Enhance existing page |
| **Team Page** | `TeamPage.tsx` | `Team.tsx` | Different UI approach | ✅ Merge UI improvements |
| **Auth Middleware** | `/middleware/auth.ts` | `auth.middleware.ts` | Different approach | ✅ Enhance existing middleware |

---

## 📋 FILE-BY-FILE MERGE INSTRUCTIONS

### **FILE 1: backend/src/services/email.service.ts**

**Status**: ✅ ALREADY UPDATED (OTP verification added earlier)

**Action Required**: ADD team invitation email function

```typescript
// Add this method to existing EmailService class (after sendVerificationEmail):

/**
 * Send team invitation email
 * @param email - Recipient email
 * @param inviterName - Name of person inviting
 * @param inviteToken - Invitation token
 * @returns Promise<boolean> - Success status
 */
async sendTeamInviteEmail(email: string, inviterName: string, inviteToken: string): Promise<boolean> {
  try {
    const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👥 Team Invitation</h1>
    </div>
    <div class="content">
      <p><strong>${inviterName}</strong> has invited you to join their team on BrandMonkz CRM.</p>
      <p>Click the button below to accept the invitation and create your account:</p>
      <center>
        <a href="${inviteUrl}" class="button">Accept Invitation →</a>
      </center>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This invitation expires in 7 days.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} BrandMonkz CRM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const info = await this.transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: `${inviterName} invited you to join BrandMonkz CRM`,
      html: htmlContent,
      text: `${inviterName} has invited you to join their team on BrandMonkz CRM.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    });

    console.log(`✅ Team invite email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending team invite email:', error);
    return false;
  }
}
```

**Testing**:
```bash
# Test email sending
node -e "
const { EmailService } = require('./dist/services/email.service');
const service = new EmailService();
service.sendTeamInviteEmail('test@example.com', 'John Doe', 'test-token-123')
  .then(() => console.log('✅ Test email sent'))
  .catch(err => console.error('❌ Test failed:', err));
"
```

---

### **FILE 2: backend/src/routes/team.ts**

**Status**: ⚠️ EXISTS - NEEDS ENHANCEMENT

**Current Features**:
- ✅ Invite team member
- ✅ Accept invitation
- ✅ Verify invitation token
- ❌ Missing: Resend invitation
- ❌ Missing: Remove team member
- ❌ Missing: Get team members list

**Action Required**: ADD missing endpoints to existing file

```typescript
// Add these endpoints to existing backend/src/routes/team.ts

// ADD AFTER existing endpoints, BEFORE the export:

/**
 * GET /api/team/members
 * Get all team members (authenticated users only)
 */
router.get('/members', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new AppError('User not found', 404);
    }

    // Determine account owner
    const accountOwnerId = currentUser.teamRole === 'OWNER'
      ? currentUser.id
      : currentUser.accountOwnerId;

    if (!accountOwnerId) {
      // Solo user - return just themselves
      return res.json({ members: [currentUser] });
    }

    // Get all team members
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { id: accountOwnerId }, // Owner
          { accountOwnerId: accountOwnerId }, // Team members
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        teamRole: true,
        isActive: true,
        emailVerified: true,
        inviteAccepted: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/team/members/:memberId
 * Remove team member (owner only)
 */
router.delete('/members/:memberId', authenticate, async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const userId = req.user!.userId;

    // Get current user and verify they're owner
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || currentUser.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can remove team members', 403);
    }

    // Prevent removing self
    if (memberId === userId) {
      throw new AppError('Cannot remove yourself from the team', 400);
    }

    // Get member
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new AppError('Team member not found', 404);
    }

    // Verify member belongs to this owner's team
    if (member.accountOwnerId !== userId) {
      throw new AppError('You can only remove members from your own team', 403);
    }

    // Delete member (CASCADE will remove their data)
    await prisma.user.delete({
      where: { id: memberId },
    });

    logger.info(`Team member removed: ${member.email} by ${currentUser.email}`);

    res.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/team/resend-invite/:memberId
 * Resend invitation (owner only)
 */
router.post('/resend-invite/:memberId', authenticate, async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const userId = req.user!.userId;

    // Get current user and verify they're owner
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser || currentUser.teamRole !== 'OWNER') {
      throw new AppError('Only account owners can resend invitations', 403);
    }

    // Get member
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new AppError('Invitation not found', 404);
    }

    // Verify member belongs to this owner's team
    if (member.accountOwnerId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    // Check if already accepted
    if (member.inviteAccepted) {
      throw new AppError('User has already accepted the invitation', 400);
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    // Update invitation
    await prisma.user.update({
      where: { id: memberId },
      data: {
        inviteToken: newToken,
        invitedAt: new Date(),
      },
    });

    // Resend email
    const { EmailService } = require('../services/email.service');
    const emailService = new EmailService();
    await emailService.sendTeamInviteEmail(
      member.email,
      `${currentUser.firstName} ${currentUser.lastName}`,
      newToken
    );

    logger.info(`Invitation resent to: ${member.email}`);

    res.json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    next(error);
  }
});
```

**Testing**:
```bash
# Test get members
curl -X GET https://brandmonkz.com/api/team/members \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test remove member
curl -X DELETE https://brandmonkz.com/api/team/members/MEMBER_ID \
  -H "Authorization: Bearer OWNER_TOKEN"

# Test resend invite
curl -X POST https://brandmonkz.com/api/team/resend-invite/MEMBER_ID \
  -H "Authorization: Bearer OWNER_TOKEN"
```

---

### **FILE 3: frontend/src/pages/Team/TeamPage.tsx**

**Status**: ✅ EXISTS - NEEDS UI ENHANCEMENTS

**Action Required**: ENHANCE existing TeamPage with new features

```typescript
// Add these improvements to existing TeamPage.tsx:

// 1. ADD Resend Invitation button
{!member.inviteAccepted && member.id !== user?.id && (
  <button
    onClick={() => handleResendInvite(member.id)}
    className="text-blue-600 hover:text-blue-800 text-sm"
  >
    Resend Invitation
  </button>
)}

// 2. ADD Handle Resend function
const handleResendInvite = async (memberId: string) => {
  try {
    await apiClient.post(`/team/resend-invite/${memberId}`);
    alert('Invitation resent successfully');
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to resend invitation');
  }
};

// 3. ADD Better status indicators
<td className="px-6 py-4 whitespace-nowrap">
  {member.inviteAccepted ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      ✓ Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      ⏳ Pending
    </span>
  )}
</td>
```

---

### **FILE 4: Prisma Schema - NO CHANGES NEEDED**

**Status**: ✅ ALREADY COMPATIBLE

The existing schema already has all required fields:
- ✅ `teamRole: TeamRole` (OWNER/MEMBER)
- ✅ `accountOwnerId: String?`
- ✅ `inviteToken: String?`
- ✅ `inviteAccepted: Boolean`
- ✅ `invitedAt: DateTime?`
- ✅ `emailVerified: Boolean?`
- ✅ `requirePasswordChange: Boolean`

**No schema changes required!**

---

## 🚀 DEPLOYMENT SEQUENCE

### **Phase 1: Backend Updates (Week 1)**

```bash
# Day 1-2: Add email service method
1. Update email.service.ts with sendTeamInviteEmail()
2. Test email sending locally
3. Deploy to production
4. Monitor logs for 24 hours

# Day 3-4: Add team endpoints
1. Add GET /members, DELETE /members/:id, POST /resend-invite/:id
2. Test endpoints with Postman
3. Deploy to production
4. Monitor logs for 24 hours

# Day 5: Testing
1. Run regression tests
2. Test concurrent invitations
3. Verify data isolation
4. Check audit logs
```

### **Phase 2: Frontend Updates (Week 2)**

```bash
# Day 1-2: Enhance TeamPage
1. Add resend invitation button
2. Improve status indicators
3. Add loading states
4. Test locally

# Day 3: Deploy frontend
1. Build production bundle
2. Deploy to production
3. Test on production
4. Monitor user feedback

# Day 4-5: Monitoring
1. Check error rates
2. Monitor performance
3. Gather user feedback
4. Fix any issues
```

### **Phase 3: Full Testing (Week 3)**

```bash
# Day 1: Regression Testing
1. Test all existing features
2. Verify no breaking changes
3. Check data integrity

# Day 2: Concurrency Testing
1. Test 100 simultaneous invitations
2. Test concurrent accept flows
3. Verify database locking

# Day 3: SOX Compliance Audit
1. Review audit logs
2. Check access controls
3. Verify data isolation
4. Document compliance

# Day 4-5: Sign-off
1. Get stakeholder approval
2. Document deployment
3. Update runbooks
4. Training for support team
```

---

## ✅ MERGE SAFETY CHECKLIST

**Before Deployment**:
- [ ] All conflicts resolved
- [ ] Backward compatibility verified
- [ ] Feature flags implemented
- [ ] Rollback plan documented
- [ ] Staging environment tested
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] SOX compliance verified

**During Deployment**:
- [ ] Database backup created
- [ ] Blue-green deployment ready
- [ ] Monitoring alerts configured
- [ ] Support team notified
- [ ] Rollback script ready
- [ ] Gradual rollout (10% → 50% → 100%)

**After Deployment**:
- [ ] All features working
- [ ] No error spike in logs
- [ ] Performance acceptable
- [ ] User feedback positive
- [ ] Audit trail working
- [ ] Documentation updated

---

## 🆘 ROLLBACK PLAN

### Level 1: Feature Flag Disable
```bash
# Disable new features immediately
# Set ENABLE_TEAM_FEATURES=false in .env
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224
cd /var/www/crm-backend/backend
nano .env
# Add: ENABLE_TEAM_FEATURES=false
pm2 restart crm-backend
```

### Level 2: Code Rollback
```bash
# Revert to previous version
cd /Users/jeet/Documents/production-crm
git log --oneline | head -10  # Find commit before merge
git reset --hard <commit-hash>
# Redeploy
```

### Level 3: Database Rollback
```bash
# Only if data corruption
# Restore from backup
psql $DATABASE_URL < backup.sql
```

---

## 📊 SUCCESS METRICS

**Technical Metrics**:
- ✅ 0 breaking changes for existing users
- ✅ < 1% error rate increase
- ✅ < 200ms latency increase
- ✅ 100% test coverage for new features

**Business Metrics**:
- ✅ Team invitations sent successfully
- ✅ Acceptance rate > 80%
- ✅ User satisfaction score > 4/5
- ✅ Support tickets < 5 per day

---

## 🎯 NEXT: Proceed to Automated Test Suite

Once this merge plan is approved, I'll create:
1. ✅ Automated test suite
2. ✅ Staging environment script
3. ✅ SOX audit logging system
4. ✅ Zero-downtime deployment strategy

**Ready to proceed?**
