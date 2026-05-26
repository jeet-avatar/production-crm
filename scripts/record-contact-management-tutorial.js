/**
 * Automated Screen Recording Script for Contact Management Tutorial
 *
 * This script uses Playwright to automatically record a walkthrough
 * of the Contact Management feature in BrandMonkz CRM.
 *
 * Recording will be saved to: recordings/contact-management-tutorial.mp4
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Configuration
const RECORDING_CONFIG = {
  url: 'http://localhost:5173',  // Your local dev server
  email: 'demo@brandmonkz.com',  // Demo account
  password: 'demo123',           // Demo password
  outputDir: path.join(__dirname, '../recordings'),
  outputFile: 'contact-management-tutorial.mp4',
  videoSize: { width: 1920, height: 1080 },
  slowMo: 800,  // Slow down actions by 800ms for better visibility
};

async function recordContactManagementTutorial() {
  console.log('🎬 Starting Contact Management Tutorial Recording...\n');

  // Create recordings directory if it doesn't exist
  if (!fs.existsSync(RECORDING_CONFIG.outputDir)) {
    fs.mkdirSync(RECORDING_CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created recordings directory: ${RECORDING_CONFIG.outputDir}\n`);
  }

  // Launch browser with video recording
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: false,  // Show browser for debugging
    slowMo: RECORDING_CONFIG.slowMo,
  });

  const context = await browser.newContext({
    viewport: RECORDING_CONFIG.videoSize,
    recordVideo: {
      dir: RECORDING_CONFIG.outputDir,
      size: RECORDING_CONFIG.videoSize,
    },
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to login page
    console.log('\n📍 Step 1: Navigating to BrandMonkz...');
    await page.goto(RECORDING_CONFIG.url);
    await page.waitForTimeout(2000);

    // Step 2: Login
    console.log('🔐 Step 2: Logging in...');
    await page.fill('input[type="email"]', RECORDING_CONFIG.email);
    await page.waitForTimeout(500);
    await page.fill('input[type="password"]', RECORDING_CONFIG.password);
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Step 3: Show Dashboard (brief)
    console.log('📊 Step 3: Showing Dashboard...');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Step 4: Click on Contacts in sidebar
    console.log('👥 Step 4: Navigating to Contacts...');
    await page.click('a[href="/contacts"]');
    await page.waitForTimeout(3000);

    // Step 5: Show Contacts page
    console.log('📋 Step 5: Showing Contacts page...');
    await page.waitForSelector('text=Contacts', { timeout: 10000 });
    await page.waitForTimeout(2500);

    // Step 6: Hover over Add Contact button
    console.log('➕ Step 6: Highlighting Add Contact button...');
    const addButton = await page.locator('button:has-text("Add Contact")').first();
    await addButton.hover();
    await page.waitForTimeout(1500);

    // Step 7: Click Add Contact
    console.log('✏️ Step 7: Clicking Add Contact...');
    await addButton.click();
    await page.waitForTimeout(2000);

    // Step 8: Fill in contact details (slowly for visibility)
    console.log('📝 Step 8: Filling in contact details...');

    // First Name
    await page.fill('input[name="firstName"]', 'John');
    await page.waitForTimeout(800);

    // Last Name
    await page.fill('input[name="lastName"]', 'Smith');
    await page.waitForTimeout(800);

    // Email
    await page.fill('input[name="email"]', 'john.smith@example.com');
    await page.waitForTimeout(800);

    // Phone (if field exists)
    try {
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.waitForTimeout(800);
    } catch (e) {
      console.log('   ℹ️  Phone field not found, skipping...');
    }

    // Company (if field exists)
    try {
      await page.fill('input[name="company"]', 'Acme Corporation');
      await page.waitForTimeout(800);
    } catch (e) {
      console.log('   ℹ️  Company field not found, skipping...');
    }

    // Step 9: Hover over Save/Create button
    console.log('💾 Step 9: Highlighting Save button...');
    const saveButton = await page.locator('button:has-text("Create Contact"), button:has-text("Save")').first();
    await saveButton.hover();
    await page.waitForTimeout(1500);

    // Step 10: Click Save
    console.log('✅ Step 10: Saving contact...');
    await saveButton.click();
    await page.waitForTimeout(3000);

    // Step 11: Show updated contacts list
    console.log('📋 Step 11: Showing updated contacts list...');
    await page.waitForTimeout(2000);

    // Step 12: Use search feature (if exists)
    console.log('🔍 Step 12: Demonstrating search...');
    try {
      const searchInput = await page.locator('input[placeholder*="Search"], input[type="search"]').first();
      await searchInput.click();
      await page.waitForTimeout(500);
      await searchInput.fill('John');
      await page.waitForTimeout(2000);
      await searchInput.clear();
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('   ℹ️  Search field not found, skipping...');
    }

    // Step 13: Click on the contact we just created
    console.log('👁️ Step 13: Opening contact details...');
    try {
      await page.click('text=John Smith');
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('   ℹ️  Could not find contact, may still be loading...');
      await page.waitForTimeout(2000);
    }

    // Step 14: Show contact profile
    console.log('📄 Step 14: Showing contact profile...');
    await page.waitForTimeout(2500);

    // Step 15: Close and return to list
    console.log('🔙 Step 15: Returning to contacts list...');
    try {
      await page.click('button:has-text("Close"), button[aria-label="Close"]');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('   ℹ️  Close button not found, ending recording...');
    }

    // Final pause to show the list
    console.log('🎬 Step 16: Final view...');
    await page.waitForTimeout(2000);

    console.log('\n✅ Recording complete!');
    console.log('⏸️  Closing browser and saving video...\n');

  } catch (error) {
    console.error('\n❌ Error during recording:', error.message);
    throw error;
  } finally {
    // Close the browser and save the recording
    await context.close();
    await browser.close();

    // The video file is saved automatically
    const videoFiles = fs.readdirSync(RECORDING_CONFIG.outputDir)
      .filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));

    if (videoFiles.length > 0) {
      const latestVideo = videoFiles[videoFiles.length - 1];
      const videoPath = path.join(RECORDING_CONFIG.outputDir, latestVideo);
      const finalPath = path.join(RECORDING_CONFIG.outputDir, RECORDING_CONFIG.outputFile);

      // Rename to our desired filename
      fs.renameSync(videoPath, finalPath);

      console.log('🎥 Recording saved to:', finalPath);
      console.log('📐 Resolution:', `${RECORDING_CONFIG.videoSize.width}x${RECORDING_CONFIG.videoSize.height}`);
      console.log('\n✅ Screen recording complete!');
      console.log('\n📋 Next steps:');
      console.log('   1. Review the recording');
      console.log('   2. Note timestamps for text overlays');
      console.log('   3. Run the professional video generator');

      return finalPath;
    } else {
      throw new Error('Video file not found after recording');
    }
  }
}

// Run the recording
if (require.main === module) {
  recordContactManagementTutorial()
    .then((videoPath) => {
      console.log(`\n🎉 Success! Video path: ${videoPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Recording failed:', error);
      process.exit(1);
    });
}

module.exports = { recordContactManagementTutorial };
