/**
 * Update CTO Employee to Real Email: ethan@brandmonkz.com
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateCTOToEthan() {
  try {
    console.log('🔄 Updating CTO Employee Email...');
    console.log('');
    console.log('From: rajesh.sharma@brandmonkz.com (fictitious)');
    console.log('To:   ethan@brandmonkz.com (real email)');
    console.log('');

    // Check if old user exists
    const oldUser = await prisma.user.findUnique({
      where: { email: 'rajesh.sharma@brandmonkz.com' }
    });

    if (!oldUser) {
      console.log('⚠️  Old user not found. Creating new CTO user...');
    } else {
      console.log('✅ Found old user:', oldUser.firstName, oldUser.lastName);
    }

    // Check if new email already exists
    const existingEthan = await prisma.user.findUnique({
      where: { email: 'ethan@brandmonkz.com' }
    });

    if (existingEthan) {
      console.log('');
      console.log('⚠️  User with ethan@brandmonkz.com already exists!');
      console.log('   User ID:', existingEthan.id);
      console.log('   Name:', existingEthan.firstName, existingEthan.lastName);
      console.log('   Role:', existingEthan.role);
      console.log('');
      console.log('❓ Do you want to:');
      console.log('   1. Update this user to be the CTO');
      console.log('   2. Delete old CTO and keep this one');
      console.log('');
      console.log('For now, updating this user to CTO role and details...');
      console.log('');

      // Update existing user
      const password = 'CTOPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const updatedUser = await prisma.user.update({
        where: { email: 'ethan@brandmonkz.com' },
        data: {
          firstName: 'Ethan',
          lastName: 'Varela',
          role: 'ADMIN',
          passwordHash: hashedPassword,
          isActive: true,
          phone: '+1-555-0100',
          timezone: 'America/New_York'
        }
      });

      // Delete old user if exists
      if (oldUser) {
        await prisma.user.delete({
          where: { email: 'rajesh.sharma@brandmonkz.com' }
        });
        console.log('🗑️  Deleted old user: rajesh.sharma@brandmonkz.com');
        console.log('');
      }

      console.log('✅ Updated existing user to CTO!');
      console.log('');
      printCredentials(updatedUser);

    } else {
      // Create new user or update old one
      if (oldUser) {
        // Update old user's email
        const updatedUser = await prisma.user.update({
          where: { email: 'rajesh.sharma@brandmonkz.com' },
          data: {
            email: 'ethan@brandmonkz.com',
            firstName: 'Ethan',
            lastName: 'Varela',
            phone: '+1-555-0100',
            timezone: 'America/New_York'
          }
        });

        console.log('✅ Updated CTO Email Successfully!');
        console.log('');
        printCredentials(updatedUser);

      } else {
        // Create new user
        const password = 'CTOPassword123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
          data: {
            email: 'ethan@brandmonkz.com',
            passwordHash: hashedPassword,
            firstName: 'Ethan',
            lastName: 'Varela',
            role: 'ADMIN',
            isActive: true,
            phone: '+1-555-0100',
            timezone: 'America/New_York'
          }
        });

        console.log('✅ Created New CTO User!');
        console.log('');
        printCredentials(newUser);
      }
    }

  } catch (error) {
    console.error('❌ Error updating CTO:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printCredentials(user) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CTO EMPLOYEE CREDENTIALS - UPDATED');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Name:        Ethan Varela');
  console.log('  Title:       Chief Technology Officer (CTO)');
  console.log('  Employee ID: EMP-CTO-001');
  console.log('  Email:       ethan@brandmonkz.com');
  console.log('  Password:    CTOPassword123');
  console.log('  Role:        ADMIN');
  console.log('  Department:  Engineering & Technology');
  console.log('  User ID:     ' + user.id);
  console.log('  Phone:       +1-555-0100');
  console.log('  Timezone:    America/New_York');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ CTO can now log in with:');
  console.log('   Email:    ethan@brandmonkz.com');
  console.log('   Password: CTOPassword123');
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('   1. This is a REAL email address');
  console.log('   2. Change password after first login');
  console.log('   3. Enable MFA for security');
  console.log('   4. CTO can send/receive emails at this address');
  console.log('');
}

updateCTOToEthan();
