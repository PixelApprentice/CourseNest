import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = '/home/salahudin/.gemini/antigravity-cli/brain/02439cee-5033-4125-a177-856afa0b9448/screenshots';
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to Open-Source Landing Page...');
  await page.goto('http://127.0.0.1:5173/welcome', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '09_open_source_landing.png'), fullPage: true });
  console.log('Captured 09_open_source_landing.png');

  console.log('Navigating to Lesson Player with VLC Suite...');
  await page.goto('http://127.0.0.1:5173/course/cs101-computer-systems/lesson/les-1-1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '10_vlc_video_player.png') });
  console.log('Captured 10_vlc_video_player.png');

  console.log('Navigating to Open-Source Landing Page with PDF Tab active...');
  await page.goto('http://127.0.0.1:5173/welcome', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.click('button:has-text("Mozilla PDF.js Reader")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '11_pdf_js_document_reader.png') });
  console.log('Captured 11_pdf_js_document_reader.png');

  await browser.close();
  console.log('Screenshots captured successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
