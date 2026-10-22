import { ipcMain, dialog, app, Notification, BrowserWindow, shell } from "electron";
import { join, resolve } from "path";
import { readFile, stat, readdir, access, mkdir } from "fs/promises";
import { constants } from "fs";
import { createSqliteConnection, initializeSqliteDatabase } from "@coursenest/sqlite-adapter";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let configuredExternalMountPath = null;
function validatePathBoundary(targetPath) {
  const resolvedPath = resolve(targetPath);
  const dataDir = resolve(app.getPath("userData"));
  const tempDir = resolve(app.getPath("temp"));
  const documentsDir = resolve(app.getPath("documents"));
  const downloadsDir = resolve(app.getPath("downloads"));
  const isAllowedInternal = resolvedPath.startsWith(dataDir) || resolvedPath.startsWith(tempDir) || resolvedPath.startsWith(documentsDir) || resolvedPath.startsWith(downloadsDir);
  const isAllowedExternal = configuredExternalMountPath ? resolvedPath.startsWith(resolve(configuredExternalMountPath)) : false;
  const isStandardMediaMount = resolvedPath.startsWith("/media") || resolvedPath.startsWith("/run/media") || resolvedPath.startsWith("/mnt") || resolvedPath.startsWith("/Volumes") || /^[a-zA-Z]:\\/.test(resolvedPath);
  if (!isAllowedInternal && !isAllowedExternal && !isStandardMediaMount) {
    throw new Error(`Access denied: path "${targetPath}" is outside authorized storage directories`);
  }
  return resolvedPath;
}
function registerIpcHandlers() {
  ipcMain.handle(
    "dialog:openFiles",
    async (_event, options) => {
      const properties = ["openFile"];
      if (options?.multiple) {
        properties.push("multiSelections");
      }
      const result = await dialog.showOpenDialog({
        properties,
        filters: options?.filters ?? [
          {
            name: "Course Materials",
            extensions: ["zip", "tar.gz", "tgz", "pdf", "docx", "pptx", "mp4", "webm", "mkv", "json"]
          },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      return result.canceled ? [] : result.filePaths;
    }
  );
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });
    if (!result.canceled && result.filePaths[0]) {
      configuredExternalMountPath = result.filePaths[0];
      return result.filePaths[0];
    }
    return null;
  });
  ipcMain.handle("fs:readFile", async (_event, filePath) => {
    const resolvedPath = validatePathBoundary(filePath);
    const buffer = await readFile(resolvedPath);
    return buffer.buffer;
  });
  ipcMain.handle("fs:stat", async (_event, filePath) => {
    const resolvedPath = validatePathBoundary(filePath);
    const stats = await stat(resolvedPath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime.toISOString()
    };
  });
  ipcMain.handle("fs:readDir", async (_event, dirPath) => {
    const resolvedPath = validatePathBoundary(dirPath);
    const entries = await readdir(resolvedPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory()
    }));
  });
  ipcMain.handle("storage:checkVolumeAccess", async (_event, volumePath) => {
    try {
      await access(volumePath, constants.R_OK);
      return { isMounted: true, path: volumePath };
    } catch {
      return { isMounted: false, path: volumePath, error: "Volume inaccessible or disconnected" };
    }
  });
  ipcMain.handle("storage:setExternalMountPath", (_event, mountPath) => {
    configuredExternalMountPath = mountPath;
    return { success: true, mountPath };
  });
  ipcMain.handle("app:getPath", (_event, name) => {
    return app.getPath(name);
  });
  ipcMain.handle("app:getDataDir", () => {
    return join(app.getPath("userData"), "data");
  });
  ipcMain.handle("app:getResourcesDir", () => {
    return join(app.getPath("userData"), "data", "resources");
  });
  ipcMain.handle("app:getPlatformInfo", () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    dataDir: join(app.getPath("userData"), "data"),
    externalMountPath: configuredExternalMountPath
  }));
  ipcMain.handle("app:showNotification", (_event, title, body) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}
let dbConnection = null;
async function initializeDatabase() {
  const dataDir = join(app.getPath("userData"), "data");
  const resourcesDir = join(dataDir, "resources");
  const tempDir = join(dataDir, "temp");
  await mkdir(dataDir, { recursive: true });
  await mkdir(resourcesDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });
  const dbPath = join(dataDir, "coursenest.db");
  console.log(`Database path: ${dbPath}`);
  let rawDb;
  try {
    const BetterSqlite3 = (await import("better-sqlite3")).default;
    rawDb = new BetterSqlite3(dbPath);
  } catch {
    const { DatabaseSync } = await import("node:sqlite");
    rawDb = new DatabaseSync(dbPath);
  }
  dbConnection = createSqliteConnection(rawDb);
  initializeSqliteDatabase(dbConnection);
  return dbConnection;
}
let mainWindow = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "CourseNest",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: file:; font-src 'self'; connect-src 'self'"
        ]
      }
    });
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(async () => {
  await initializeDatabase();
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "file:") {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});
