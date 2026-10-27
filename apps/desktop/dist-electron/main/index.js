import { ipcMain, BrowserWindow, dialog, app, Notification, shell } from "electron";
import { dirname, resolve, join } from "path";
import { constants, existsSync, readFileSync } from "fs";
import { readFile, stat, readdir, access, writeFile, mkdir } from "fs/promises";
import { createSqliteConnection, initializeSqliteDatabase } from "@coursenest/sqlite-adapter";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let configuredExternalMountPath = null;
const allowedUserDirs = /* @__PURE__ */ new Set();
function validatePathBoundary(targetPath) {
  const resolvedPath = resolve(targetPath);
  const dataDir = resolve(app.getPath("userData"));
  const tempDir = resolve(app.getPath("temp"));
  const documentsDir = resolve(app.getPath("documents"));
  const downloadsDir = resolve(app.getPath("downloads"));
  const homeDir = resolve(app.getPath("home"));
  const isAllowedInternal = resolvedPath.startsWith(dataDir) || resolvedPath.startsWith(tempDir) || resolvedPath.startsWith(documentsDir) || resolvedPath.startsWith(downloadsDir);
  const isAllowedExternal = configuredExternalMountPath ? resolvedPath.startsWith(resolve(configuredExternalMountPath)) : false;
  const isUserAllowed = Array.from(allowedUserDirs).some((d) => resolvedPath.startsWith(d));
  const isStandardMediaMount = resolvedPath.startsWith("/media") || resolvedPath.startsWith("/run/media") || resolvedPath.startsWith("/mnt") || resolvedPath.startsWith("/Volumes") || resolvedPath.startsWith(join(homeDir, "Downloads")) || resolvedPath.startsWith(join(homeDir, "Documents")) || /^[a-zA-Z]:\\/.test(resolvedPath);
  if (!isAllowedInternal && !isAllowedExternal && !isUserAllowed && !isStandardMediaMount) {
    throw new Error(`Access denied: path "${targetPath}" is outside authorized storage directories`);
  }
  return resolvedPath;
}
function registerIpcHandlers() {
  ipcMain.handle("window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    win?.minimize();
    return true;
  });
  ipcMain.handle("window:maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return win.isMaximized();
    }
    return false;
  });
  ipcMain.handle("window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    win?.close();
    return true;
  });
  ipcMain.handle("window:isMaximized", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    return win?.isMaximized() ?? false;
  });
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
            extensions: ["zip", "rar", "7z", "7zip", "tar.gz", "tgz", "tar", "pdf", "docx", "pptx", "mp4", "webm", "mkv", "json"]
          },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!result.canceled && result.filePaths.length > 0) {
        for (const p of result.filePaths) {
          allowedUserDirs.add(dirname(resolve(p)));
        }
      }
      return result.canceled ? [] : result.filePaths;
    }
  );
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"]
    });
    if (!result.canceled && result.filePaths[0]) {
      const selected = resolve(result.filePaths[0]);
      configuredExternalMountPath = selected;
      allowedUserDirs.add(selected);
      return selected;
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
    configuredExternalMountPath = resolve(mountPath);
    allowedUserDirs.add(configuredExternalMountPath);
    return { success: true, mountPath: configuredExternalMountPath };
  });
  const VAULT_FILE = join(app.getPath("userData"), "coursenest_vault_courses.json");
  ipcMain.handle("storage:getPersistentCourses", async () => {
    try {
      if (existsSync(VAULT_FILE)) {
        const raw = await readFile(VAULT_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not read persistent vault courses:", e?.message);
    }
    return [];
  });
  ipcMain.handle("storage:savePersistentCourses", async (_event, courses) => {
    try {
      await writeFile(VAULT_FILE, JSON.stringify(courses, null, 2), "utf-8");
      return true;
    } catch (e) {
      console.warn("Could not save persistent vault courses:", e?.message);
      return false;
    }
  });
  ipcMain.handle("storage:saveCourseToDisk", async (_event, params) => {
    try {
      const { course, targetDir } = params;
      const baseDir = targetDir ? validatePathBoundary(targetDir) : configuredExternalMountPath ? validatePathBoundary(configuredExternalMountPath) : join(app.getPath("userData"), "courses");
      const courseDir = join(baseDir, "coursenest_courses", course.id);
      await mkdir(courseDir, { recursive: true });
      const manifestPath = join(courseDir, "coursenest-manifest.json");
      const courseWithDir = {
        ...course,
        storageTier: targetDir || configuredExternalMountPath ? "external" : "internal",
        externalMountPath: baseDir,
        externalCourseDir: courseDir
      };
      await writeFile(manifestPath, JSON.stringify(courseWithDir, null, 2), "utf-8");
      let existing = [];
      try {
        if (existsSync(VAULT_FILE)) {
          existing = JSON.parse(await readFile(VAULT_FILE, "utf-8"));
          if (!Array.isArray(existing)) existing = [];
        }
      } catch {
      }
      const filtered = existing.filter((c) => c.id !== course.id);
      filtered.unshift(courseWithDir);
      await writeFile(VAULT_FILE, JSON.stringify(filtered, null, 2), "utf-8");
      return { success: true, courseDir, manifestPath };
    } catch (err) {
      console.error("Failed to save course to disk:", err);
      throw err;
    }
  });
  ipcMain.handle(
    "storage:writeMediaFile",
    async (_event, params) => {
      const { courseId, filePath, buffer, targetDir } = params;
      const baseDir = targetDir ? validatePathBoundary(targetDir) : configuredExternalMountPath ? validatePathBoundary(configuredExternalMountPath) : join(app.getPath("userData"), "courses");
      const cleanRelative = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const fullPath = validatePathBoundary(join(baseDir, "coursenest_courses", courseId, cleanRelative));
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, Buffer.from(buffer));
      return { success: true, fullPath };
    }
  );
  ipcMain.handle(
    "storage:readMediaFile",
    async (_event, params) => {
      const { courseId, filePath, targetDir } = params;
      const baseDir = targetDir ? validatePathBoundary(targetDir) : configuredExternalMountPath ? validatePathBoundary(configuredExternalMountPath) : join(app.getPath("userData"), "courses");
      const cleanRelative = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const fullPath = validatePathBoundary(join(baseDir, "coursenest_courses", courseId, cleanRelative));
      try {
        await access(fullPath, constants.R_OK);
        const fileBuf = await readFile(fullPath);
        return { exists: true, buffer: fileBuf.buffer };
      } catch (err) {
        return { exists: false, error: err.message };
      }
    }
  );
  async function scanDirectoryRecursive(baseDir) {
    const discovered = [];
    try {
      const resolved = validatePathBoundary(baseDir);
      await access(resolved, constants.R_OK);
      const coursesSubdir = join(resolved, "coursenest_courses");
      const dirsToCheck = [];
      if (existsSync(coursesSubdir)) {
        const subEntries = await readdir(coursesSubdir, { withFileTypes: true });
        for (const entry of subEntries) {
          if (entry.isDirectory()) {
            dirsToCheck.push(join(coursesSubdir, entry.name));
          }
        }
      }
      dirsToCheck.push(resolved);
      for (const d of dirsToCheck) {
        const candidateFiles = [
          join(d, "coursenest-manifest.json"),
          join(d, "course.json"),
          join(d, "manifest.json")
        ];
        for (const candidate of candidateFiles) {
          if (existsSync(candidate)) {
            try {
              const raw = await readFile(candidate, "utf-8");
              const data = JSON.parse(raw);
              if (data && (data.id || data.title) && Array.isArray(data.sections)) {
                discovered.push({
                  ...data,
                  storageTier: "external",
                  externalMountPath: resolved,
                  externalCourseDir: d
                });
                break;
              }
            } catch (err) {
              console.warn(`Could not parse course manifest at ${candidate}:`, err);
            }
          }
        }
      }
    } catch {
    }
    return discovered;
  }
  ipcMain.handle("storage:scanDirectoryForCourses", async (_event, dirPath) => {
    const target = dirPath || configuredExternalMountPath;
    if (!target) return [];
    return await scanDirectoryRecursive(target);
  });
  ipcMain.handle("storage:listExternalMounts", async () => {
    const mounts = [];
    const rootsToProbe = [];
    if (process.platform === "linux") {
      const user = process.env.USER || process.env.LOGNAME || "";
      rootsToProbe.push("/media", "/run/media");
      if (user) {
        rootsToProbe.push(`/media/${user}`, `/run/media/${user}`);
      }
      rootsToProbe.push("/mnt");
    } else if (process.platform === "darwin") {
      rootsToProbe.push("/Volumes");
    } else if (process.platform === "win32") {
      for (let code = 68; code <= 90; code++) {
        rootsToProbe.push(`${String.fromCharCode(code)}:\\`);
      }
    }
    const checkedPaths = /* @__PURE__ */ new Set();
    for (const root of rootsToProbe) {
      try {
        if (!existsSync(root)) continue;
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const mountPath = join(root, entry.name);
            if (checkedPaths.has(mountPath)) continue;
            checkedPaths.add(mountPath);
            try {
              await access(mountPath, constants.R_OK);
              const coursesFolder = join(mountPath, "coursenest_courses");
              const hasCourses = existsSync(coursesFolder);
              let courseCount = 0;
              if (hasCourses) {
                const courseDirs = await readdir(coursesFolder, { withFileTypes: true });
                courseCount = courseDirs.filter((d) => d.isDirectory()).length;
              }
              mounts.push({
                path: mountPath,
                label: entry.name,
                isMounted: true,
                hasCourses,
                courseCount
              });
            } catch {
            }
          }
        }
      } catch {
      }
    }
    if (configuredExternalMountPath && !mounts.some((m) => m.path === configuredExternalMountPath)) {
      try {
        await access(configuredExternalMountPath, constants.R_OK);
        const coursesFolder = join(configuredExternalMountPath, "coursenest_courses");
        const hasCourses = existsSync(coursesFolder);
        let courseCount = 0;
        if (hasCourses) {
          const courseDirs = await readdir(coursesFolder, { withFileTypes: true });
          courseCount = courseDirs.filter((d) => d.isDirectory()).length;
        }
        mounts.unshift({
          path: configuredExternalMountPath,
          label: configuredExternalMountPath.split(/[/\\]/).pop() || "Configured External Mount",
          isMounted: true,
          hasCourses,
          courseCount
        });
      } catch {
      }
    }
    return mounts;
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
  ipcMain.handle("theme:getTheme", () => {
    try {
      const configPath = join(app.getPath("userData"), "theme_preference.json");
      if (existsSync(configPath)) {
        const raw = readFileSync(configPath, "utf-8");
        const data = JSON.parse(raw);
        return data.themeId || null;
      }
    } catch (e) {
      console.warn("Failed to read theme preference file:", e);
    }
    return null;
  });
  ipcMain.handle("theme:setTheme", async (_event, themeId) => {
    try {
      const configPath = join(app.getPath("userData"), "theme_preference.json");
      await writeFile(configPath, JSON.stringify({ themeId, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, null, 2), "utf-8");
      return true;
    } catch (e) {
      console.warn("Failed to write theme preference file:", e);
      return false;
    }
  });
}
let dbConnection = null;
async function initializeDatabase() {
  try {
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
    } catch (errBetter) {
      console.warn("better-sqlite3 driver unavailable, attempting fallback:", errBetter?.message);
      try {
        const nodeSqlite = await import("node:sqlite");
        if (nodeSqlite && nodeSqlite.DatabaseSync) {
          rawDb = new nodeSqlite.DatabaseSync(dbPath);
        }
      } catch {
        console.warn("Native SQLite driver not required; CourseNest client uses sandboxed IndexedDB.");
      }
    }
    if (rawDb) {
      dbConnection = createSqliteConnection(rawDb);
      initializeSqliteDatabase(dbConnection);
    }
    return dbConnection;
  } catch (err) {
    console.warn("Database initialization non-fatal warning:", err?.message);
    return null;
  }
}
const THEME_BG_MAP = {
  obsidian: "#0A0A0B",
  halal: "#F4F9F5",
  sakura: "#FFF5F7",
  toybox: "#FFFBEB",
  cyberpunk: "#05050A",
  manga: "#FFFFFF",
  ghibli: "#F5F9F6",
  oled: "#000000",
  paper: "#F8F9FA"
};
function getSavedThemeBg() {
  try {
    const configPath = join(app.getPath("userData"), "theme_preference.json");
    if (existsSync(configPath)) {
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      if (data?.themeId && THEME_BG_MAP[data.themeId]) {
        return THEME_BG_MAP[data.themeId];
      }
    }
  } catch {
  }
  return "#0A0A0B";
}
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=2048");
app.commandLine.appendSwitch("renderer-process-limit", "4");
let mainWindow = null;
function resolvePreloadPath() {
  const candidates = [
    join(__dirname, "../preload/index.mjs"),
    join(__dirname, "../preload/index.js"),
    join(app.getAppPath(), "dist-electron/preload/index.mjs"),
    join(app.getAppPath(), "dist-electron/preload/index.js")
  ];
  return candidates.find((p) => existsSync(p));
}
function resolveRendererPath() {
  const candidates = [
    join(app.getAppPath(), "dist/renderer/index.html"),
    join(__dirname, "../../dist/renderer/index.html"),
    join(__dirname, "../renderer/index.html"),
    join(__dirname, "dist/renderer/index.html")
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  console.warn("Could not find renderer at primary candidates, using appPath fallback:", candidates[0]);
  return candidates[0];
}
function createWindow() {
  const preloadFile = resolvePreloadPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "CourseNest",
    show: false,
    frame: false,
    // Frameless window removes native OS bezel and allows theme integration
    backgroundColor: getSavedThemeBg(),
    webPreferences: {
      preload: preloadFile,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: true,
      spellcheck: false
    }
  });
  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximized-status", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximized-status", false);
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' file:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com file:; img-src 'self' data: blob: https: file:; media-src 'self' blob: file: data: https: vault-media:; font-src 'self' data: https://fonts.gstatic.com file:; frame-src 'self' https: http:; connect-src 'self' https: http://localhost:* http://127.0.0.1:* data: blob: file:;"
        ]
      }
    });
  });
  let hasShown = false;
  const showWindowSafely = () => {
    if (!hasShown && mainWindow && !mainWindow.isDestroyed()) {
      hasShown = true;
      mainWindow.show();
      mainWindow.focus();
    }
  };
  mainWindow.once("ready-to-show", () => {
    showWindowSafely();
  });
  mainWindow.webContents.once("did-finish-load", () => {
    showWindowSafely();
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Window failed to load: ${validatedURL} (${errorCode}: ${errorDescription})`);
    showWindowSafely();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });
  setTimeout(showWindowSafely, 750);
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const htmlFile = resolveRendererPath();
    console.log(`Loading renderer HTML from: ${htmlFile}`);
    mainWindow.loadFile(htmlFile).catch((err) => {
      console.error("mainWindow.loadFile error:", err);
      showWindowSafely();
    });
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(async () => {
  try {
    await initializeDatabase();
  } catch (err) {
    console.warn("initializeDatabase error caught in app.whenReady:", err?.message);
  }
  try {
    registerIpcHandlers();
  } catch (err) {
    console.warn("registerIpcHandlers error caught:", err?.message);
  }
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
