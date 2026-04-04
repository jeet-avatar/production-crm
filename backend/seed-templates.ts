import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding video templates...');

  // Read the templates JSON file
  const templatesPath = path.join(__dirname, '../video-templates/mixkit-free-templates.json');
  const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

  // Delete existing templates (optional - comment out if you want to keep existing)
  console.log('🗑️  Clearing existing templates...');
  await prisma.videoTemplate.deleteMany({});

  // Seed templates
  for (const template of templatesData) {
    console.log(`📝 Creating template: ${template.name}`);

    await prisma.videoTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        videoUrl: template.downloadUrl, // Use downloadUrl as videoUrl
        thumbnailUrl: template.previewImage,
        category: template.category,
        tags: template.tags,
        isSystem: true, // These are system templates
        userId: null, // No user ownership
        sourceProvider: 'Mixkit',
        downloadUrl: template.downloadUrl,
        license: template.license,
        software: template.software,
        isFree: true,
        isPremium: false,
      },
    });
  }

  console.log('✅ Seeded', templatesData.length, 'video templates');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
