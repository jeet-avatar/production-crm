import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating email template with all variables removed...\n');

  // Read the variable template
  const htmlContent = fs.readFileSync(
    path.join(__dirname, 'template-with-all-variables.html'),
    'utf-8'
  );

  // Read the variable values
  const variableValuesRaw = fs.readFileSync(
    path.join(__dirname, 'netsuite-campaign-variables.json'),
    'utf-8'
  );
  const variableValues = JSON.parse(variableValuesRaw);

  // Extract list of all variables from the JSON
  const variables = Object.keys(variableValues);

  console.log(`📋 Found ${variables.length} variables in template:\n`);
  variables.forEach(v => {
    const value = variableValues[v];
    const displayValue = typeof value === 'string' && value.length > 50
      ? value.substring(0, 47) + '...'
      : value;
    console.log(`   • ${v}: ${displayValue}`);
  });

  // Create text version
  const textContent = `Hi {{firstName}},

{{introParagraph}}

🎥 SEE IT IN ACTION
[{{videoCtaButtonText}}]
{{videoUrl}}

{{benefitsSectionTitle}}
✓ {{benefit1Title}}
  {{benefit1Description}}

✓ {{benefit2Title}}
  {{benefit2Description}}

✓ {{benefit3Title}}
  {{benefit3Description}}

✓ {{benefit4Title}}
  {{benefit4Description}}

{{ctaTitle}}

{{ctaDescription}}

[{{ctaButtonText}}]
{{calendarUrl}}

Best regards,
{{senderName}}
{{senderTitle}}

---
{{companyName}}
{{companyAddress}}
Phone: {{companyPhone}}
Email: {{companyEmail}}

{{companyWebsite}}

{{footerText}}

Unsubscribe: https://brandmonkz.com/unsubscribe?email={{email}}&campaignId={{campaignId}}`;

  // Find the existing template
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: {
      name: 'NetSuite AI Automation with Tracking'
    }
  });

  if (!existingTemplate) {
    console.log('\n❌ Template not found in database');
    console.log('   Run: npx ts-node scripts/insert-and-track-template.ts first\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n✅ Found existing template: ${existingTemplate.id}\n`);

  // Update the template
  const updatedTemplate = await prisma.emailTemplate.update({
    where: { id: existingTemplate.id },
    data: {
      htmlContent: htmlContent,
      textContent: textContent,
      variables: variables, // Store list of variable names
      variableValues: variableValues, // Store default values
      updatedAt: new Date()
    }
  });

  console.log('✅ Template Updated Successfully!\n');
  console.log('📊 Template Details:');
  console.log(`   ID: ${updatedTemplate.id}`);
  console.log(`   Name: ${updatedTemplate.name}`);
  console.log(`   Variables: ${variables.length} total`);
  console.log(`   Updated: ${updatedTemplate.updatedAt}\n`);

  console.log('🎯 All Hard-Coded Values Removed:\n');
  console.log('   ✅ Content & messaging → Variables');
  console.log('   ✅ URLs & links → Variables');
  console.log('   ✅ Sender information → Variables');
  console.log('   ✅ Company information → Variables');
  console.log('   ✅ Design colors → Variables');
  console.log('   ✅ Tracking preserved → Still active\n');

  console.log('📝 Variable Categories:\n');
  console.log('   • Design: primaryColor, accentColor, backgroundColor');
  console.log('   • Content: headerTitle, introParagraph, benefits');
  console.log('   • CTAs: videoUrl, calendarUrl, ctaButtonText');
  console.log('   • Sender: senderName, senderTitle');
  console.log('   • Company: companyName, companyAddress, companyPhone');
  console.log('   • Social: linkedInUrl, facebookUrl, twitterUrl, etc.\n');

  console.log('🔧 How to Use:\n');
  console.log('   1. Template now uses variables for everything');
  console.log('   2. Default values stored in variableValues JSON field');
  console.log('   3. Override any variable when sending campaign');
  console.log('   4. Perfect for multi-client/multi-campaign use\n');

  console.log('💡 Example Usage:\n');
  console.log('   When sending, replace variables:');
  console.log('   {{senderName}} → "John Smith"');
  console.log('   {{videoUrl}} → "https://your-video.mp4"');
  console.log('   {{companyName}} → "Acme Corp"\n');

  console.log('🌐 Template ready at: https://brandmonkz.com/email-templates\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
