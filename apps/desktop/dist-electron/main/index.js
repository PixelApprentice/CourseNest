import { app, ipcMain, BrowserWindow, dialog, shell, safeStorage, Notification } from "electron";
import { join, dirname, resolve, relative, basename } from "path";
import { constants, existsSync, readFileSync } from "fs";
import { mkdir, readFile, stat, readdir, access, writeFile, rm, readlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { createSqliteConnection, initializeSqliteDatabase } from "@coursenest/sqlite-adapter";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let dbConnection = null;
function saveDetailedProgressDb(record) {
  try {
    if (!dbConnection) return false;
    const now = record.lastAccessedAt || (/* @__PURE__ */ new Date()).toISOString();
    const completedInt = record.completed ? 1 : 0;
    const completedAt = record.completed ? record.completedAt || now : null;
    dbConnection.prepare(`
      INSERT INTO learning_progress_records (
        course_id, lesson_id, block_id, completed, time_spent_seconds,
        video_position_seconds, video_duration_seconds, reading_page,
        reading_total_pages, last_accessed_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(course_id, lesson_id) DO UPDATE SET
        block_id = COALESCE(excluded.block_id, learning_progress_records.block_id),
        completed = CASE WHEN excluded.completed = 1 THEN 1 ELSE learning_progress_records.completed END,
        time_spent_seconds = learning_progress_records.time_spent_seconds + excluded.time_spent_seconds,
        video_position_seconds = CASE 
          WHEN excluded.video_position_seconds > 0 THEN excluded.video_position_seconds 
          ELSE learning_progress_records.video_position_seconds 
        END,
        video_duration_seconds = CASE 
          WHEN excluded.video_duration_seconds > 0 THEN excluded.video_duration_seconds 
          ELSE learning_progress_records.video_duration_seconds 
        END,
        reading_page = CASE 
          WHEN excluded.reading_page > 0 THEN excluded.reading_page 
          ELSE learning_progress_records.reading_page 
        END,
        reading_total_pages = CASE 
          WHEN excluded.reading_total_pages > 0 THEN excluded.reading_total_pages 
          ELSE learning_progress_records.reading_total_pages 
        END,
        last_accessed_at = excluded.last_accessed_at,
        completed_at = COALESCE(excluded.completed_at, learning_progress_records.completed_at)
    `).run(
      record.courseId,
      record.lessonId,
      record.blockId || null,
      completedInt,
      record.timeSpentSeconds || 0,
      record.videoPositionSeconds || 0,
      record.videoDurationSeconds || 0,
      record.readingPage || 1,
      record.readingTotalPages || 1,
      now,
      completedAt
    );
    return true;
  } catch (err) {
    console.warn("saveDetailedProgressDb warning:", err?.message);
    return false;
  }
}
function getDetailedProgressDb(courseId, lessonId) {
  try {
    if (!dbConnection) return null;
    if (lessonId) {
      const row = dbConnection.prepare(`
        SELECT * FROM learning_progress_records
        WHERE course_id = ? AND lesson_id = ?
      `).get(courseId, lessonId);
      if (!row) return null;
      return {
        courseId: row.course_id,
        lessonId: row.lesson_id,
        blockId: row.block_id || void 0,
        completed: Boolean(row.completed),
        timeSpentSeconds: row.time_spent_seconds || 0,
        videoPositionSeconds: row.video_position_seconds || 0,
        videoDurationSeconds: row.video_duration_seconds || 0,
        readingPage: row.reading_page || 1,
        readingTotalPages: row.reading_total_pages || 1,
        lastAccessedAt: row.last_accessed_at,
        completedAt: row.completed_at || void 0
      };
    } else {
      const rows = dbConnection.prepare(`
        SELECT * FROM learning_progress_records
        WHERE course_id = ?
      `).all(courseId);
      const map = {};
      for (const row of rows) {
        map[row.lesson_id] = {
          courseId: row.course_id,
          lessonId: row.lesson_id,
          blockId: row.block_id || void 0,
          completed: Boolean(row.completed),
          timeSpentSeconds: row.time_spent_seconds || 0,
          videoPositionSeconds: row.video_position_seconds || 0,
          videoDurationSeconds: row.video_duration_seconds || 0,
          readingPage: row.reading_page || 1,
          readingTotalPages: row.reading_total_pages || 1,
          lastAccessedAt: row.last_accessed_at,
          completedAt: row.completed_at || void 0
        };
      }
      return map;
    }
  } catch (err) {
    console.warn("getDetailedProgressDb warning:", err?.message);
    return null;
  }
}
function saveVolumeRegistryDb(vol) {
  try {
    if (!dbConnection) return false;
    dbConnection.prepare(`
      INSERT INTO volume_registry (uuid, label, last_mount_path, last_seen_at, registered_course_ids)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        label = excluded.label,
        last_mount_path = excluded.last_mount_path,
        last_seen_at = excluded.last_seen_at,
        registered_course_ids = excluded.registered_course_ids
    `).run(
      vol.uuid,
      vol.label,
      vol.lastMountPath,
      vol.lastSeenAt,
      JSON.stringify(vol.registeredCourseIds || [])
    );
    return true;
  } catch (err) {
    console.warn("saveVolumeRegistryDb warning:", err?.message);
    return false;
  }
}
function getVolumeRegistryDb() {
  try {
    if (!dbConnection) return [];
    const rows = dbConnection.prepare(`SELECT * FROM volume_registry`).all();
    return rows.map((r) => ({
      uuid: r.uuid,
      label: r.label,
      lastMountPath: r.last_mount_path,
      lastSeenAt: r.last_seen_at,
      registeredCourseIds: JSON.parse(r.registered_course_ids || "[]")
    }));
  } catch (err) {
    console.warn("getVolumeRegistryDb warning:", err?.message);
    return [];
  }
}
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
      dbConnection.exec(`
        CREATE TABLE IF NOT EXISTS learning_progress_records (
          course_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          block_id TEXT,
          completed INTEGER NOT NULL DEFAULT 0,
          time_spent_seconds INTEGER NOT NULL DEFAULT 0,
          video_position_seconds REAL DEFAULT 0,
          video_duration_seconds REAL DEFAULT 0,
          reading_page INTEGER DEFAULT 1,
          reading_total_pages INTEGER DEFAULT 1,
          last_accessed_at TEXT NOT NULL,
          completed_at TEXT,
          PRIMARY KEY (course_id, lesson_id)
        );
        CREATE INDEX IF NOT EXISTS ix_learning_progress_course ON learning_progress_records(course_id);

        CREATE TABLE IF NOT EXISTS volume_registry (
          uuid TEXT PRIMARY KEY,
          label TEXT,
          last_mount_path TEXT,
          last_seen_at TEXT,
          registered_course_ids TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS encrypted_course_passwords (
          course_id TEXT PRIMARY KEY,
          encrypted_password_base64 TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    }
    return dbConnection;
  } catch (err) {
    console.warn("Database initialization non-fatal warning:", err?.message);
    return null;
  }
}
function saveEncryptedCoursePassword(courseId, encryptedBase64) {
  try {
    if (!dbConnection) return false;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    dbConnection.prepare(`
      INSERT INTO encrypted_course_passwords (course_id, encrypted_password_base64, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(course_id) DO UPDATE SET
        encrypted_password_base64 = excluded.encrypted_password_base64,
        updated_at = excluded.updated_at
    `).run(courseId, encryptedBase64, now);
    return true;
  } catch (err) {
    console.warn("saveEncryptedCoursePassword warning:", err?.message);
    return false;
  }
}
function getEncryptedCoursePassword(courseId) {
  try {
    if (!dbConnection) return null;
    const row = dbConnection.prepare(`
      SELECT encrypted_password_base64 FROM encrypted_course_passwords WHERE course_id = ?
    `).get(courseId);
    return row?.encrypted_password_base64 || null;
  } catch (err) {
    console.warn("getEncryptedCoursePassword warning:", err?.message);
    return null;
  }
}
const execFileAsync = promisify(execFile);
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
async function queryAttachedVolumes() {
  const volumes = [];
  const seenPaths = /* @__PURE__ */ new Set();
  if (process.platform === "linux") {
    try {
      const { stdout } = await execFileAsync("lsblk", ["-J", "-o", "NAME,UUID,LABEL,MOUNTPOINT,FSTYPE,SIZE,MODEL"]);
      const parsed = JSON.parse(stdout);
      const traverse = (devices) => {
        for (const dev of devices) {
          if (dev.mountpoint && dev.mountpoint !== "/" && dev.mountpoint !== "/boot" && dev.mountpoint !== "/boot/efi" && dev.mountpoint !== "[SWAP]") {
            if (dev.fstype !== "squashfs" && !dev.mountpoint.startsWith("/var/lib/snapd")) {
              const uuid = dev.uuid || `vol-${dev.name}`;
              if (!seenPaths.has(dev.mountpoint)) {
                seenPaths.add(dev.mountpoint);
                volumes.push({
                  uuid,
                  label: dev.label || basename(dev.mountpoint) || dev.name,
                  mountPath: dev.mountpoint,
                  device: `/dev/${dev.name}`,
                  fsType: dev.fstype,
                  isRemovable: true
                });
              }
            }
          }
          if (Array.isArray(dev.children)) {
            traverse(dev.children);
          }
        }
      };
      if (Array.isArray(parsed?.blockdevices)) {
        traverse(parsed.blockdevices);
      }
    } catch {
      try {
        const uuidMap = /* @__PURE__ */ new Map();
        const byUuidDir = "/dev/disk/by-uuid";
        if (existsSync(byUuidDir)) {
          const links = await readdir(byUuidDir);
          for (const uuid of links) {
            try {
              const target = await readlink(join(byUuidDir, uuid));
              uuidMap.set(basename(target), uuid);
            } catch {
            }
          }
        }
        if (existsSync("/proc/mounts")) {
          const raw = await readFile("/proc/mounts", "utf-8");
          const lines = raw.split("\n");
          for (const line of lines) {
            const parts = line.split(" ");
            if (parts.length >= 3) {
              const devPath = parts[0];
              const rawMount = parts[1];
              const fsType = parts[2];
              const mountPath = rawMount.replace(/\\040/g, " ");
              if (mountPath.startsWith("/run/media") || mountPath.startsWith("/media") || mountPath.startsWith("/mnt") && mountPath !== "/mnt") {
                const baseDev = basename(devPath);
                const uuid = uuidMap.get(baseDev) || `vol-${baseDev}`;
                if (!seenPaths.has(mountPath)) {
                  seenPaths.add(mountPath);
                  volumes.push({
                    uuid,
                    label: basename(mountPath),
                    mountPath,
                    device: devPath,
                    fsType,
                    isRemovable: true
                  });
                }
              }
            }
          }
        }
      } catch {
      }
    }
  } else if (process.platform === "darwin") {
    try {
      if (existsSync("/Volumes")) {
        const entries = await readdir("/Volumes", { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== "Macintosh HD") {
            const mountPath = join("/Volumes", entry.name);
            if (!seenPaths.has(mountPath)) {
              seenPaths.add(mountPath);
              volumes.push({
                uuid: `mac-${entry.name}`,
                label: entry.name,
                mountPath,
                isRemovable: true
              });
            }
          }
        }
      }
    } catch {
    }
  } else if (process.platform === "win32") {
    for (let code = 68; code <= 90; code++) {
      const drive = `${String.fromCharCode(code)}:\\`;
      try {
        if (existsSync(drive)) {
          if (!seenPaths.has(drive)) {
            seenPaths.add(drive);
            volumes.push({
              uuid: `win-${drive[0]}`,
              label: `Drive (${drive[0]}:)`,
              mountPath: drive,
              isRemovable: true
            });
          }
        }
      } catch {
      }
    }
  }
  if (configuredExternalMountPath && !seenPaths.has(configuredExternalMountPath) && existsSync(configuredExternalMountPath)) {
    volumes.unshift({
      uuid: `custom-${basename(configuredExternalMountPath)}`,
      label: basename(configuredExternalMountPath),
      mountPath: configuredExternalMountPath,
      isRemovable: true
    });
  }
  return volumes;
}
let cachedVolumes = null;
let cachedVolumesTime = 0;
async function getCachedAttachedVolumes(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedVolumes && now - cachedVolumesTime < 2500) {
    return cachedVolumes;
  }
  cachedVolumes = await queryAttachedVolumes();
  cachedVolumesTime = now;
  return cachedVolumes;
}
function findVolumeForPath(candidatePath, volumes) {
  const normalized = resolve(candidatePath);
  for (const vol of volumes) {
    const volMount = resolve(vol.mountPath);
    if (normalized === volMount || normalized.startsWith(volMount + (process.platform === "win32" ? "\\" : "/"))) {
      return vol;
    }
  }
  return null;
}
function isPathOnExternalMediaPattern(candidatePath) {
  const norm = resolve(candidatePath);
  if (process.platform === "linux") {
    return norm.startsWith("/media") || norm.startsWith("/run/media") || norm.startsWith("/mnt") && norm !== "/mnt";
  }
  if (process.platform === "darwin") {
    return norm.startsWith("/Volumes") && !norm.startsWith("/Volumes/Macintosh HD");
  }
  if (process.platform === "win32") {
    const driveLetter = norm.charAt(0).toUpperCase();
    return driveLetter >= "D" && driveLetter <= "Z";
  }
  return false;
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
  ipcMain.handle("shell:openExternalFile", async (_event, targetPath) => {
    try {
      const decoded = decodeURIComponent(targetPath.replace(/^file:\/\//, ""));
      const resolved = validatePathBoundary(decoded);
      await access(resolved, constants.R_OK);
      const err = await shell.openPath(resolved);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Access denied" };
    }
  });
  ipcMain.handle(
    "storage:saveCoursePassword",
    async (_event, params) => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          return { success: false, error: "OS safeStorage encryption unavailable" };
        }
        const encrypted = safeStorage.encryptString(params.password);
        const ok = saveEncryptedCoursePassword(params.courseId, encrypted.toString("base64"));
        return { success: ok };
      } catch (err) {
        return { success: false, error: err?.message || "Failed to save encrypted course password" };
      }
    }
  );
  ipcMain.handle("storage:getCoursePassword", async (_event, courseId) => {
    try {
      const encBase64 = getEncryptedCoursePassword(courseId);
      if (!encBase64 || !safeStorage.isEncryptionAvailable()) {
        return null;
      }
      return safeStorage.decryptString(Buffer.from(encBase64, "base64"));
    } catch {
      return null;
    }
  });
  ipcMain.handle(
    "storage:checkCoursePathAccess",
    async (_event, params) => {
      const { courseId, courseDir, mountPath, relativeCourseDir, volumeUuid, volumeLabel } = params;
      const executeCheck = async () => {
        const volumes = await getCachedAttachedVolumes();
        let activeMountPath = null;
        let matchedVol = null;
        if (volumeUuid) {
          const volByUuid = volumes.find((v) => v.uuid === volumeUuid);
          if (volByUuid) {
            matchedVol = volByUuid;
            activeMountPath = volByUuid.mountPath;
          }
        }
        if (!activeMountPath && volumeLabel) {
          const volByLabel = volumes.find(
            (v) => v.label.toLowerCase() === volumeLabel.toLowerCase()
          );
          if (volByLabel) {
            matchedVol = volByLabel;
            activeMountPath = volByLabel.mountPath;
          }
        }
        if (!activeMountPath && mountPath) {
          const volByMount = findVolumeForPath(mountPath, volumes);
          if (volByMount) {
            matchedVol = volByMount;
            activeMountPath = volByMount.mountPath;
          } else {
            try {
              await access(mountPath, constants.F_OK);
              activeMountPath = mountPath;
            } catch {
            }
          }
        }
        let targetDir = null;
        if (activeMountPath) {
          allowedUserDirs.add(activeMountPath);
          if (relativeCourseDir) {
            targetDir = join(activeMountPath, relativeCourseDir);
          } else if (courseDir && mountPath && courseDir.startsWith(mountPath)) {
            targetDir = courseDir.replace(mountPath, activeMountPath);
          } else if (courseDir) {
            targetDir = courseDir;
          } else {
            targetDir = join(activeMountPath, "CourseNest_courses", courseId);
          }
        } else if (courseDir) {
          targetDir = courseDir;
        }
        const checkPath = targetDir || courseDir || mountPath;
        if (checkPath && isPathOnExternalMediaPattern(checkPath)) {
          const matchingVol = findVolumeForPath(checkPath, volumes);
          if (!matchingVol && !activeMountPath) {
            return {
              isAccessible: false,
              status: "Drive disconnected",
              error: "External storage drive is disconnected"
            };
          }
        }
        if (!targetDir) {
          return {
            isAccessible: false,
            status: "Folder missing",
            error: "Course folder could not be resolved"
          };
        }
        try {
          await access(targetDir, constants.R_OK);
          const st = await stat(targetDir);
          if (!st.isDirectory()) {
            return {
              isAccessible: false,
              status: "Folder missing",
              error: "Path is not a directory"
            };
          }
          allowedUserDirs.add(targetDir);
          allowedUserDirs.add(dirname(targetDir));
          const enclosingVol = matchedVol || findVolumeForPath(targetDir, volumes);
          const relDir = enclosingVol ? relative(enclosingVol.mountPath, targetDir).replace(/\\/g, "/") : relativeCourseDir;
          return {
            isAccessible: true,
            status: "Available",
            resolvedCourseDir: targetDir,
            resolvedMountPath: activeMountPath || enclosingVol?.mountPath || mountPath || void 0,
            resolvedVolumeUuid: enclosingVol?.uuid || volumeUuid,
            resolvedVolumeLabel: enclosingVol?.label || volumeLabel,
            resolvedRelativeCourseDir: relDir || void 0
          };
        } catch (accessErr) {
          const code = accessErr?.code || "";
          if (code === "EACCES" || code === "EPERM") {
            return {
              isAccessible: false,
              status: "Permission denied",
              error: "Permission denied reading course folder"
            };
          }
          if (code === "ENOENT" || code === "ENOTDIR") {
            const vol = findVolumeForPath(targetDir, volumes);
            if (!vol && isPathOnExternalMediaPattern(targetDir)) {
              return {
                isAccessible: false,
                status: "Drive disconnected",
                error: "External drive mount is not present"
              };
            }
            return {
              isAccessible: false,
              status: "Folder missing",
              error: "Course folder not found at path"
            };
          }
          return {
            isAccessible: false,
            status: "Folder missing",
            error: accessErr?.message || "Inaccessible path"
          };
        }
      };
      const timeoutPromise = new Promise((resolve2) => {
        setTimeout(() => {
          resolve2({
            isAccessible: false,
            status: "Read timeout",
            error: "Storage read timed out (>2500ms)"
          });
        }, 2500);
      });
      return Promise.race([executeCheck(), timeoutPromise]);
    }
  );
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
  ipcMain.handle("storage:saveDetailedProgress", async (_event, record) => {
    try {
      saveDetailedProgressDb(record);
      let current = {};
      if (existsSync(PROGRESS_FILE)) {
        try {
          current = JSON.parse(await readFile(PROGRESS_FILE, "utf-8"));
        } catch {
        }
      }
      const cId = record.courseId;
      if (!current[cId]) {
        current[cId] = {
          lastLessonId: record.lessonId,
          lastAccessedAt: record.lastAccessedAt || (/* @__PURE__ */ new Date()).toISOString(),
          lessons: {}
        };
      }
      if (!current[cId].lessons) {
        current[cId].lessons = {};
      }
      current[cId].lastLessonId = record.lessonId;
      current[cId].lastAccessedAt = record.lastAccessedAt || (/* @__PURE__ */ new Date()).toISOString();
      current[cId].lessons[record.lessonId] = {
        ...current[cId].lessons[record.lessonId],
        ...record
      };
      const json = JSON.stringify(current, null, 2);
      await writeFile(PROGRESS_FILE, json, "utf-8");
      try {
        await writeFile(EXTERNAL_PROGRESS, json, "utf-8");
      } catch {
      }
      return { success: true };
    } catch (err) {
      console.warn("storage:saveDetailedProgress warning:", err?.message);
      return { success: false, error: err?.message };
    }
  });
  ipcMain.handle("storage:getDetailedProgress", async (_event, params) => {
    try {
      const sqliteResult = getDetailedProgressDb(params.courseId, params.lessonId);
      if (sqliteResult && (params.lessonId ? sqliteResult.courseId : Object.keys(sqliteResult).length > 0)) {
        return sqliteResult;
      }
      if (existsSync(PROGRESS_FILE)) {
        const current = JSON.parse(await readFile(PROGRESS_FILE, "utf-8"));
        const courseData = current[params.courseId];
        if (courseData) {
          if (params.lessonId) {
            return courseData.lessons?.[params.lessonId] || null;
          }
          return courseData.lessons || courseData;
        }
      }
    } catch {
    }
    return params.lessonId ? null : {};
  });
  ipcMain.handle("storage:listVolumes", async () => {
    return await queryAttachedVolumes();
  });
  ipcMain.handle("storage:reconcileAllVolumes", async () => {
    return await reconcileExternalVolumes();
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
      let volumeUuid = course.volumeUuid;
      let volumeLabel = course.volumeLabel;
      let relativeCourseDir = course.relativeCourseDir;
      if (!isInternal) {
        try {
          const volumes = await queryAttachedVolumes();
          const matchedVol = volumes.find((v) => baseDir.startsWith(v.mountPath));
          if (matchedVol) {
            volumeUuid = matchedVol.uuid;
            volumeLabel = matchedVol.label;
            relativeCourseDir = relative(matchedVol.mountPath, courseDir);
            allowedUserDirs.add(matchedVol.mountPath);
          }
        } catch {
        }
      }
      const manifestPath = join(courseDir, "coursenest-manifest.json");
      const courseWithDir = {
        ...course,
        storageTier: isInternal ? "internal" : "external",
        externalMountPath: isInternal ? void 0 : baseDir,
        externalCourseDir: courseDir,
        relativeCourseDir: isInternal ? void 0 : relativeCourseDir,
        volumeUuid: isInternal ? void 0 : volumeUuid,
        volumeLabel: isInternal ? void 0 : volumeLabel,
        storageStatus: "Available",
        isExternalMissing: false
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
      try {
        const attached = await queryAttachedVolumes();
        for (const vol of attached) {
          const volCandidates = [
            join(vol.mountPath, "CourseNest_courses", courseId, cleanRelative),
            join(vol.mountPath, "coursenest_courses", courseId, cleanRelative),
            join(vol.mountPath, courseId, cleanRelative),
            join(vol.mountPath, cleanRelative)
          ];
          for (const p of volCandidates) {
            try {
              const resolved = validatePathBoundary(p);
              await access(resolved, constants.R_OK);
              const fileBuf = await readFile(resolved);
              return { exists: true, buffer: fileBuf.buffer, path: resolved };
            } catch {
            }
          }
        }
      } catch {
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
  let isSyncRunning = false;
  async function reconcileExternalVolumes() {
    if (isSyncRunning) {
      if (existsSync(VAULT_FILE)) {
        try {
          return JSON.parse(await readFile(VAULT_FILE, "utf-8"));
        } catch {
        }
      }
      return [];
    }
    isSyncRunning = true;
    let courses = [];
    try {
      const volumes = await queryAttachedVolumes();
      const volumeMap = /* @__PURE__ */ new Map();
      for (const v of volumes) {
        volumeMap.set(v.uuid, v);
        allowedUserDirs.add(v.mountPath);
      }
      const registryFile = join(app.getPath("userData"), "volume_registry.json");
      let registry = {};
      if (existsSync(registryFile)) {
        try {
          registry = JSON.parse(await readFile(registryFile, "utf-8"));
        } catch {
        }
      }
      if (Object.keys(registry).length === 0) {
        for (const reg of getVolumeRegistryDb()) {
          registry[reg.uuid] = reg;
        }
      }
      if (existsSync(VAULT_FILE)) {
        try {
          courses = JSON.parse(await readFile(VAULT_FILE, "utf-8"));
          if (!Array.isArray(courses)) courses = [];
        } catch {
        }
      }
      let catalogChanged = false;
      for (const vol of volumes) {
        const prev = registry[vol.uuid];
        const oldMount = prev?.lastMountPath;
        const newMount = vol.mountPath;
        if (oldMount && oldMount !== newMount) {
          console.log(`[Volume Re-map] Volume ${vol.uuid} (${vol.label}) mount changed from "${oldMount}" to "${newMount}"`);
          for (let i = 0; i < courses.length; i++) {
            const c = courses[i];
            if (c.storageTier === "external" && (c.volumeUuid === vol.uuid || c.volumeLabel === vol.label || c.externalMountPath && c.externalMountPath.startsWith(oldMount))) {
              const rel = c.relativeCourseDir || (c.externalCourseDir ? relative(oldMount, c.externalCourseDir) : join("CourseNest_courses", c.id));
              const remappedDir = join(newMount, rel);
              courses[i] = {
                ...c,
                volumeUuid: vol.uuid,
                volumeLabel: vol.label,
                relativeCourseDir: rel,
                externalMountPath: newMount,
                externalCourseDir: remappedDir,
                isExternalMissing: false,
                storageStatus: "Available"
              };
              catalogChanged = true;
            }
          }
        }
        const volRecord = {
          uuid: vol.uuid,
          label: vol.label,
          lastMountPath: newMount,
          lastSeenAt: (/* @__PURE__ */ new Date()).toISOString(),
          registeredCourseIds: prev?.registeredCourseIds || []
        };
        registry[vol.uuid] = volRecord;
        saveVolumeRegistryDb(volRecord);
      }
      for (let i = 0; i < courses.length; i++) {
        const c = courses[i];
        if (c.storageTier === "external") {
          let activeVol;
          if (c.volumeUuid) activeVol = volumeMap.get(c.volumeUuid);
          if (!activeVol && c.volumeLabel) activeVol = volumes.find((v) => v.label === c.volumeLabel);
          if (!activeVol && c.externalMountPath) activeVol = volumes.find((v) => c.externalMountPath.startsWith(v.mountPath));
          let activeMount = activeVol ? activeVol.mountPath : c.externalMountPath && existsSync(c.externalMountPath) ? c.externalMountPath : null;
          let targetDir = null;
          if (activeMount) {
            allowedUserDirs.add(activeMount);
            if (c.relativeCourseDir) {
              targetDir = join(activeMount, c.relativeCourseDir);
            } else if (c.externalCourseDir && c.externalMountPath && c.externalCourseDir.startsWith(c.externalMountPath)) {
              targetDir = c.externalCourseDir.replace(c.externalMountPath, activeMount);
            } else {
              targetDir = c.externalCourseDir || join(activeMount, "CourseNest_courses", c.id);
            }
          } else if (c.externalCourseDir && existsSync(c.externalCourseDir)) {
            targetDir = c.externalCourseDir;
          }
          let newStatus = "Available";
          let isReachable = false;
          if (!activeMount && !targetDir) {
            newStatus = "Drive disconnected";
          } else if (!targetDir) {
            newStatus = "Folder missing";
          } else {
            try {
              allowedUserDirs.add(targetDir);
              allowedUserDirs.add(dirname(targetDir));
              await access(targetDir, constants.R_OK);
              const st = await stat(targetDir);
              if (st.isDirectory()) {
                isReachable = true;
                newStatus = "Available";
              } else {
                newStatus = "Folder missing";
              }
            } catch (err) {
              const code = err?.code || "";
              if (code === "EACCES" || code === "EPERM") {
                newStatus = "Permission denied";
              } else if (code === "ENOENT" || code === "ENOTDIR") {
                newStatus = "Folder missing";
              } else {
                newStatus = "Folder missing";
              }
            }
          }
          if (c.isExternalMissing !== !isReachable || c.storageStatus !== newStatus || targetDir && c.externalCourseDir !== targetDir || activeMount && c.externalMountPath !== activeMount) {
            courses[i] = {
              ...c,
              isExternalMissing: !isReachable,
              storageStatus: newStatus,
              externalCourseDir: targetDir || c.externalCourseDir,
              externalMountPath: activeMount || c.externalMountPath,
              volumeUuid: activeVol?.uuid || c.volumeUuid,
              volumeLabel: activeVol?.label || c.volumeLabel
            };
            catalogChanged = true;
          }
        }
      }
      if (catalogChanged) {
        await writeFile(VAULT_FILE, JSON.stringify(courses, null, 2), "utf-8");
        await writeFile(registryFile, JSON.stringify(registry, null, 2), "utf-8");
      }
      return courses;
    } catch (e) {
      console.warn("reconcileExternalVolumes error:", e?.message);
      return courses;
    } finally {
      isSyncRunning = false;
    }
  }
  ipcMain.handle("storage:scanDirectoryForCourses", async (_event, dirPath) => {
    if (dirPath) {
      return await scanDirectoryRecursive(dirPath);
    }
    return await reconcileExternalVolumes();
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
  let previousVolumeUuids = /* @__PURE__ */ new Set();
  let isVolumeMonitoring = false;
  const monitorVolumeChanges = async () => {
    if (isVolumeMonitoring) return;
    isVolumeMonitoring = true;
    try {
      const currentVolumes = await queryAttachedVolumes();
      const currentUuids = new Set(currentVolumes.map((v) => v.uuid));
      for (const vol of currentVolumes) {
        if (!previousVolumeUuids.has(vol.uuid)) {
          console.log(`[Volume Attached] Volume "${vol.label}" (${vol.uuid}) mounted at ${vol.mountPath}`);
          await reconcileExternalVolumes();
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send("storage:volumeMounted", vol);
              win.webContents.send("storage:mountsChanged", { timestamp: Date.now() });
            }
          });
        }
      }
      for (const prevUuid of previousVolumeUuids) {
        if (!currentUuids.has(prevUuid)) {
          console.log(`[Volume Disconnected] Volume "${prevUuid}" unplugged`);
          await reconcileExternalVolumes();
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send("storage:volumeUnmounted", { uuid: prevUuid });
              win.webContents.send("storage:mountsChanged", { timestamp: Date.now() });
            }
          });
        }
      }
      previousVolumeUuids = currentUuids;
    } catch {
    } finally {
      isVolumeMonitoring = false;
    }
  };
  monitorVolumeChanges();
  const volumeInterval = setInterval(monitorVolumeChanges, 2e3);
  app.on("will-quit", () => clearInterval(volumeInterval));
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
  return "#FAFAFA";
}
function resolveIconPath() {
  const candidates = [
    join(__dirname, "../../build/icon.png"),
    join(app.getAppPath(), "build/icon.png"),
    join(process.resourcesPath, "icon.png"),
    join(process.resourcesPath, "build/icon.png"),
    join(__dirname, "../build/icon.png")
  ];
  return candidates.find((p) => existsSync(p));
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
  const iconFile = resolveIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "CourseNest",
    icon: iconFile,
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
