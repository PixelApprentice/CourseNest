const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const outDir = path.resolve(__dirname, '../docs/screenshots');

  console.log('1. Navigating to Lesson Player (CS 101 - Lesson 1.1)...');
  await page.goto('http://localhost:5173/#/course/cs101/lesson/les-1-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Take full screenshot of lesson player with code block
  await page.screenshot({ path: path.join(outDir, '04_lesson_player.png') });
  console.log('Saved 04_lesson_player.png');

  // Open Mini Window link
  console.log('2. Opening Mini Window Link...');
  const miniBtn = page.locator('button:has-text("Mini Window")');
  if (await miniBtn.count() > 0) {
    await miniBtn.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, '04b_mini_window_link.png') });
    console.log('Saved 04b_mini_window_link.png');
    // Close modal
    await page.locator('button[title="Close"]').click();
    await page.waitForTimeout(400);
  }

  // Click Mark Done to show Unit Complete banner
  console.log('3. Triggering Unit Complete banner...');
  const markDoneBtn = page.locator('button:has-text("Mark Done")');
  if (await markDoneBtn.count() > 0) {
    await markDoneBtn.click();
    await page.waitForTimeout(500);
    // Scroll down slightly to show code block & unit completion banner
    await page.evaluate(() => {
      const el = document.getElementById('lesson-scroll-viewport');
      if (el) el.scrollTop = 450;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '04c_unit_complete_next.png') });
    console.log('Saved 04c_unit_complete_next.png');
  }

  // Open AI Study Companion sidebar
  console.log('4. Opening AI Study Companion...');
  const aiBtn = page.locator('button[title="AI Reading Companion & Handout Tutor"]');
  if (await aiBtn.count() > 0) {
    await aiBtn.click();
    await page.waitForTimeout(500);
    // Click "Video Timestamps" quick prompt
    const promptBtn = page.locator('button:has-text("Video Timestamps")');
    if (await promptBtn.count() > 0) {
      await promptBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(outDir, '04d_local_ai_study_buddy.png') });
    console.log('Saved 04d_local_ai_study_buddy.png');
  }

  await browser.close();
  console.log('Lesson features screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
