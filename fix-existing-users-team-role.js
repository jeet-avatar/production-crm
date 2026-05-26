#!/usr/bin/env node

/**
 * Fix Existing Users - Set Default Team Role
 *
 * This script updates all existing users to have teamRole = 'OWNER'
 * so they can access the Team management page.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixExistingUsers() {
  try {
    console.log('🔧 Fixing existing users...');

    // Update all users without teamRole to be OWNER
    const result = await prisma.user.updateMany({
      where: {
        teamRole: null
      },
      data: {
        teamRole: 'OWNER',
        accountOwnerId: null,
        inviteAccepted: true
      }
    });

    console.log(`✅ Updated ${result.count} users to OWNER role`);

    // Show all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        teamRole: true,
        accountOwnerId: true
      }
    });

    console.log('\n📊 Current users:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingUsers();
