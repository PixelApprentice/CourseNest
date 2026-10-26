import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { registerIpcHandlers } from './ipc-handlers.js';
import { initializeDatabase } from './database.js';

const THEME_BG_MAP: Record<string, string> = {
  obsidian: '#0A0A0B',
  halal: '#F4F9F5',
  sakura: '#FFF5F7',
  toybox: '#FFFBEB',
  cyberpunk: '#05050A',
  manga: '#FFFFFF',
  ghibli: '#F5F9F6',
  oled: '#000000',
  paper: '#F8F9FA',
};

function getSavedThemeBg(): string {
  try {
    const configPath = join(app.getPath('userData'), 'theme_preference.json');
    if (existsSync(configPath)) {
      const data = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (data?.themeId && THEME_BG_MAP[data.themeId]) {
        return THEME_BG_MAP[data.themeId]!;
      }
    }
  } catch {}
  return '#0A0A0B';
}

// Hardware acceleration and laptop battery/CPU optimization flags
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Memory exhaustion safeguards (protects 16GB RAM Linux environments with 0 swap)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
app.commandLine.appendSwitch('renderer-process-limit', '4');

let mainWindow: BrowserWindow | null = null;

function resolvePreloadPath(): string | undefined {
  const candidates = [
    join(__dirname, '../preload/index.mjs'),
    join(__dirname, '../preload/index.js'),
    join(app.getAppPath(), 'dist-electron/preload/index.mjs'),
    join(app.getAppPath(), 'dist-electron/preload/index.js'),
  ];
  return candidates.find((p) => existsSync(p));
}

function resolveRendererPath(): string {
  const candidates = [
    join(app.getAppPath(), 'dist/renderer/index.html'),
    join(__dirname, '../../dist/renderer/index.html'),
    join(__dirname, '../renderer/index.html'),
    join(__dirname, 'dist/renderer/index.html'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;

  console.warn('Could not find renderer at primary candidates, using appPath fallback:', candidates[0]);
  return candidates[0]!;
}

function createWindow(): void {
  const preloadFile = resolvePreloadPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CourseNest',
    show: false,
    backgroundColor: getSavedThemeBg(),
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: true,
      spellcheck: false,
    },
  });

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' file:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com file:; img-src 'self' data: blob: https: file:; media-src 'self' blob: file: data: https: vault-media:; font-src 'self' data: https://fonts.gstatic.com file:; frame-src 'self' https: http:; connect-src 'self' https: http://localhost:* http://127.0.0.1:* data: blob: file:;",
        ],
      },
    });
  });

  // Resilient window presentation (prevents invisible background process in Windows Task Manager)
  let hasShown = false;
  const showWindowSafely = () => {
    if (!hasShown && mainWindow && !mainWindow.isDestroyed()) {
      hasShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once('ready-to-show', () => {
    showWindowSafely();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    showWindowSafely();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Window failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    showWindowSafely();
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  // Failsafe timer: forces window to show within 750ms so user is never left without a GUI
  setTimeout(showWindowSafely, 750);

  // Load the renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    const htmlFile = resolveRendererPath();
    console.log(`Loading renderer HTML from: ${htmlFile}`);
    mainWindow.loadFile(htmlFile).catch((err) => {
      console.error('mainWindow.loadFile error:', err);
      showWindowSafely();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    // Initialize local database gracefully
    await initializeDatabase();
  } catch (err: any) {
    console.warn('initializeDatabase error caught in app.whenReady:', err?.message);
  }

  try {
    // Register IPC handlers
    registerIpcHandlers();
  } catch (err: any) {
    console.warn('registerIpcHandlers error caught:', err?.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external URLs in the primary window
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});
