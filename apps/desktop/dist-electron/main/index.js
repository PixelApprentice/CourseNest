import { ipcMain, BrowserWindow, dialog, app, Notification, shell } from "electron";
import { dirname, resolve, join, basename } from "path";
import { constants, existsSync, readFileSync } from "fs";
import { readFile, stat, readdir, access, writeFile, mkdir, rm } from "fs/promises";
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
function resolveCourseStorageDir(baseDir, courseId) {
  const normBase = resolve(baseDir);
  const baseName = basename(normBase).toLowerCase();
  if (baseName === "coursenest_courses") {
    return join(normBase, courseId);
  }
  return join(normBase, "CourseNest_courses", courseId);
}
function getSystemMountRoots() {
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
  return rootsToProbe;
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
  const PROGRESS_FILE = join(app.getPath("userData"), "coursenest_progress.json");
  const FLASHCARDS_FILE = join(app.getPath("userData"), "coursenest_flashcards.json");
  const HOME_DIR = app.getPath("home");
  const EXTERNAL_PROGRESS = join(HOME_DIR, ".coursenest-progress.json");
  const EXTERNAL_FLASHCARDS = join(HOME_DIR, ".coursenest-flashcards.json");
  ipcMain.handle("storage:saveProgress", async (_event, params) => {
    try {
      let current = {};
      if (existsSync(PROGRESS_FILE)) {
        try {
          current = JSON.parse(await readFile(PROGRESS_FILE, "utf-8"));
        } catch {
        }
      }
      current[params.courseId] = {
        ...params.progress,
        lastActive: (/* @__PURE__ */ new Date()).toISOString()
      };
      const json = JSON.stringify(current, null, 2);
      await writeFile(PROGRESS_FILE, json, "utf-8");
      try {
        await writeFile(EXTERNAL_PROGRESS, json, "utf-8");
      } catch {
      }
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("storage:getProgress", async (_event, courseId) => {
    try {
      if (existsSync(PROGRESS_FILE)) {
        const data = JSON.parse(await readFile(PROGRESS_FILE, "utf-8"));
        return courseId ? data[courseId] || null : data;
      }
    } catch {
    }
    return courseId ? null : {};
  });
  ipcMain.handle("storage:saveFlashcard", async (_event, card) => {
    try {
      let cards = [];
      if (existsSync(FLASHCARDS_FILE)) {
        try {
          cards = JSON.parse(await readFile(FLASHCARDS_FILE, "utf-8"));
        } catch {
        }
      }
      cards.unshift(card);
      const json = JSON.stringify(cards, null, 2);
      await writeFile(FLASHCARDS_FILE, json, "utf-8");
      try {
        await writeFile(EXTERNAL_FLASHCARDS, json, "utf-8");
      } catch {
      }
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.handle("storage:getFlashcards", async (_event, courseId) => {
    try {
      if (existsSync(FLASHCARDS_FILE)) {
        const cards = JSON.parse(await readFile(FLASHCARDS_FILE, "utf-8"));
        if (Array.isArray(cards)) {
          return courseId ? cards.filter((c) => c.courseId === courseId) : cards;
        }
      }
    } catch {
    }
    return [];
  });
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
      const isInternal = course?.storageTier === "internal" || !targetDir && !configuredExternalMountPath;
      const baseDir = isInternal ? join(app.getPath("userData"), "courses") : validatePathBoundary(targetDir || configuredExternalMountPath || join(app.getPath("userData"), "courses"));
      const courseDir = resolveCourseStorageDir(baseDir, course.id);
      await mkdir(courseDir, { recursive: true });
      const manifestPath = join(courseDir, "coursenest-manifest.json");
      const courseWithDir = {
        ...course,
        storageTier: isInternal ? "internal" : "external",
        externalMountPath: isInternal ? void 0 : baseDir,
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
      const { courseId, filePath, buffer, targetDir, storageTier } = params;
      const isInternal = storageTier === "internal" || !targetDir && !configuredExternalMountPath;
      const baseDir = isInternal ? join(app.getPath("userData"), "courses") : validatePathBoundary(targetDir || configuredExternalMountPath || join(app.getPath("userData"), "courses"));
      const courseDir = resolveCourseStorageDir(baseDir, courseId);
      const cleanRelative = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const fullPath = validatePathBoundary(join(courseDir, cleanRelative));
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, Buffer.from(buffer));
      return { success: true, fullPath, courseDir };
    }
  );
  ipcMain.handle(
    "storage:readMediaFile",
    async (_event, params) => {
      const { courseId, filePath, targetDir } = params;
      const cleanRelative = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
      const candidateDirs = /* @__PURE__ */ new Set();
      if (targetDir) candidateDirs.add(resolve(targetDir));
      if (configuredExternalMountPath) candidateDirs.add(resolve(configuredExternalMountPath));
      candidateDirs.add(join(app.getPath("userData"), "courses"));
      const roots = getSystemMountRoots();
      for (const root of roots) {
        try {
          if (existsSync(root)) {
            const entries = await readdir(root, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                candidateDirs.add(join(root, entry.name));
              }
            }
          }
        } catch {
        }
      }
      for (const baseDir of candidateDirs) {
        const candidatePaths = [
          join(resolveCourseStorageDir(baseDir, courseId), cleanRelative),
          join(baseDir, "coursenest_courses", courseId, cleanRelative),
          join(baseDir, "CourseNest_courses", courseId, cleanRelative),
          join(baseDir, courseId, cleanRelative)
        ];
        for (const p of candidatePaths) {
          try {
            const resolved = validatePathBoundary(p);
            await access(resolved, constants.R_OK);
            const fileBuf = await readFile(resolved);
            return { exists: true, buffer: fileBuf.buffer, path: resolved };
          } catch {
          }
        }
      }
      return { exists: false, error: "Media file not found on disk" };
    }
  );
  ipcMain.handle(
    "storage:deleteCourseFromDisk",
    async (_event, params) => {
      const { courseId, courseDir, mountPath } = params;
      try {
        if (existsSync(VAULT_FILE)) {
          try {
            const raw = await readFile(VAULT_FILE, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const remaining = parsed.filter((c) => c.id !== courseId);
              await writeFile(VAULT_FILE, JSON.stringify(remaining, null, 2), "utf-8");
            }
          } catch {
          }
        }
        const candidateDirs = /* @__PURE__ */ new Set();
        if (courseDir) candidateDirs.add(courseDir);
        const baseDir = mountPath || configuredExternalMountPath;
        if (baseDir) {
          candidateDirs.add(resolveCourseStorageDir(baseDir, courseId));
          candidateDirs.add(join(baseDir, "coursenest_courses", courseId));
          candidateDirs.add(join(baseDir, "CourseNest_courses", courseId));
          candidateDirs.add(join(baseDir, courseId));
        }
        for (const dir of candidateDirs) {
          try {
            const resolved = validatePathBoundary(dir);
            if (existsSync(resolved)) {
              await rm(resolved, { recursive: true, force: true });
            }
          } catch (e) {
            console.warn(`Could not remove course dir ${dir}:`, e?.message);
          }
        }
        return { success: true };
      } catch (err) {
        console.error(`Failed to delete course from disk (${courseId}):`, err);
        return { success: false, error: err.message };
      }
    }
  );
  async function scanDirectoryRecursive(baseDir) {
    const discovered = [];
    try {
      const resolved = validatePathBoundary(baseDir);
      await access(resolved, constants.R_OK);
      const dirsToCheck = /* @__PURE__ */ new Set();
      dirsToCheck.add(resolved);
      try {
        const directEntries = await readdir(resolved, { withFileTypes: true });
        for (const entry of directEntries) {
          if (entry.isDirectory()) {
            const childDir = join(resolved, entry.name);
            dirsToCheck.add(childDir);
            if (entry.name.toLowerCase() === "coursenest_courses") {
              try {
                const subEntries = await readdir(childDir, { withFileTypes: true });
                for (const sub of subEntries) {
                  if (sub.isDirectory()) {
                    dirsToCheck.add(join(childDir, sub.name));
                  }
                }
              } catch {
              }
            }
          }
        }
      } catch {
      }
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
                  externalCourseDir: d,
                  isExternalMissing: false
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
  ipcMain.handle("storage:autoLocateCourseDir", async (_event, params) => {
    const { courseId, courseDir } = params;
    if (!courseId) return { exists: false };
    if (courseDir && existsSync(courseDir)) {
      try {
        await access(courseDir, constants.R_OK);
        return { exists: true, courseDir, mountPath: dirname(courseDir) };
      } catch {
      }
    }
    if (configuredExternalMountPath && existsSync(configuredExternalMountPath)) {
      const candidates = [
        join(configuredExternalMountPath, courseId),
        join(configuredExternalMountPath, "CourseNest_courses", courseId),
        join(configuredExternalMountPath, "coursenest_courses", courseId)
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          try {
            await access(cand, constants.R_OK);
            return { exists: true, courseDir: cand, mountPath: configuredExternalMountPath };
          } catch {
          }
        }
      }
    }
    const rootsToProbe = [];
    if (process.platform === "linux") {
      const user = process.env.USER || process.env.LOGNAME || "";
      rootsToProbe.push("/run/media", "/media");
      if (user) {
        rootsToProbe.push(`/run/media/${user}`, `/media/${user}`);
      }
      rootsToProbe.push("/mnt");
    } else if (process.platform === "darwin") {
      rootsToProbe.push("/Volumes");
    } else if (process.platform === "win32") {
      for (let code = 68; code <= 90; code++) {
        rootsToProbe.push(`${String.fromCharCode(code)}:\\`);
      }
    }
    for (const root of rootsToProbe) {
      if (!existsSync(root)) continue;
      try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const mount = join(root, entry.name);
          const candidates = [
            join(mount, courseId),
            join(mount, "CourseNest_courses", courseId),
            join(mount, "coursenest_courses", courseId)
          ];
          for (const cand of candidates) {
            if (existsSync(cand)) {
              try {
                await access(cand, constants.R_OK);
                return { exists: true, courseDir: cand, mountPath: mount };
              } catch {
              }
            }
          }
        }
      } catch {
      }
    }
    return { exists: false };
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
              const coursesFolderCandidates = [
                join(mountPath, "CourseNest_courses"),
                join(mountPath, "coursenest_courses")
              ];
              let hasCourses = false;
              let courseCount = 0;
              for (const folder of coursesFolderCandidates) {
                if (existsSync(folder)) {
                  hasCourses = true;
                  const courseDirs = await readdir(folder, { withFileTypes: true });
                  courseCount += courseDirs.filter((d) => d.isDirectory()).length;
                }
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
        const coursesFolderCandidates = [
          join(configuredExternalMountPath, "CourseNest_courses"),
          join(configuredExternalMountPath, "coursenest_courses")
        ];
        let hasCourses = false;
        let courseCount = 0;
        for (const folder of coursesFolderCandidates) {
          if (existsSync(folder)) {
            hasCourses = true;
            const courseDirs = await readdir(folder, { withFileTypes: true });
            courseCount += courseDirs.filter((d) => d.isDirectory()).length;
          }
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
  let lastMountSnapshot = "";
  const monitorVolumeChanges = async () => {
    try {
      let snapshot = "";
      if (process.platform === "linux") {
        if (existsSync("/proc/mounts")) {
          try {
            snapshot = await readFile("/proc/mounts", "utf-8");
          } catch {
          }
        }
      }
      const user = process.env.USER || process.env.LOGNAME || "";
      for (const p of ["/run/media", `/run/media/${user}`, "/media", `/media/${user}`, "/mnt", "/Volumes"]) {
        if (existsSync(p)) {
          try {
            const list = await readdir(p);
            snapshot += `|${p}:${list.sort().join(",")}`;
          } catch {
          }
        }
      }
      if (lastMountSnapshot && snapshot !== lastMountSnapshot) {
        lastMountSnapshot = snapshot;
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send("storage:mountsChanged", { timestamp: Date.now() });
          }
        });
      } else {
        lastMountSnapshot = snapshot;
      }
    } catch {
    }
  };
  const volumeInterval = setInterval(monitorVolumeChanges, 1500);
  app.on("will-quit", () => clearInterval(volumeInterval));
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
if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
  app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder,VaapiVideoEncoder");
}
app.commandLine.appendSwitch("enable-gpu-rasterization");
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
