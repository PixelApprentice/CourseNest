const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const outDir = path.resolve(__dirname, '../docs/screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('1. Navigating to Home...');
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '01_home_dashboard.png') });
  console.log('Saved 01_home_dashboard.png');

  console.log('2. Navigating to Import...');
  await page.goto('http://localhost:5173/#/import', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_import_wizard.png') });
  console.log('Saved 05_import_wizard.png');

  console.log('3. Navigating to Course Landing...');
  await page.goto('http://localhost:5173/#/course/cs101', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03_course_landing.png') });
  console.log('Saved 03_course_landing.png');

  console.log('4. Triggering Delete Modal...');
  const deleteBtn = page.locator('button[title="Delete course and purge files"]');
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, '03b_delete_purge_modal.png') });
    console.log('Saved 03b_delete_purge_modal.png');
    // Dismiss modal
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(300);
  }

  // Switch Themes to capture visible wallpapers
  const themes = [
    { id: 'halal', file: 'theme_halal_mosque.png' },
    { id: 'sakura', file: 'theme_sakura_bloom.png' },
    { id: 'toybox', file: 'theme_toybox_playful.png' },
    { id: 'cyberpunk', file: 'theme_neo_tokyo_mecha.png' },
    { id: 'manga', file: 'theme_manga_screentone.png' },
    { id: 'ghibli', file: 'theme_ghibli_meadow.png' },
  ];

  for (const t of themes) {
    console.log(`Setting theme: ${t.id}...`);
    await page.evaluate((themeId) => {
      localStorage.setItem('coursenest_theme_id', themeId);
      window.dispatchEvent(new Event('storage'));
      document.documentElement.setAttribute('data-theme', themeId);
    }, t.id);
    await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, t.file) });
    console.log(`Saved ${t.file}`);
  }

  // Reset to obsidian
  await page.evaluate(() => {
    localStorage.setItem('coursenest_theme_id', 'obsidian');
    window.dispatchEvent(new Event('storage'));
  });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
