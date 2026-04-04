/**
 * Update CTO Password to Simpler Format
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateCTOPassword() {
  try {
    console.log('🔐 Updating CTO Password...');
    console.log('');

    // Simpler password for testing
    const newPassword = 'CTOPassword123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { email: 'rajesh.sharma@brandmonkz.com' },
      data: { passwordHash: hashedPassword }
    });

    console.log('✅ Password Updated Successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  UPDATED CTO CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('  Email:    rajesh.sharma@brandmonkz.com');
    console.log('  Password: CTOPassword123');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  This is a simpler password for easier testing');
    console.log('   User should change it to a stronger password after login');
    console.log('');

  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCTOPassword();
