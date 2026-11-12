import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../apps/client/dist');
const outDir = path.resolve(__dirname, '../docs/ui-audit');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Simple static server for dist
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url ? req.url.split('?')[0] : '/';
  if (reqPath === '/' || !path.extname(reqPath)) {
    reqPath = '/index.html';
  }
  const filePath = path.join(distDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback
    const indexHtml = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(indexHtml).pipe(res);
  }
});

const prefix = process.argv[2] || 'before';

async function main() {
  await new Promise((resolve) => server.listen(3456, resolve));
  console.log(`Serving dist on http://localhost:3456`);

  const browser = await chromium.launch();

  const viewports = [
    { name: `${prefix}_360px.png`, width: 360, height: 740, scale: 1 },
    { name: `${prefix}_768px.png`, width: 768, height: 1024, scale: 1 },
    { name: `${prefix}_1024px.png`, width: 1024, height: 768, scale: 1 },
    { name: `${prefix}_1366px.png`, width: 1366, height: 768, scale: 1 },
    { name: `${prefix}_1920px.png`, width: 1920, height: 1080, scale: 1 },
    { name: `${prefix}_1024px_zoom125.png`, width: 1024, height: 768, scale: 1.25 },
    { name: `${prefix}_1024px_zoom150.png`, width: 1024, height: 768, scale: 1.5 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale,
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3456/', { waitUntil: 'networkidle' });
    // wait a moment for react mount and theme styling
    await page.waitForTimeout(600);
    const dest = path.join(outDir, vp.name);
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Captured ${dest}`);
    await context.close();
  }

  await browser.close();
  server.close();
  console.log(`Completed capturing ${prefix} screenshots.`);
}

main().catch((err) => {
  console.error(err);
  server.close();
  process.exit(1);
});
