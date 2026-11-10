import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          setTimeout(check, 200);
        }
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timeout waiting for server at ${url}`));
        } else {
          setTimeout(check, 200);
        }
      });
    };
    check();
  });
}

async function runAudit() {
  console.log('🚀 Starting client preview server on port 4173...');
  const server = spawn('pnpm', ['--filter', '@coursenest/client', 'preview', '--port', '4173', '--strictPort'], {
    stdio: 'pipe',
    shell: true
  });

  server.stdout.on('data', (d) => process.stdout.write(`[Server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[Server ERR] ${d}`));

  try {
    await waitForServer('http://localhost:4173');
    console.log('✅ Preview server is ready at http://localhost:4173');

    const browser = await chromium.launch({ headless: true });
    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    const routes = [
      { path: '/#/', name: 'Home' },
      { path: '/#/library', name: 'Library' },
      { path: '/#/import', name: 'Import' },
      { path: '/#/studio', name: 'Studio' },
      { path: '/#/settings', name: 'Settings - General' },
      { path: '/#/settings?tab=logs', name: 'Settings - Logs' },
      { path: '/#/settings?tab=credits', name: 'Settings - Credits' }
    ];

    const auditResults = [];

    for (const vp of viewports) {
      console.log(`\n========================================`);
      console.log(`🔍 AUDITING VIEWPORT: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
      console.log(`========================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height }
      });
      const page = await context.newPage();

      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      for (const route of routes) {
        console.log(`Testing ${route.name} (${route.path})...`);
        const url = `http://localhost:4173${route.path}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        // Check horizontal overflow (bad layout bug)
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          return {
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth,
            hasHorizontalScroll: docEl.scrollWidth > docEl.clientWidth + 2
          };
        });

        // Check for visible content
        const bodyContent = await page.evaluate(() => document.body.innerText.trim().length);

        // Check buttons on page
        const buttonCount = await page.locator('button').count();
        const inputCount = await page.locator('input').count();

        auditResults.push({
          viewport: vp.name,
          route: route.name,
          overflow,
          bodyContentLength: bodyContent,
          buttonCount,
          inputCount,
          errors: [...pageErrors],
          consoleErrors: [...consoleErrors]
        });

        if (overflow.hasHorizontalScroll) {
          console.warn(`  ⚠️ HORIZONTAL OVERFLOW DETECTED: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`);
        } else {
          console.log(`  ✓ Layout bounds clean (no unintended horizontal scroll)`);
        }
      }

      // Test Sidebar interaction specifically
      if (vp.name === 'desktop') {
        console.log('\nTesting Resizable Sidebar on Desktop...');
        const sidebar = page.locator('aside');
        if (await sidebar.isVisible()) {
          const initialBox = await sidebar.boundingBox();
          console.log(`  Initial sidebar width: ${initialBox?.width}px`);

          const resizeHandle = page.locator('div[role="separator"]');
          if (await resizeHandle.isVisible()) {
            const handleBox = await resizeHandle.boundingBox();
            if (handleBox) {
              // Drag right +60px
              await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 100);
              await page.mouse.down();
              await page.mouse.move(handleBox.x + 60, handleBox.y + 100);
              await page.mouse.up();
              await page.waitForTimeout(200);

              const resizedBox = await sidebar.boundingBox();
              console.log(`  Resized sidebar width after drag: ${resizedBox?.width}px`);

              // Double click to reset
              await resizeHandle.dblclick();
              await page.waitForTimeout(200);
              const resetBox = await sidebar.boundingBox();
              console.log(`  Sidebar width after double-click reset: ${resetBox?.width}px`);
            }
          }
        }
      } else if (vp.name === 'mobile') {
        console.log('\nTesting Mobile Navigation Drawer...');
        // On mobile, check hamburger button
        const hamburgerBtn = page.locator('button[aria-label="Open navigation menu"]');
        if (await hamburgerBtn.isVisible()) {
          console.log('  Found mobile hamburger button, clicking...');
          await hamburgerBtn.click();
          await page.waitForTimeout(300);
          const mobileDrawer = page.locator('aside');
          const isDrawerVisible = await mobileDrawer.isVisible();
          console.log(`  Drawer visible after click: ${isDrawerVisible}`);

          // Close button
          const closeBtn = page.locator('button[aria-label="Close navigation menu"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(300);
            console.log('  Closed drawer cleanly');
          }
        }
      }

      await context.close();
    }

    await browser.close();

    console.log('\n========================================');
    console.log('🎉 AUDIT SUMMARY');
    console.log('========================================');
    let hasOverflow = false;
    let totalErrors = 0;
    for (const res of auditResults) {
      if (res.overflow.hasHorizontalScroll) {
        console.error(`❌ [${res.viewport}] ${res.route}: Layout horizontal overflow!`);
        hasOverflow = true;
      }
      if (res.errors.length > 0 || res.consoleErrors.length > 0) {
        console.error(`❌ [${res.viewport}] ${res.route}: ${res.errors.length} page errors, ${res.consoleErrors.length} console errors.`);
        totalErrors += res.errors.length + res.consoleErrors.length;
      }
    }

    if (!hasOverflow && totalErrors === 0) {
      console.log('✅ ALL SCREENS & VIEWPORTS PASSED WITH 0 OVERFLOW AND 0 CONSOLE ERRORS!');
    } else {
      console.warn(`⚠️ Completed with ${totalErrors} errors, overflow: ${hasOverflow}`);
    }

  } finally {
    server.kill();
  }
}

runAudit().catch((err) => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
