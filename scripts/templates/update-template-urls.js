const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTemplateURLs() {
  try {
    // Get the template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: 'test-ai-95bde82188' }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    let html = template.htmlContent;

    console.log('=== Replacing AWS S3 URLs with Clean URLs ===');
    console.log('');

    // Replace video URL
    const oldVideoUrl = 'https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/demo-videos/criticalriver-demo.mp4';
    const newVideoUrl = 'https://brandmonkz.com/media/video/netsuite-demo';

    // Count occurrences
    const videoCount = (html.match(new RegExp(oldVideoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    html = html.replace(new RegExp(oldVideoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newVideoUrl);

    console.log(`✅ Replaced ${videoCount} video URLs:`);
    console.log(`   OLD: ${oldVideoUrl}`);
    console.log(`   NEW: ${newVideoUrl}`);
    console.log('');

    // Replace GIF preview URL
    const oldGifUrl = 'https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/assets/netsuite-video-preview.gif';
    const newGifUrl = 'https://brandmonkz.com/media/img/netsuite-preview';

    const gifCount = (html.match(new RegExp(oldGifUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    html = html.replace(new RegExp(oldGifUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newGifUrl);

    console.log(`✅ Replaced ${gifCount} GIF preview URLs:`);
    console.log(`   OLD: ${oldGifUrl}`);
    console.log(`   NEW: ${newGifUrl}`);
    console.log('');

    // Replace logo URL (if exists)
    const oldLogoUrl = 'https://brandmonkz-video-campaigns.s3.us-east-1.amazonaws.com/assets/criticalriver-logo-template.png';
    const newLogoUrl = 'https://brandmonkz.com/media/img/criticalriver-logo';

    const logoCount = (html.match(new RegExp(oldLogoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (logoCount > 0) {
      html = html.replace(new RegExp(oldLogoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newLogoUrl);
      console.log(`✅ Replaced ${logoCount} logo URLs:`);
      console.log(`   OLD: ${oldLogoUrl}`);
      console.log(`   NEW: ${newLogoUrl}`);
      console.log('');
    }

    // Update the template
    await prisma.emailTemplate.update({
      where: { id: 'test-ai-95bde82188' },
      data: {
        htmlContent: html
      }
    });

    console.log('✅ Template updated successfully!');
    console.log('');
    console.log('=== Benefits ===');
    console.log('1. ✅ Professional URLs (no "amazonaws.com" or "s3.us-east-1")');
    console.log('2. ✅ Click tracking enabled (source, contact, timestamp)');
    console.log('3. ✅ Easy to change backend storage without updating emails');
    console.log('4. ✅ Better deliverability (fewer spam flags)');
    console.log('5. ✅ Engagement analytics (who clicked what)');
    console.log('');
    console.log('=== New URLs ===');
    console.log(`Video: ${newVideoUrl}?source=email&contact={{contactId}}&timestamp={{timestamp}}`);
    console.log(`Preview: ${newGifUrl}`);
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

updateTemplateURLs();
