/**
 * Create Ethan's CTO Account on SANDBOX Backend Database
 *
 * This creates Ethan's account on the AWS RDS database that the sandbox backend uses
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Sandbox database connection (from .env.production)
const DATABASE_URL = "postgresql://brandmonkz:BrandMonkz2024SecureDB@brandmonkz-crm-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432/brandmonkz_crm_sandbox?schema=public";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function createEthanOnSandbox() {
  try {
    console.log('🔧 Connecting to Sandbox Database (AWS RDS)...');
    console.log('Database: brandmonkz-crm-db.c23qcukqe810.us-east-1.rds.amazonaws.com');
    console.log('');

    // Check if Ethan already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'ethan@brandmonkz.com' }
    });

    if (existing) {
      console.log('✅ Ethan already exists in sandbox database!');
      console.log('');
      console.log('Email:', existing.email);
      console.log('Name:', existing.firstName, existing.lastName);
      console.log('Role:', existing.role);
      console.log('');
      console.log('Updating password to ensure it matches...');

      const password = 'CTOPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const updated = await prisma.user.update({
        where: { email: 'ethan@brandmonkz.com' },
        data: {
          passwordHash: hashedPassword,
          firstName: 'Ethan',
          lastName: 'Varela',
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('✅ Updated Ethan\'s credentials!');
      console.log('');
      printCredentials(updated);

    } else {
      console.log('Creating new CTO user: Ethan Varela');
      console.log('');

      const password = 'CTOPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
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

      console.log('✅ Created Ethan on Sandbox Database!');
      console.log('');
      printCredentials(user);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('1. Database connection failed');
    console.error('2. Network/firewall blocking connection');
    console.error('3. Invalid database credentials');
    console.error('');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function printCredentials(user) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CTO CREDENTIALS - SANDBOX BACKEND');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('  Name:        Ethan Varela');
  console.log('  Email:       ethan@brandmonkz.com');
  console.log('  Password:    CTOPassword123');
  console.log('  Role:        ADMIN');
  console.log('  User ID:     ' + user.id);
  console.log('  Database:    AWS RDS (Sandbox)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Ethan can now log in at:');
  console.log('   http://sandbox-brandmonkz-crm.s3-website-us-east-1.amazonaws.com');
  console.log('');
  console.log('   Email:    ethan@brandmonkz.com');
  console.log('   Password: CTOPassword123');
  console.log('');
}

createEthanOnSandbox();
