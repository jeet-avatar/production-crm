/**
 * Create CTO Employee in Database
 *
 * This script creates the CTO employee record in the sandbox database
 * with all necessary information and permissions.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createCTOEmployee() {
  try {
    console.log('🚀 Creating CTO Employee: Rajesh Kumar Sharma');
    console.log('📧 Email: rajesh.sharma@brandmonkz.com');
    console.log('');

    // Hash the initial password
    const initialPassword = 'CTOPassword123'; // User will change on first login
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    // Create the CTO user
    const ctoUser = await prisma.user.create({
      data: {
        email: 'rajesh.sharma@brandmonkz.com',
        passwordHash: hashedPassword,
        firstName: 'Rajesh',
        lastName: 'Sharma',
        role: 'ADMIN', // CTO has admin privileges
        isActive: true,
        phone: '+91-9876543210',
        timezone: 'Asia/Kolkata'
      }
    });

    console.log('✅ CTO User Created Successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CTO EMPLOYEE CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('  Name:        Rajesh Kumar Sharma');
    console.log('  Title:       Chief Technology Officer (CTO)');
    console.log('  Employee ID: EMP-CTO-001');
    console.log('  Email:       rajesh.sharma@brandmonkz.com');
    console.log('  Alt Email:   cto@brandmonkz.com');
    console.log('  Password:    CTOPassword123');
    console.log('  Role:        ADMIN');
    console.log('  Department:  Engineering & Technology');
    console.log('  User ID:     ' + ctoUser.id);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('   1. This is a temporary password');
    console.log('   2. CTO must change password on first login');
    console.log('   3. Enable MFA immediately after first login');
    console.log('   4. Store credentials in 1Password team vault');
    console.log('   5. Never share credentials via email or Slack');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Review CTO_ROLE_DEFINITION.md');
    console.log('   2. Complete onboarding checklist');
    console.log('   3. Set up AWS access with MFA');
    console.log('   4. Configure GitHub organization access');
    console.log('   5. Schedule CEO alignment meeting');
    console.log('');
    console.log('🔐 Access granted to:');
    console.log('   - All CRM modules (Companies, Contacts, Deals, Tasks)');
    console.log('   - Admin dashboard and settings');
    console.log('   - User management and permissions');
    console.log('   - System monitoring and logs');
    console.log('   - Database and infrastructure access');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating CTO employee:', error);

    if (error.code === 'P2002') {
      console.log('');
      console.log('⚠️  Email already exists in database!');
      console.log('   The CTO user may have been created previously.');
      console.log('');

      // Try to fetch existing user
      const existingUser = await prisma.user.findUnique({
        where: { email: 'rajesh.sharma@brandmonkz.com' }
      });

      if (existingUser) {
        console.log('📊 Existing CTO User Found:');
        console.log('   User ID:', existingUser.id);
        console.log('   Name:', existingUser.firstName, existingUser.lastName);
        console.log('   Email:', existingUser.email);
        console.log('   Role:', existingUser.role);
        console.log('   Status:', existingUser.isActive ? 'Active' : 'Inactive');
        console.log('');
        console.log('💡 If you need to reset this user, use reset-cto-password.js');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCTOEmployee();
