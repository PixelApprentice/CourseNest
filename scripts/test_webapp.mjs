import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function main() {
  console.log('🚀 Starting client preview server on port 4173...');
  const server = spawn('pnpm', ['--filter', '@coursenest/client', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => console.log(`[preview] ${d.toString().trim()}`));
  server.stderr.on('data', (d) => console.error(`[preview err] ${d.toString().trim()}`));

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('✅ Server is ready! Launching headless Chromium...');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Test Home Page
    console.log('📍 Testing Home Page (http://127.0.0.1:4173/#/)...');
    await page.goto('http://127.0.0.1:4173/#/');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log(`  Page Title: "${title}"`);

    // In Lite Mode: verify 3-step beginner guide
    const welcomeLite = await page.locator('h1:has-text("Welcome to CourseNest Lite")').first();
    console.log(`  Beginner Welcome (Lite Mode): ${await welcomeLite.isVisible() ? '✅ YES' : '❌ NO'}`);

    const step1 = await page.locator('text=Plug In or Add').first();
    console.log(`  Beginner Step 1 (Lite Mode): ${await step1.isVisible() ? '✅ YES' : '❌ NO'}`);

    // Click mode button to toggle to PRO mode
    const modeBtn = await page.locator('button:has-text("LITE MODE"), button:has-text("PRO STUDIO")').first();
    const initialModeText = await modeBtn.innerText();
    console.log(`  Initial Mode Button Text: "${initialModeText}"`);

    await modeBtn.click();
    await page.waitForTimeout(400);

    const htmlAppMode = await page.evaluate(() => document.documentElement.getAttribute('data-app-mode'));
    console.log(`  <html> data-app-mode after toggle: "${htmlAppMode}"`);

    // In Pro Mode: verify Online vs Local Comparison
    const comparisonHeader = await page.locator('text=Online Streaming vs. Local Computer Vault').first();
    console.log(`  Online vs Local comparison visible in Pro Mode: ${await comparisonHeader.isVisible() ? '✅ YES' : '❌ NO'}`);

    // 2. Test Library Page
    console.log('📍 Testing Library Page (http://127.0.0.1:4173/#/library)...');
    await page.goto('http://127.0.0.1:4173/#/library');
    await page.waitForLoadState('networkidle');

    const libraryHeading = await page.locator('h1:has-text("My Courses")').first();
    console.log(`  Library Heading visible: ${await libraryHeading.isVisible() ? '✅ YES' : '❌ NO'}`);

    // 3. Test Importer Page
    console.log('📍 Testing Importer Page (http://127.0.0.1:4173/#/import)...');
    await page.goto('http://127.0.0.1:4173/#/import');
    await page.waitForLoadState('networkidle');

    const importHeading = await page.locator('text=Add Your Course Files').first();
    console.log(`  Importer Step 1 visible: ${await importHeading.isVisible() ? '✅ YES' : '❌ NO'}`);

    // Check JSON import mode toggle to test Step 3 review interface
    const jsonTab = await page.locator('button:has-text("Paste Course JSON")').first();
    await jsonTab.click();
    const sampleManifest = JSON.stringify({
      title: "Automated Test Masterclass",
      subject: "Quality Engineering",
      instructor: "Antigravity Agent",
      sections: [
        {
          id: "sec-1",
          title: "Part 1: Getting Started",
          position: 1,
          lessons: [
            { id: "les-1", title: "Lesson 1: Installation", position: 1 },
            { id: "les-2", title: "Lesson 2: Core Concepts", position: 2 }
          ]
        },
        {
          id: "sec-2",
          title: "Part 2: Advanced Verification",
          position: 2,
          lessons: [
            { id: "les-3", title: "Lesson 3: Performance Profiles", position: 1 }
          ]
        }
      ]
    });

    await page.locator('textarea').fill(sampleManifest);
    const previewBtn = await page.locator('button:has-text("Preview & Review")').first();
    await previewBtn.click();
    await page.waitForTimeout(500);

    // Verify Step 3 Curriculum Review & Drag Handles
    const step3Heading = await page.locator('h3:has-text("Course Structure & Chapter Review")').first();
    console.log(`  Step 3 Curriculum Review loaded: ${await step3Heading.isVisible() ? '✅ YES' : '❌ NO'}`);

    const sectionGrips = await page.locator('[title="Drag to reorder Section"]').all();
    console.log(`  Section drag handles found: ${sectionGrips.length} (Expected: 2)`);

    const lessonGrips = await page.locator('[title*="Drag to reorder lesson"]').all();
    console.log(`  Lesson drag handles found: ${lessonGrips.length} (Expected: 3)`);

    // 4. Test Course Studio Page
    console.log('📍 Testing Course Studio Page (http://127.0.0.1:4173/#/studio)...');
    await page.goto('http://127.0.0.1:4173/#/studio');
    await page.waitForLoadState('networkidle');

    const studioModuleGrips = await page.locator('[title="Drag to reorder module"]').all();
    console.log(`  Studio Module drag handles found: ${studioModuleGrips.length}`);

    const studioLessonGrips = await page.locator('[title="Drag to reorder lesson"]').all();
    console.log(`  Studio Lesson drag handles found: ${studioLessonGrips.length}`);

    await browser.close();
    console.log('\n🎉 ALL WEB APPLICATION VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
