import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { registerIpcHandlers } from './ipc-handlers.js';
import { initializeDatabase } from './database.js';

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
    backgroundColor: '#0D1117',
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: file: data: https:; font-src 'self' data:; connect-src 'self' https: data: blob:;",
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
