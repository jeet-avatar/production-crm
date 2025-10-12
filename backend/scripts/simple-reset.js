#!/usr/bin/env node
/**
 * Simple Database Reset - Delete Contacts and Companies
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simpleReset() {
  console.log('\n🗑️  DELETING ALL DATA...\n');

  try {
    // Delete contacts first (due to foreign key)
    console.log('Deleting all contacts...');
    const contacts = await prisma.contact.deleteMany({});
    console.log(`✅ Deleted ${contacts.count} contacts`);

    // Delete companies
    console.log('Deleting all companies...');
    const companies = await prisma.company.deleteMany({});
    console.log(`✅ Deleted ${companies.count} companies`);

    // Try to delete other tables if they exist
    try {
      const campaigns = await prisma.campaign?.deleteMany({});
      console.log(`✅ Deleted ${campaigns?.count || 0} campaigns`);
    } catch (e) {
      console.log('⚠️  No campaigns table or already empty');
    }

    try {
      const tags = await prisma.tag?.deleteMany({});
      console.log(`✅ Deleted ${tags?.count || 0} tags`);
    } catch (e) {
      console.log('⚠️  No tags table or already empty');
    }

    try {
      const lists = await prisma.list?.deleteMany({});
      console.log(`✅ Deleted ${lists?.count || 0} lists`);
    } catch (e) {
      console.log('⚠️  No lists table or already empty');
    }

    console.log('\n✅ DATABASE CLEAN!\n');
    console.log('Summary:');
    console.log(`- Contacts: ${contacts.count} deleted`);
    console.log(`- Companies: ${companies.count} deleted`);
    console.log('\nDatabase is ready for new data.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleReset();
