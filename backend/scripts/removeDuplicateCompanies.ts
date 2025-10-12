// @ts-nocheck
/**
 * Remove Duplicate Companies Script
 *
 * This script:
 * 1. Finds duplicate companies (same name or domain)
 * 2. Merges contacts to the oldest/best company record
 * 3. Deletes duplicate company records
 *
 * Usage: npx ts-node scripts/removeDuplicateCompanies.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateCompanies() {
  console.log('🔍 Finding duplicate companies...\n');

  // Get all companies
  const companies = await prisma.company.findMany({
    include: {
      contacts: true,
      _count: {
        select: {
          contacts: true,
          deals: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc', // Oldest first (will be kept as primary)
    },
  });

  // Group by name (case-insensitive)
  const groupedByName = new Map<string, any[]>();

  for (const company of companies) {
    const key = company.name.toLowerCase().trim();
    if (!groupedByName.has(key)) {
      groupedByName.set(key, []);
    }
    groupedByName.get(key)!.push(company);
  }

  // Find duplicates
  const duplicateGroups = Array.from(groupedByName.values()).filter(
    (group) => group.length > 1
  );

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate companies found!');
    return;
  }

  console.log(`📊 Found ${duplicateGroups.length} groups of duplicates:\n`);

  let totalRemoved = 0;
  let totalContactsMigrated = 0;

  for (const group of duplicateGroups) {
    console.log(`\n🔄 Processing: ${group[0].name}`);
    console.log(`   Found ${group.length} duplicate records`);

    // Choose the best primary record (most enriched, oldest, most contacts)
    const primary = choosePrimaryCompany(group);
    const duplicates = group.filter((c) => c.id !== primary.id);

    console.log(`   ✓ Keeping: ${primary.name} (ID: ${primary.id.substring(0, 8)}...)`);
    console.log(`     - Created: ${primary.createdAt.toISOString().split('T')[0]}`);
    console.log(`     - Contacts: ${primary._count.contacts}`);
    console.log(`     - Enriched: ${primary.enriched ? 'Yes' : 'No'}`);

    // Migrate contacts from duplicates to primary
    for (const duplicate of duplicates) {
      console.log(`\n   🗑 Removing duplicate: ${duplicate.name} (ID: ${duplicate.id.substring(0, 8)}...)`);
      console.log(`     - Created: ${duplicate.createdAt.toISOString().split('T')[0]}`);
      console.log(`     - Contacts: ${duplicate._count.contacts}`);

      if (duplicate.contacts.length > 0) {
        console.log(`     - Migrating ${duplicate.contacts.length} contacts to primary...`);

        // Update all contacts to point to primary company
        await prisma.contact.updateMany({
          where: {
            companyId: duplicate.id,
          },
          data: {
            companyId: primary.id,
          },
        });

        totalContactsMigrated += duplicate.contacts.length;
      }

      // Delete the duplicate company
      await prisma.company.delete({
        where: { id: duplicate.id },
      });

      totalRemoved++;
      console.log(`     ✓ Deleted duplicate`);
    }
  }

  console.log('\n\n✨ Cleanup completed!\n');
  console.log('📊 Summary:');
  console.log(`   Duplicate companies removed: ${totalRemoved}`);
  console.log(`   Contacts migrated: ${totalContactsMigrated}`);
  console.log(`   Duplicate groups processed: ${duplicateGroups.length}\n`);
}

function choosePrimaryCompany(companies: any[]): any {
  // Scoring system to choose the best record to keep
  return companies.reduce((best, current) => {
    let bestScore = calculateCompanyScore(best);
    let currentScore = calculateCompanyScore(current);

    // Tie-breaker: oldest record
    if (currentScore === bestScore) {
      return best.createdAt < current.createdAt ? best : current;
    }

    return currentScore > bestScore ? current : best;
  });
}

function calculateCompanyScore(company: any): number {
  let score = 0;

  // More contacts = higher score
  score += company._count.contacts * 10;

  // More deals = higher score
  score += company._count.deals * 5;

  // Enriched data = bonus points
  if (company.enriched) score += 20;
  if (company.linkedin) score += 5;
  if (company.website) score += 5;
  if (company.domain) score += 5;
  if (company.industry) score += 3;
  if (company.employeeCount) score += 3;
  if (company.location) score += 3;
  if (company.hiringIntent) score += 10;
  if (company.jobPostings) score += 10;
  if (company.techStack) score += 5;
  if (company.aiPitch) score += 10;

  return score;
}

// Main execution
removeDuplicateCompanies()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
