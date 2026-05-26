const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'test@brandmonkz.com' }
    });

    if (existing) {
      console.log('User already exists:', existing.email);
      console.log('User ID:', existing.id);
      return;
    }

    // Create new user
    const passwordHash = await bcrypt.hash('Test123!', 12);
    const user = await prisma.user.create({
      data: {
        email: 'test@brandmonkz.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true
      }
    });

    console.log('✅ User created successfully!');
    console.log('Email:', user.email);
    console.log('Password: Test123!');
    console.log('User ID:', user.id);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
