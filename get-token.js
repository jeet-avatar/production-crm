const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function getToken() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'jeetnair.in@gmail.com' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || '5fa7fba74f76e2b147bf34ebbe267fa51baee4d123edab0afe8d300764cad920bf1a291ccb6dd6a18135572604d332b9c7b2b23038cc0e3f85504b4a18a26d5e',
      { expiresIn: '7d' }
    );

    console.log('User:', user.email);
    console.log('Token:', token);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getToken();
