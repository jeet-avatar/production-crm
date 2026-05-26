import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating template variables for Ethan...\n');

  // Read the existing variable values
  const variableValuesRaw = fs.readFileSync(
    path.join(__dirname, 'netsuite-campaign-variables.json'),
    'utf-8'
  );
  const variableValues = JSON.parse(variableValuesRaw);

  // Update sender information to Ethan
  variableValues.senderName = 'Ethan';
  variableValues.senderTitle = 'CEO, BrandMonkz';

  // Optionally update company information to BrandMonkz (or keep Critical River for NetSuite campaigns)
  // Commenting out - keeping Critical River as the default campaign template
  // variableValues.companyName = 'BrandMonkz';
  // variableValues.companyEmail = 'contact@brandmonkz.com';

  // Update calendar URL to Ethan's if he has one
  // variableValues.calendarUrl = 'https://calendly.com/ethan-brandmonkz'; // Update if needed

  console.log('📝 Updated Variable Values:');
  console.log('   senderName:', variableValues.senderName);
  console.log('   senderTitle:', variableValues.senderTitle);
  console.log('   companyName:', variableValues.companyName);
  console.log('   companyEmail:', variableValues.companyEmail);
  console.log('');

  // Update the template
  const template = await prisma.emailTemplate.update({
    where: { id: 'cmh73ze6r0001sohk3e57a6w2' },
    data: {
      variableValues: variableValues,
      updatedAt: new Date()
    }
  });

  console.log('✅ Template Updated Successfully!\n');
  console.log('📊 Template Details:');
  console.log('   ID:', template.id);
  console.log('   Name:', template.name);
  console.log('   Owner:', template.userId);
  console.log('   Updated:', template.updatedAt);
  console.log('');

  console.log('🎯 Changes Applied:');
  console.log('   ✅ senderName: Jithesh → Ethan');
  console.log('   ✅ senderTitle: AI Solutions for NetSuite → CEO, BrandMonkz');
  console.log('   ✅ Company details: Kept as Critical River (for NetSuite campaigns)');
  console.log('');

  console.log('💡 Next Steps:');
  console.log('   1. Send a test email to verify the changes');
  console.log('   2. Email will now be signed by "Ethan, CEO BrandMonkz"');
  console.log('   3. Can override variables per campaign if needed');
  console.log('');

  // Save updated variables back to file for reference
  fs.writeFileSync(
    path.join(__dirname, 'netsuite-campaign-variables-ethan.json'),
    JSON.stringify(variableValues, null, 2)
  );

  console.log('📁 Saved updated variables to: netsuite-campaign-variables-ethan.json\n');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
