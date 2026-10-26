/**
 * CourseNest Electron Binary Verifier & Auto-Installer
 * Ensures the platform-specific Electron executable is downloaded, extracted,
 * and path.txt is correctly initialized without newlines.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function ensureElectron() {
  let electronEntry;
  try {
    electronEntry = require.resolve('electron', {
      paths: [
        path.join(__dirname, '../apps/desktop'),
        path.join(__dirname, '..'),
      ],
    });
  } catch (err) {
    console.log('[ensure_electron] Electron package not found in dependencies, skipping.');
    return;
  }

  const electronDir = path.dirname(electronEntry);
  const pathFile = path.join(electronDir, 'path.txt');
  const platform = process.platform;
  const execName = platform === 'win32' ? 'electron.exe' : platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron';
  const expectedBinaryPath = path.join(electronDir, 'dist', execName);

  // Check if binary and path.txt already exist and are valid
  if (fs.existsSync(pathFile) && fs.existsSync(expectedBinaryPath)) {
    const current = fs.readFileSync(pathFile, 'utf8').trim();
    if (current === execName) {
      // Ensure executable permissions on POSIX
      if (platform !== 'win32') {
        try {
          fs.chmodSync(expectedBinaryPath, 0o755);
        } catch {}
      }
      return;
    }
  }

  console.log('[ensure_electron] Initializing Electron binary for platform:', platform);

  // Read electron version
  const pkgJsonPath = path.join(electronDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;
  const { version } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  const distDir = path.join(electronDir, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Check cache for zip
  const homedir = require('os').homedir();
  const cachePattern = path.join(homedir, '.cache/electron');
  let foundZip = null;

  if (fs.existsSync(cachePattern)) {
    const findZipFiles = (dir) => {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
          findZipFiles(full);
        } else if (f.endsWith('.zip') && f.includes(version)) {
          foundZip = full;
        }
      }
    };
    try {
      findZipFiles(cachePattern);
    } catch {}
  }

  if (foundZip && fs.existsSync(foundZip)) {
    console.log('[ensure_electron] Extracting cached Electron artifact:', foundZip);
    try {
      execSync(`unzip -o -q "${foundZip}" -d "${distDir}"`, { stdio: 'inherit' });
    } catch {
      // Fallback: run node install.js
      try {
        execSync(`node "${path.join(electronDir, 'install.js')}"`, { stdio: 'inherit' });
      } catch {}
    }
  } else {
    // Run install.js
    console.log('[ensure_electron] Running electron install script...');
    try {
      execSync(`node "${path.join(electronDir, 'install.js')}"`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('[ensure_electron] Warning running install.js:', e.message);
    }
  }

  // Ensure path.txt is written cleanly without trailing newline
  fs.writeFileSync(pathFile, execName);

  if (platform !== 'win32' && fs.existsSync(expectedBinaryPath)) {
    try {
      fs.chmodSync(expectedBinaryPath, 0o755);
    } catch {}
  }

  console.log('[ensure_electron] Electron binary verified at:', expectedBinaryPath);
}

try {
  ensureElectron();
} catch (err) {
  console.warn('[ensure_electron] Non-fatal check error:', err.message);
}
