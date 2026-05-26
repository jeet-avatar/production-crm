#!/usr/bin/env node
/**
 * Reset Database - Delete All Data
 *
 * This script will delete ALL:
 * - Contacts
 * - Companies
 * - Campaigns
 * - Email Sequences
 * - Templates
 * - Tags
 * - Lists
 *
 * WARNING: This is PERMANENT and cannot be undone!
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('\n🗑️  DATABASE RESET STARTING...\n');

  try {
    // Delete in order to respect foreign key constraints

    console.log('Deleting campaign contacts...');
    const campaignContacts = await prisma.campaignContact.deleteMany({});
    console.log(`✅ Deleted ${campaignContacts.count} campaign contacts`);

    console.log('Deleting email sequence steps...');
    const sequenceSteps = await prisma.emailSequenceStep.deleteMany({});
    console.log(`✅ Deleted ${sequenceSteps.count} email sequence steps`);

    console.log('Deleting email sequences...');
    const sequences = await prisma.emailSequence.deleteMany({});
    console.log(`✅ Deleted ${sequences.count} email sequences`);

    console.log('Deleting campaigns...');
    const campaigns = await prisma.campaign.deleteMany({});
    console.log(`✅ Deleted ${campaigns.count} campaigns`);

    console.log('Deleting email templates...');
    const templates = await prisma.emailTemplate.deleteMany({});
    console.log(`✅ Deleted ${templates.count} email templates`);

    console.log('Deleting contact tags...');
    const contactTags = await prisma.contactTag.deleteMany({});
    console.log(`✅ Deleted ${contactTags.count} contact tags`);

    console.log('Deleting tags...');
    const tags = await prisma.tag.deleteMany({});
    console.log(`✅ Deleted ${tags.count} tags`);

    console.log('Deleting contact lists...');
    const contactLists = await prisma.contactList.deleteMany({});
    console.log(`✅ Deleted ${contactLists.count} contact lists`);

    console.log('Deleting lists...');
    const lists = await prisma.list.deleteMany({});
    console.log(`✅ Deleted ${lists.count} lists`);

    console.log('Deleting activities...');
    const activities = await prisma.activity.deleteMany({});
    console.log(`✅ Deleted ${activities.count} activities`);

    console.log('Deleting deals...');
    const deals = await prisma.deal.deleteMany({});
    console.log(`✅ Deleted ${deals.count} deals`);

    console.log('Deleting contacts...');
    const contacts = await prisma.contact.deleteMany({});
    console.log(`✅ Deleted ${contacts.count} contacts`);

    console.log('Deleting companies...');
    const companies = await prisma.company.deleteMany({});
    console.log(`✅ Deleted ${companies.count} companies`);

    console.log('\n✅ DATABASE RESET COMPLETE!\n');
    console.log('Summary:');
    console.log(`- Contacts: ${contacts.count}`);
    console.log(`- Companies: ${companies.count}`);
    console.log(`- Campaigns: ${campaigns.count}`);
    console.log(`- Email Sequences: ${sequences.count}`);
    console.log(`- Templates: ${templates.count}`);
    console.log(`- Tags: ${tags.count}`);
    console.log(`- Lists: ${lists.count}`);
    console.log(`- Activities: ${activities.count}`);
    console.log(`- Deals: ${deals.count}`);
    console.log('\nDatabase is now clean and ready for new data.\n');

  } catch (error) {
    console.error('❌ Error during database reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation check
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log('\n⚠️  WARNING: This will DELETE ALL DATA!\n');
  console.log('To confirm, run:');
  console.log('node scripts/reset-database.js --confirm\n');
  process.exit(0);
}

resetDatabase();
