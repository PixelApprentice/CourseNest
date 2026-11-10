import { ipcMain, dialog, app, Notification, BrowserWindow, shell, safeStorage } from 'electron';
import { join, resolve, dirname, basename, relative } from 'path';
import { readFile, stat, readdir, access, writeFile, mkdir, rm, readlink } from 'fs/promises';
import { constants, existsSync, readFileSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  saveDetailedProgressDb,
  getDetailedProgressDb,
  saveVolumeRegistryDb,
  getVolumeRegistryDb,
  saveEncryptedCoursePassword,
  getEncryptedCoursePassword,
  type DetailedProgressRecord,
  type VolumeRegistryRecord,
} from './database.js';

const execFileAsync = promisify(execFile);

export interface AttachedVolume {
  uuid: string;
  label: string;
  mountPath: string;
  device?: string;
  fsType?: string;
  isRemovable: boolean;
}

let configuredExternalMountPath: string | null = null;
const allowedUserDirs = new Set<string>();

function validatePathBoundary(targetPath: string): string {
  const resolvedPath = resolve(targetPath);
  const dataDir = resolve(app.getPath('userData'));
  const tempDir = resolve(app.getPath('temp'));
  const documentsDir = resolve(app.getPath('documents'));
  const downloadsDir = resolve(app.getPath('downloads'));
  const homeDir = resolve(app.getPath('home'));

  const isAllowedInternal =
    resolvedPath.startsWith(dataDir) ||
    resolvedPath.startsWith(tempDir) ||
    resolvedPath.startsWith(documentsDir) ||
    resolvedPath.startsWith(downloadsDir);
  const isAllowedExternal = configuredExternalMountPath
    ? resolvedPath.startsWith(resolve(configuredExternalMountPath))
    : false;
  const isUserAllowed = Array.from(allowedUserDirs).some((d) => resolvedPath.startsWith(d));
  const isStandardMediaMount =
    resolvedPath.startsWith('/media') ||
    resolvedPath.startsWith('/run/media') ||
    resolvedPath.startsWith('/mnt') ||
    resolvedPath.startsWith('/Volumes') ||
    resolvedPath.startsWith(join(homeDir, 'Downloads')) ||
    resolvedPath.startsWith(join(homeDir, 'Documents')) ||
    /^[a-zA-Z]:\\/.test(resolvedPath);

  if (!isAllowedInternal && !isAllowedExternal && !isUserAllowed && !isStandardMediaMount) {
    throw new Error(`Access denied: path "${targetPath}" is outside authorized storage directories`);
  }
  return resolvedPath;
}

function resolveCourseStorageDir(baseDir: string, courseId: string): string {
  const normBase = resolve(baseDir);
  const baseName = basename(normBase).toLowerCase();
  // If user selected an existing course directory or CourseNest_courses directly, avoid nested coursenest_courses/coursenest_courses
  if (baseName === 'coursenest_courses') {
    return join(normBase, courseId);
  }
  return join(normBase, 'CourseNest_courses', courseId);
}

function getSystemMountRoots(): string[] {
  const rootsToProbe: string[] = [];
  if (process.platform === 'linux') {
    const user = process.env.USER || process.env.LOGNAME || '';
    rootsToProbe.push('/media', '/run/media');
    if (user) {
      rootsToProbe.push(`/media/${user}`, `/run/media/${user}`);
    }
    rootsToProbe.push('/mnt');
  } else if (process.platform === 'darwin') {
    rootsToProbe.push('/Volumes');
  } else if (process.platform === 'win32') {
    for (let code = 68; code <= 90; code++) {
      rootsToProbe.push(`${String.fromCharCode(code)}:\\`);
    }
  }
  return rootsToProbe;
}

export async function queryAttachedVolumes(): Promise<AttachedVolume[]> {
  const volumes: AttachedVolume[] = [];
  const seenPaths = new Set<string>();

  // 1. On Linux: lsblk -J -o NAME,UUID,LABEL,MOUNTPOINT,FSTYPE,SIZE,MODEL
  if (process.platform === 'linux') {
    try {
      const { stdout } = await execFileAsync('lsblk', ['-J', '-o', 'NAME,UUID,LABEL,MOUNTPOINT,FSTYPE,SIZE,MODEL']);
      const parsed = JSON.parse(stdout);

      const traverse = (devices: any[]) => {
        for (const dev of devices) {
          if (
            dev.mountpoint &&
            dev.mountpoint !== '/' &&
            dev.mountpoint !== '/boot' &&
            dev.mountpoint !== '/boot/efi' &&
            dev.mountpoint !== '[SWAP]'
          ) {
            // Ignore system squashfs / snap / loop mounts
            if (dev.fstype !== 'squashfs' && !dev.mountpoint.startsWith('/var/lib/snapd')) {
              const uuid = dev.uuid || `vol-${dev.name}`;
              if (!seenPaths.has(dev.mountpoint)) {
                seenPaths.add(dev.mountpoint);
                volumes.push({
                  uuid,
                  label: dev.label || basename(dev.mountpoint) || dev.name,
                  mountPath: dev.mountpoint,
                  device: `/dev/${dev.name}`,
                  fsType: dev.fstype,
                  isRemovable: true,
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
      // Fallback: parse /proc/mounts and resolve /dev/disk/by-uuid symlinks
      try {
        const uuidMap = new Map<string, string>();
        const byUuidDir = '/dev/disk/by-uuid';
        if (existsSync(byUuidDir)) {
          const links = await readdir(byUuidDir);
          for (const uuid of links) {
            try {
              const target = await readlink(join(byUuidDir, uuid));
              uuidMap.set(basename(target), uuid);
            } catch {}
          }
        }

        if (existsSync('/proc/mounts')) {
          const raw = await readFile('/proc/mounts', 'utf-8');
          const lines = raw.split('\n');
          for (const line of lines) {
            const parts = line.split(' ');
            if (parts.length >= 3) {
              const devPath = parts[0]!;
              const rawMount = parts[1]!;
              const fsType = parts[2]!;
              const mountPath = rawMount.replace(/\\040/g, ' ');

              if (
                mountPath.startsWith('/run/media') ||
                mountPath.startsWith('/media') ||
                (mountPath.startsWith('/mnt') && mountPath !== '/mnt')
              ) {
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
                    isRemovable: true,
                  });
                }
              }
            }
          }
        }
      } catch {}
    }
  } else if (process.platform === 'darwin') {
    // macOS: /Volumes
    try {
      if (existsSync('/Volumes')) {
        const entries = await readdir('/Volumes', { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'Macintosh HD') {
            const mountPath = join('/Volumes', entry.name);
            if (!seenPaths.has(mountPath)) {
              seenPaths.add(mountPath);
              volumes.push({
                uuid: `mac-${entry.name}`,
                label: entry.name,
                mountPath,
                isRemovable: true,
              });
            }
          }
        }
      }
    } catch {}
  } else if (process.platform === 'win32') {
    // Windows: D:\ to Z:\
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
              isRemovable: true,
            });
          }
        }
      } catch {}
    }
  }

  // Also include configuredExternalMountPath if user selected a custom external directory
  if (configuredExternalMountPath && !seenPaths.has(configuredExternalMountPath) && existsSync(configuredExternalMountPath)) {
    volumes.unshift({
      uuid: `custom-${basename(configuredExternalMountPath)}`,
      label: basename(configuredExternalMountPath),
      mountPath: configuredExternalMountPath,
      isRemovable: true,
    });
  }

  return volumes;
}

let cachedVolumes: AttachedVolume[] | null = null;
let cachedVolumesTime = 0;

export async function getCachedAttachedVolumes(forceRefresh = false): Promise<AttachedVolume[]> {
  const now = Date.now();
  if (!forceRefresh && cachedVolumes && now - cachedVolumesTime < 2500) {
    return cachedVolumes;
  }
  cachedVolumes = await queryAttachedVolumes();
  cachedVolumesTime = now;
  return cachedVolumes;
}

export function findVolumeForPath(candidatePath: string, volumes: AttachedVolume[]): AttachedVolume | null {
  const normalized = resolve(candidatePath);
  for (const vol of volumes) {
    const volMount = resolve(vol.mountPath);
    if (normalized === volMount || normalized.startsWith(volMount + (process.platform === 'win32' ? '\\' : '/'))) {
      return vol;
    }
  }
  return null;
}

export function isPathOnExternalMediaPattern(candidatePath: string): boolean {
  const norm = resolve(candidatePath);
  if (process.platform === 'linux') {
    return norm.startsWith('/media') || norm.startsWith('/run/media') || (norm.startsWith('/mnt') && norm !== '/mnt');
  }
  if (process.platform === 'darwin') {
    return norm.startsWith('/Volumes') && !norm.startsWith('/Volumes/Macintosh HD');
  }
  if (process.platform === 'win32') {
    const driveLetter = norm.charAt(0).toUpperCase();
    return driveLetter >= 'D' && driveLetter <= 'Z';
  }
  return false;
}

export function registerIpcHandlers(): void {
  // ── Frameless Window Controls (VS Code Style) ──────────────────────
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    win?.minimize();
    return true;
  });

  ipcMain.handle('window:maximize', (event) => {
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

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    win?.close();
    return true;
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getAllWindows()[0];
    return win?.isMaximized() ?? false;
  });

  // ── File Dialogs ────────────────────────────────────────────────────

  ipcMain.handle(
    'dialog:openFiles',
    async (
      _event,
      options?: {
        filters?: Electron.FileFilter[];
        multiple?: boolean;
      },
    ) => {
      const properties: Electron.OpenDialogOptions['properties'] = ['openFile'];
      if (options?.multiple) {
        properties.push('multiSelections');
      }

      const result = await dialog.showOpenDialog({
        properties,
        filters: options?.filters ?? [
          {
            name: 'Course Materials',
            extensions: ['zip', 'rar', '7z', '7zip', 'tar.gz', 'tgz', 'tar', 'pdf', 'docx', 'pptx', 'mp4', 'webm', 'mkv', 'json'],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        for (const p of result.filePaths) {
          allowedUserDirs.add(dirname(resolve(p)));
        }
      }

      return result.canceled ? [] : result.filePaths;
    },
  );

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!result.canceled && result.filePaths[0]) {
      const selected = resolve(result.filePaths[0]);
      configuredExternalMountPath = selected;
      allowedUserDirs.add(selected);
      return selected;
    }
    return null;
  });

  // ── Filesystem & Removable Storage ──────────────────────────────────

  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    const resolvedPath = validatePathBoundary(filePath);
    const buffer = await readFile(resolvedPath);
    return buffer.buffer;
  });

  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    const resolvedPath = validatePathBoundary(filePath);
    const stats = await stat(resolvedPath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime.toISOString(),
    };
  });

  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    const resolvedPath = validatePathBoundary(dirPath);
    const entries = await readdir(resolvedPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    }));
  });

  // Check whether an external USB or SD directory is currently mounted and accessible
  ipcMain.handle('storage:checkVolumeAccess', async (_event, volumePath: string) => {
    try {
      await access(volumePath, constants.R_OK);
      return { isMounted: true, path: volumePath };
    } catch {
      return { isMounted: false, path: volumePath, error: 'Volume inaccessible or disconnected' };
    }
  });

  // Safe shell open handler with strict boundary validation (Fixes Review Item 8)
  ipcMain.handle('shell:openExternalFile', async (_event, targetPath: string) => {
    try {
      const decoded = decodeURIComponent(targetPath.replace(/^file:\/\//, ''));
      const resolved = validatePathBoundary(decoded);
      await access(resolved, constants.R_OK);
      const err = await shell.openPath(resolved);
      if (err) {
        return { success: false, error: err };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Access denied' };
    }
  });

  // SafeStorage OS-Level Encrypted Course Password Handlers (Fixes Issue A)
  ipcMain.handle(
    'storage:saveCoursePassword',
    async (_event, params: { courseId: string; password: string }) => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          return { success: false, error: 'OS safeStorage encryption unavailable' };
        }
        const encrypted = safeStorage.encryptString(params.password);
        const ok = saveEncryptedCoursePassword(params.courseId, encrypted.toString('base64'));
        return { success: ok };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to save encrypted course password' };
      }
    },
  );

  ipcMain.handle('storage:getCoursePassword', async (_event, courseId: string) => {
    try {
      const encBase64 = getEncryptedCoursePassword(courseId);
      if (!encBase64 || !safeStorage.isEncryptionAvailable()) {
        return null;
      }
      return safeStorage.decryptString(Buffer.from(encBase64, 'base64'));
    } catch {
      return null;
    }
  });

  // Targeted individual course path & drive accessibility verification (Fixes Items 10, 12, 13, 14)
  ipcMain.handle(
    'storage:checkCoursePathAccess',
    async (
      _event,
      params: {
        courseId: string;
        courseDir?: string;
        mountPath?: string;
        relativeCourseDir?: string;
        volumeUuid?: string;
        volumeLabel?: string;
      },
    ) => {
      const { courseId, courseDir, mountPath, relativeCourseDir, volumeUuid, volumeLabel } = params;

      // Entire handler logic wrapped in timeout to prevent hangs on sleeping/frozen drives (Fixes Item 10)
      const executeCheck = async (): Promise<{
        isAccessible: boolean;
        status: 'Available' | 'Drive disconnected' | 'Folder missing' | 'Permission denied' | 'Read timeout';
        resolvedCourseDir?: string;
        resolvedMountPath?: string;
        resolvedVolumeUuid?: string;
        resolvedVolumeLabel?: string;
        resolvedRelativeCourseDir?: string;
        error?: string;
      }> => {
        // Use cached volume list across simultaneous checks (Fixes Item 12)
        const volumes = await getCachedAttachedVolumes();
        let activeMountPath: string | null = null;
        let matchedVol: AttachedVolume | null = null;

        // 1. Identify matching mounted volume by UUID, label, or mount path
        if (volumeUuid) {
          const volByUuid = volumes.find((v) => v.uuid === volumeUuid);
          if (volByUuid) {
            matchedVol = volByUuid;
            activeMountPath = volByUuid.mountPath;
          }
        }
        if (!activeMountPath && volumeLabel) {
          const volByLabel = volumes.find(
            (v) => v.label.toLowerCase() === volumeLabel.toLowerCase(),
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
            } catch {}
          }
        }

        // 2. Resolve target course directory path
        let targetDir: string | null = null;
        if (activeMountPath) {
          allowedUserDirs.add(activeMountPath);
          if (relativeCourseDir) {
            targetDir = join(activeMountPath, relativeCourseDir);
          } else if (courseDir && mountPath && courseDir.startsWith(mountPath)) {
            targetDir = courseDir.replace(mountPath, activeMountPath);
          } else if (courseDir) {
            targetDir = courseDir;
          } else {
            targetDir = join(activeMountPath, 'CourseNest_courses', courseId);
          }
        } else if (courseDir) {
          targetDir = courseDir;
        }

        // 3. Robust Drive Disconnected check (Fixes Item 13)
        // Check if path belongs to external media pattern (/run/media, /media, /Volumes, D:\ etc.)
        const checkPath = targetDir || courseDir || mountPath;
        if (checkPath && isPathOnExternalMediaPattern(checkPath)) {
          const matchingVol = findVolumeForPath(checkPath, volumes);
          if (!matchingVol && !activeMountPath) {
            return {
              isAccessible: false,
              status: 'Drive disconnected',
              error: 'External storage drive is disconnected',
            };
          }
        }

        if (!targetDir) {
          return {
            isAccessible: false,
            status: 'Folder missing',
            error: 'Course folder could not be resolved',
          };
        }

        // 4. Test directory access
        try {
          await access(targetDir, constants.R_OK);
          const st = await stat(targetDir);
          if (!st.isDirectory()) {
            return {
              isAccessible: false,
              status: 'Folder missing',
              error: 'Path is not a directory',
            };
          }

          allowedUserDirs.add(targetDir);
          allowedUserDirs.add(dirname(targetDir));

          // 5. Populate volume metadata for older courses (Fixes Item 14)
          const enclosingVol = matchedVol || findVolumeForPath(targetDir, volumes);
          const relDir = enclosingVol
            ? relative(enclosingVol.mountPath, targetDir).replace(/\\/g, '/')
            : relativeCourseDir;

          return {
            isAccessible: true,
            status: 'Available',
            resolvedCourseDir: targetDir,
            resolvedMountPath: activeMountPath || enclosingVol?.mountPath || mountPath || undefined,
            resolvedVolumeUuid: enclosingVol?.uuid || volumeUuid,
            resolvedVolumeLabel: enclosingVol?.label || volumeLabel,
            resolvedRelativeCourseDir: relDir || undefined,
          };
        } catch (accessErr: any) {
          const code = accessErr?.code || '';
          if (code === 'EACCES' || code === 'EPERM') {
            return {
              isAccessible: false,
              status: 'Permission denied',
              error: 'Permission denied reading course folder',
            };
          }
          if (code === 'ENOENT' || code === 'ENOTDIR') {
            // If the drive mount itself is missing, classify as Drive disconnected
            const vol = findVolumeForPath(targetDir, volumes);
            if (!vol && isPathOnExternalMediaPattern(targetDir)) {
              return {
                isAccessible: false,
                status: 'Drive disconnected',
                error: 'External drive mount is not present',
              };
            }
            return {
              isAccessible: false,
              status: 'Folder missing',
              error: 'Course folder not found at path',
            };
          }
          return {
            isAccessible: false,
            status: 'Folder missing',
            error: accessErr?.message || 'Inaccessible path',
          };
        }
      };

      const timeoutPromise = new Promise<{
        isAccessible: boolean;
        status: 'Read timeout';
        error: string;
      }>((resolve) => {
        setTimeout(() => {
          resolve({
            isAccessible: false,
            status: 'Read timeout',
            error: 'Storage read timed out (>2500ms)',
          });
        }, 2500);
      });

      return Promise.race([executeCheck(), timeoutPromise]);
    },
  );

  ipcMain.handle('storage:setExternalMountPath', (_event, mountPath: string) => {
    configuredExternalMountPath = resolve(mountPath);
    allowedUserDirs.add(configuredExternalMountPath);
    return { success: true, mountPath: configuredExternalMountPath };
  });

  // ── Persistent Vault Master Catalog (Cross-Restart Guard) ───────────
  const VAULT_FILE = join(app.getPath('userData'), 'coursenest_vault_courses.json');
  const PROGRESS_FILE = join(app.getPath('userData'), 'coursenest_progress.json');
  const FLASHCARDS_FILE = join(app.getPath('userData'), 'coursenest_flashcards.json');
  const HOME_DIR = app.getPath('home');
  const EXTERNAL_PROGRESS = join(HOME_DIR, '.coursenest-progress.json');
  const EXTERNAL_FLASHCARDS = join(HOME_DIR, '.coursenest-flashcards.json');

  ipcMain.handle('storage:saveProgress', async (_event, params: { courseId: string; progress: any }) => {
    try {
      let current: Record<string, any> = {};
      if (existsSync(PROGRESS_FILE)) {
        try {
          current = JSON.parse(await readFile(PROGRESS_FILE, 'utf-8'));
        } catch {}
      }
      current[params.courseId] = {
        ...params.progress,
        lastActive: new Date().toISOString(),
      };
      const json = JSON.stringify(current, null, 2);
      await writeFile(PROGRESS_FILE, json, 'utf-8');
      try {
        await writeFile(EXTERNAL_PROGRESS, json, 'utf-8');
      } catch {}
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('storage:getProgress', async (_event, courseId?: string) => {
    try {
      if (existsSync(PROGRESS_FILE)) {
        const data = JSON.parse(await readFile(PROGRESS_FILE, 'utf-8'));
        return courseId ? data[courseId] || null : data;
      }
    } catch {}
    return courseId ? null : {};
  });

  ipcMain.handle('storage:saveDetailedProgress', async (_event, record: DetailedProgressRecord) => {
    try {
      // 1. Write to local SQLite database
      saveDetailedProgressDb(record);

      // 2. Mirror to persistent JSON file backup
      let current: Record<string, any> = {};
      if (existsSync(PROGRESS_FILE)) {
        try {
          current = JSON.parse(await readFile(PROGRESS_FILE, 'utf-8'));
        } catch {}
      }

      const cId = record.courseId;
      if (!current[cId]) {
        current[cId] = {
          lastLessonId: record.lessonId,
          lastAccessedAt: record.lastAccessedAt || new Date().toISOString(),
          lessons: {},
        };
      }
      if (!current[cId].lessons) {
        current[cId].lessons = {};
      }

      current[cId].lastLessonId = record.lessonId;
      current[cId].lastAccessedAt = record.lastAccessedAt || new Date().toISOString();
      current[cId].lessons[record.lessonId] = {
        ...current[cId].lessons[record.lessonId],
        ...record,
      };

      const json = JSON.stringify(current, null, 2);
      await writeFile(PROGRESS_FILE, json, 'utf-8');
      try {
        await writeFile(EXTERNAL_PROGRESS, json, 'utf-8');
      } catch {}

      return { success: true };
    } catch (err: any) {
      console.warn('storage:saveDetailedProgress warning:', err?.message);
      return { success: false, error: err?.message };
    }
  });

  ipcMain.handle('storage:getDetailedProgress', async (_event, params: { courseId: string; lessonId?: string }) => {
    try {
      // 1. Check local SQLite
      const sqliteResult = getDetailedProgressDb(params.courseId, params.lessonId);
      if (sqliteResult && (params.lessonId ? (sqliteResult as any).courseId : Object.keys(sqliteResult).length > 0)) {
        return sqliteResult;
      }

      // 2. Check JSON file backup
      if (existsSync(PROGRESS_FILE)) {
        const current = JSON.parse(await readFile(PROGRESS_FILE, 'utf-8'));
        const courseData = current[params.courseId];
        if (courseData) {
          if (params.lessonId) {
            return courseData.lessons?.[params.lessonId] || null;
          }
          return courseData.lessons || courseData;
        }
      }
    } catch {}
    return params.lessonId ? null : {};
  });

  ipcMain.handle('storage:listVolumes', async () => {
    return await queryAttachedVolumes();
  });

  ipcMain.handle('storage:reconcileAllVolumes', async () => {
    return await reconcileExternalVolumes();
  });

  ipcMain.handle('storage:saveFlashcard', async (_event, card: any) => {
    try {
      let cards: any[] = [];
      if (existsSync(FLASHCARDS_FILE)) {
        try {
          cards = JSON.parse(await readFile(FLASHCARDS_FILE, 'utf-8'));
        } catch {}
      }
      cards.unshift(card);
      const json = JSON.stringify(cards, null, 2);
      await writeFile(FLASHCARDS_FILE, json, 'utf-8');
      try {
        await writeFile(EXTERNAL_FLASHCARDS, json, 'utf-8');
      } catch {}
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('storage:getFlashcards', async (_event, courseId?: string) => {
    try {
      if (existsSync(FLASHCARDS_FILE)) {
        const cards = JSON.parse(await readFile(FLASHCARDS_FILE, 'utf-8'));
        if (Array.isArray(cards)) {
          return courseId ? cards.filter((c: any) => c.courseId === courseId) : cards;
        }
      }
    } catch {}
    return [];
  });

  ipcMain.handle('storage:getPersistentCourses', async () => {
    try {
      if (existsSync(VAULT_FILE)) {
        const raw = await readFile(VAULT_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e: any) {
      console.warn('Could not read persistent vault courses:', e?.message);
    }
    return [];
  });

  ipcMain.handle('storage:savePersistentCourses', async (_event, courses: any[]) => {
    try {
      await writeFile(VAULT_FILE, JSON.stringify(courses, null, 2), 'utf-8');
      return true;
    } catch (e: any) {
      console.warn('Could not save persistent vault courses:', e?.message);
      return false;
    }
  });

  // ── SSD & Removable Drive Course Writing & Ingestion ─────────────────
  ipcMain.handle('storage:saveCourseToDisk', async (_event, params: { course: any; targetDir?: string }) => {
    try {
      const { course, targetDir } = params;
      const isInternal = course?.storageTier === 'internal' || (!targetDir && !configuredExternalMountPath);
      const baseDir = isInternal
        ? join(app.getPath('userData'), 'courses')
        : validatePathBoundary(targetDir || configuredExternalMountPath || join(app.getPath('userData'), 'courses'));

      const courseDir = resolveCourseStorageDir(baseDir, course.id);
      await mkdir(courseDir, { recursive: true });

      let volumeUuid: string | undefined = course.volumeUuid;
      let volumeLabel: string | undefined = course.volumeLabel;
      let relativeCourseDir: string | undefined = course.relativeCourseDir;

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
        } catch {}
      }

      const manifestPath = join(courseDir, 'coursenest-manifest.json');
      const courseWithDir = {
        ...course,
        storageTier: isInternal ? 'internal' : 'external',
        externalMountPath: isInternal ? undefined : baseDir,
        externalCourseDir: courseDir,
        relativeCourseDir: isInternal ? undefined : relativeCourseDir,
        volumeUuid: isInternal ? undefined : volumeUuid,
        volumeLabel: isInternal ? undefined : volumeLabel,
        storageStatus: 'Available',
        isExternalMissing: false,
      };

      await writeFile(manifestPath, JSON.stringify(courseWithDir, null, 2), 'utf-8');

      // Update persistent vault catalog
      let existing: any[] = [];
      try {
        if (existsSync(VAULT_FILE)) {
          existing = JSON.parse(await readFile(VAULT_FILE, 'utf-8'));
          if (!Array.isArray(existing)) existing = [];
        }
      } catch {}

      const filtered = existing.filter((c: any) => c.id !== course.id);
      filtered.unshift(courseWithDir);
      await writeFile(VAULT_FILE, JSON.stringify(filtered, null, 2), 'utf-8');

      return { success: true, courseDir, manifestPath };
    } catch (err: any) {
      console.error('Failed to save course to disk:', err);
      throw err;
    }
  });

  ipcMain.handle(
    'storage:writeMediaFile',
    async (_event, params: { courseId: string; filePath: string; buffer: ArrayBuffer; targetDir?: string; storageTier?: 'internal' | 'external' }) => {
      const { courseId, filePath, buffer, targetDir, storageTier } = params;
      // Internal tier writes directly to physical SSD (app.getPath('userData')/courses)
      // External tier writes to targetDir or configuredExternalMountPath
      const isInternal = storageTier === 'internal' || (!targetDir && !configuredExternalMountPath);
      const baseDir = isInternal
        ? join(app.getPath('userData'), 'courses')
        : validatePathBoundary(targetDir || configuredExternalMountPath || join(app.getPath('userData'), 'courses'));

      const courseDir = resolveCourseStorageDir(baseDir, courseId);
      const cleanRelative = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullPath = validatePathBoundary(join(courseDir, cleanRelative));

      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, Buffer.from(buffer));
      return { success: true, fullPath, courseDir };
    },
  );

  ipcMain.handle(
    'storage:readMediaFile',
    async (_event, params: { courseId: string; filePath: string; targetDir?: string }) => {
      const { courseId, filePath, targetDir } = params;
      const cleanRelative = filePath.replace(/\\/g, '/').replace(/^\/+/, '');

      // Prioritized directory candidates: targetDir, configured mount, SSD, and auto-detected external drives
      const candidateDirs = new Set<string>();
      if (targetDir) candidateDirs.add(resolve(targetDir));
      if (configuredExternalMountPath) candidateDirs.add(resolve(configuredExternalMountPath));
      candidateDirs.add(join(app.getPath('userData'), 'courses'));

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
        } catch {}
      }

      for (const baseDir of candidateDirs) {
        const candidatePaths = [
          join(resolveCourseStorageDir(baseDir, courseId), cleanRelative),
          join(baseDir, 'coursenest_courses', courseId, cleanRelative),
          join(baseDir, 'CourseNest_courses', courseId, cleanRelative),
          join(baseDir, courseId, cleanRelative),
        ];

        for (const p of candidatePaths) {
          try {
            const resolved = validatePathBoundary(p);
            await access(resolved, constants.R_OK);
            const fileBuf = await readFile(resolved);
            return { exists: true, buffer: fileBuf.buffer, path: resolved };
          } catch {}
        }
      }

      // Check all currently attached external volumes directly (resilient to mount-point changes)
      try {
        const attached = await queryAttachedVolumes();
        for (const vol of attached) {
          const volCandidates = [
            join(vol.mountPath, 'CourseNest_courses', courseId, cleanRelative),
            join(vol.mountPath, 'coursenest_courses', courseId, cleanRelative),
            join(vol.mountPath, courseId, cleanRelative),
            join(vol.mountPath, cleanRelative),
          ];
          for (const p of volCandidates) {
            try {
              const resolved = validatePathBoundary(p);
              await access(resolved, constants.R_OK);
              const fileBuf = await readFile(resolved);
              return { exists: true, buffer: fileBuf.buffer, path: resolved };
            } catch {}
          }
        }
      } catch {}

      return { exists: false, error: 'Media file not found on disk' };
    },
  );

  // Permanently delete a course directory and remove from persistent catalog
  ipcMain.handle(
    'storage:deleteCourseFromDisk',
    async (_event, params: { courseId: string; courseDir?: string; mountPath?: string }) => {
      const { courseId, courseDir, mountPath } = params;
      try {
        if (existsSync(VAULT_FILE)) {
          try {
            const raw = await readFile(VAULT_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const remaining = parsed.filter((c: any) => c.id !== courseId);
              await writeFile(VAULT_FILE, JSON.stringify(remaining, null, 2), 'utf-8');
            }
          } catch {}
        }

        const candidateDirs = new Set<string>();
        if (courseDir) candidateDirs.add(courseDir);

        const baseDir = mountPath || configuredExternalMountPath;
        if (baseDir) {
          candidateDirs.add(resolveCourseStorageDir(baseDir, courseId));
          candidateDirs.add(join(baseDir, 'coursenest_courses', courseId));
          candidateDirs.add(join(baseDir, 'CourseNest_courses', courseId));
          candidateDirs.add(join(baseDir, courseId));
        }

        for (const dir of candidateDirs) {
          try {
            const resolved = validatePathBoundary(dir);
            if (existsSync(resolved)) {
              await rm(resolved, { recursive: true, force: true });
            }
          } catch (e: any) {
            console.warn(`Could not remove course dir ${dir}:`, e?.message);
          }
        }

        return { success: true };
      } catch (err: any) {
        console.error(`Failed to delete course from disk (${courseId}):`, err);
        return { success: false, error: err.message };
      }
    },
  );

  // ── Auto-Discovery & Scanning Directory for Courses ──────────────────
  async function scanDirectoryRecursive(baseDir: string): Promise<any[]> {
    const discovered: any[] = [];
    try {
      const resolved = validatePathBoundary(baseDir);
      await access(resolved, constants.R_OK);

      const dirsToCheck = new Set<string>();
      dirsToCheck.add(resolved);

      // Check direct children of resolved
      try {
        const directEntries = await readdir(resolved, { withFileTypes: true });
        for (const entry of directEntries) {
          if (entry.isDirectory()) {
            const childDir = join(resolved, entry.name);
            dirsToCheck.add(childDir);

            // If entry is a course container folder (CourseNest_courses / coursenest_courses), scan its children too
            if (entry.name.toLowerCase() === 'coursenest_courses') {
              try {
                const subEntries = await readdir(childDir, { withFileTypes: true });
                for (const sub of subEntries) {
                  if (sub.isDirectory()) {
                    dirsToCheck.add(join(childDir, sub.name));
                  }
                }
              } catch {}
            }
          }
        }
      } catch {}

      for (const d of dirsToCheck) {
        const candidateFiles = [
          join(d, 'coursenest-manifest.json'),
          join(d, 'course.json'),
          join(d, 'manifest.json'),
        ];
        for (const candidate of candidateFiles) {
          if (existsSync(candidate)) {
            try {
              const raw = await readFile(candidate, 'utf-8');
              const data = JSON.parse(raw);
              if (data && (data.id || data.title) && Array.isArray(data.sections)) {
                discovered.push({
                  ...data,
                  storageTier: 'external',
                  externalMountPath: resolved,
                  externalCourseDir: d,
                  isExternalMissing: false,
                });
                break;
              }
            } catch (err) {
              console.warn(`Could not parse course manifest at ${candidate}:`, err);
            }
          }
        }
      }
    } catch {}
    return discovered;
  }

  let isSyncRunning = false;
  async function reconcileExternalVolumes(): Promise<any[]> {
    if (isSyncRunning) {
      if (existsSync(VAULT_FILE)) {
        try {
          return JSON.parse(await readFile(VAULT_FILE, 'utf-8'));
        } catch {}
      }
      return [];
    }
    isSyncRunning = true;

    let courses: any[] = [];
    try {
      const volumes = await queryAttachedVolumes();
      const volumeMap = new Map<string, AttachedVolume>();
      for (const v of volumes) {
        volumeMap.set(v.uuid, v);
        allowedUserDirs.add(v.mountPath);
      }

      const registryFile = join(app.getPath('userData'), 'volume_registry.json');
      let registry: Record<string, VolumeRegistryRecord> = {};
      if (existsSync(registryFile)) {
        try {
          registry = JSON.parse(await readFile(registryFile, 'utf-8'));
        } catch {}
      }
      if (Object.keys(registry).length === 0) {
        for (const reg of getVolumeRegistryDb()) {
          registry[reg.uuid] = reg;
        }
      }

      if (existsSync(VAULT_FILE)) {
        try {
          courses = JSON.parse(await readFile(VAULT_FILE, 'utf-8'));
          if (!Array.isArray(courses)) courses = [];
        } catch {}
      }

      let catalogChanged = false;

      // 1. Detect mount point changes for known volumes and re-map course paths
      for (const vol of volumes) {
        const prev = registry[vol.uuid];
        const oldMount = prev?.lastMountPath;
        const newMount = vol.mountPath;

        if (oldMount && oldMount !== newMount) {
          console.log(`[Volume Re-map] Volume ${vol.uuid} (${vol.label}) mount changed from "${oldMount}" to "${newMount}"`);
          for (let i = 0; i < courses.length; i++) {
            const c = courses[i];
            if (c.storageTier === 'external' && (c.volumeUuid === vol.uuid || c.volumeLabel === vol.label || (c.externalMountPath && c.externalMountPath.startsWith(oldMount)))) {
              const rel = c.relativeCourseDir || (c.externalCourseDir ? relative(oldMount, c.externalCourseDir) : join('CourseNest_courses', c.id));
              const remappedDir = join(newMount, rel);
              courses[i] = {
                ...c,
                volumeUuid: vol.uuid,
                volumeLabel: vol.label,
                relativeCourseDir: rel,
                externalMountPath: newMount,
                externalCourseDir: remappedDir,
                isExternalMissing: false,
                storageStatus: 'Available',
              };
              catalogChanged = true;
            }
          }
        }

        const volRecord: VolumeRegistryRecord = {
          uuid: vol.uuid,
          label: vol.label,
          lastMountPath: newMount,
          lastSeenAt: new Date().toISOString(),
          registeredCourseIds: prev?.registeredCourseIds || [],
        };
        registry[vol.uuid] = volRecord;
        saveVolumeRegistryDb(volRecord);
      }

      // 2. Targeted per-course verification: check only each course's own path
      for (let i = 0; i < courses.length; i++) {
        const c = courses[i];
        if (c.storageTier === 'external') {
          // Identify matching mounted volume
          let activeVol: AttachedVolume | undefined;
          if (c.volumeUuid) activeVol = volumeMap.get(c.volumeUuid);
          if (!activeVol && c.volumeLabel) activeVol = volumes.find((v) => v.label === c.volumeLabel);
          if (!activeVol && c.externalMountPath) activeVol = volumes.find((v) => c.externalMountPath!.startsWith(v.mountPath));

          let activeMount = activeVol ? activeVol.mountPath : (c.externalMountPath && existsSync(c.externalMountPath) ? c.externalMountPath : null);
          let targetDir: string | null = null;

          if (activeMount) {
            allowedUserDirs.add(activeMount);
            if (c.relativeCourseDir) {
              targetDir = join(activeMount, c.relativeCourseDir);
            } else if (c.externalCourseDir && c.externalMountPath && c.externalCourseDir.startsWith(c.externalMountPath)) {
              targetDir = c.externalCourseDir.replace(c.externalMountPath, activeMount);
            } else {
              targetDir = c.externalCourseDir || join(activeMount, 'CourseNest_courses', c.id);
            }
          } else if (c.externalCourseDir && existsSync(c.externalCourseDir)) {
            targetDir = c.externalCourseDir;
          }

          let newStatus: 'Available' | 'Drive disconnected' | 'Folder missing' | 'Permission denied' | 'Read timeout' = 'Available';
          let isReachable = false;

          if (!activeMount && !targetDir) {
            newStatus = 'Drive disconnected';
          } else if (!targetDir) {
            newStatus = 'Folder missing';
          } else {
            try {
              allowedUserDirs.add(targetDir);
              allowedUserDirs.add(dirname(targetDir));
              await access(targetDir, constants.R_OK);
              const st = await stat(targetDir);
              if (st.isDirectory()) {
                isReachable = true;
                newStatus = 'Available';
              } else {
                newStatus = 'Folder missing';
              }
            } catch (err: any) {
              const code = err?.code || '';
              if (code === 'EACCES' || code === 'EPERM') {
                newStatus = 'Permission denied';
              } else if (code === 'ENOENT' || code === 'ENOTDIR') {
                newStatus = 'Folder missing';
              } else {
                newStatus = 'Folder missing';
              }
            }
          }

          if (
            c.isExternalMissing !== !isReachable ||
            c.storageStatus !== newStatus ||
            (targetDir && c.externalCourseDir !== targetDir) ||
            (activeMount && c.externalMountPath !== activeMount)
          ) {
            courses[i] = {
              ...c,
              isExternalMissing: !isReachable,
              storageStatus: newStatus,
              externalCourseDir: targetDir || c.externalCourseDir,
              externalMountPath: activeMount || c.externalMountPath,
              volumeUuid: activeVol?.uuid || c.volumeUuid,
              volumeLabel: activeVol?.label || c.volumeLabel,
            };
            catalogChanged = true;
          }
        }
      }

      if (catalogChanged) {
        await writeFile(VAULT_FILE, JSON.stringify(courses, null, 2), 'utf-8');
        await writeFile(registryFile, JSON.stringify(registry, null, 2), 'utf-8');
      }

      return courses;
    } catch (e: any) {
      console.warn('reconcileExternalVolumes error:', e?.message);
      return courses;
    } finally {
      isSyncRunning = false;
    }
  }

  ipcMain.handle('storage:scanDirectoryForCourses', async (_event, dirPath?: string) => {
    if (dirPath) {
      return await scanDirectoryRecursive(dirPath);
    }
    return await reconcileExternalVolumes();
  });

  // Auto-locate a course directory across all currently mounted external volumes
  ipcMain.handle('storage:autoLocateCourseDir', async (_event, params: { courseId: string; courseDir?: string }) => {
    const { courseId, courseDir } = params;
    if (!courseId) return { exists: false };

    // 1. Check known courseDir if provided
    if (courseDir && existsSync(courseDir)) {
      try {
        await access(courseDir, constants.R_OK);
        return { exists: true, courseDir, mountPath: dirname(courseDir) };
      } catch {}
    }

    // 2. Check configured external mount path
    if (configuredExternalMountPath && existsSync(configuredExternalMountPath)) {
      const candidates = [
        join(configuredExternalMountPath, courseId),
        join(configuredExternalMountPath, 'CourseNest_courses', courseId),
        join(configuredExternalMountPath, 'coursenest_courses', courseId),
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          try {
            await access(cand, constants.R_OK);
            return { exists: true, courseDir: cand, mountPath: configuredExternalMountPath };
          } catch {}
        }
      }
    }

    // 3. Scan all system mount points on Linux/macOS/Windows
    const rootsToProbe: string[] = [];
    if (process.platform === 'linux') {
      const user = process.env.USER || process.env.LOGNAME || '';
      rootsToProbe.push('/run/media', '/media');
      if (user) {
        rootsToProbe.push(`/run/media/${user}`, `/media/${user}`);
      }
      rootsToProbe.push('/mnt');
    } else if (process.platform === 'darwin') {
      rootsToProbe.push('/Volumes');
    } else if (process.platform === 'win32') {
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
            join(mount, 'CourseNest_courses', courseId),
            join(mount, 'coursenest_courses', courseId),
          ];
          for (const cand of candidates) {
            if (existsSync(cand)) {
              try {
                await access(cand, constants.R_OK);
                return { exists: true, courseDir: cand, mountPath: mount };
              } catch {}
            }
          }
        }
      } catch {}
    }

    return { exists: false };
  });

  ipcMain.handle('storage:listExternalMounts', async () => {
    const mounts: Array<{
      path: string;
      label: string;
      isMounted: boolean;
      hasCourses: boolean;
      courseCount: number;
    }> = [];

    const rootsToProbe: string[] = [];
    if (process.platform === 'linux') {
      const user = process.env.USER || process.env.LOGNAME || '';
      rootsToProbe.push('/media', '/run/media');
      if (user) {
        rootsToProbe.push(`/media/${user}`, `/run/media/${user}`);
      }
      rootsToProbe.push('/mnt');
    } else if (process.platform === 'darwin') {
      rootsToProbe.push('/Volumes');
    } else if (process.platform === 'win32') {
      for (let code = 68; code <= 90; code++) {
        rootsToProbe.push(`${String.fromCharCode(code)}:\\`);
      }
    }

    const checkedPaths = new Set<string>();

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
                join(mountPath, 'CourseNest_courses'),
                join(mountPath, 'coursenest_courses'),
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
                courseCount,
              });
            } catch {}
          }
        }
      } catch {}
    }

    if (configuredExternalMountPath && !mounts.some((m) => m.path === configuredExternalMountPath)) {
      try {
        await access(configuredExternalMountPath, constants.R_OK);
        const coursesFolderCandidates = [
          join(configuredExternalMountPath, 'CourseNest_courses'),
          join(configuredExternalMountPath, 'coursenest_courses'),
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
          label: configuredExternalMountPath.split(/[/\\]/).pop() || 'Configured External Mount',
          isMounted: true,
          hasCourses,
          courseCount,
        });
      } catch {}
    }

    return mounts;
  });

  // ── App Info ────────────────────────────────────────────────────────

  ipcMain.handle('app:getPath', (_event, name: 'userData' | 'temp' | 'documents' | 'downloads') => {
    return app.getPath(name);
  });

  ipcMain.handle('app:getDataDir', () => {
    return join(app.getPath('userData'), 'data');
  });

  ipcMain.handle('app:getResourcesDir', () => {
    return join(app.getPath('userData'), 'data', 'resources');
  });

  ipcMain.handle('app:getPlatformInfo', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    dataDir: join(app.getPath('userData'), 'data'),
    externalMountPath: configuredExternalMountPath,
  }));

  // ── Notifications ───────────────────────────────────────────────────

  ipcMain.handle('app:showNotification', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // ── Theme Preference Persistence Across Desktop Restarts ────────────
  ipcMain.handle('theme:getTheme', () => {
    try {
      const configPath = join(app.getPath('userData'), 'theme_preference.json');
      if (existsSync(configPath)) {
        const raw = readFileSync(configPath, 'utf-8');
        const data = JSON.parse(raw);
        return data.themeId || null;
      }
    } catch (e) {
      console.warn('Failed to read theme preference file:', e);
    }
    return null;
  });

  ipcMain.handle('theme:setTheme', async (_event, themeId: string) => {
    try {
      const configPath = join(app.getPath('userData'), 'theme_preference.json');
      await writeFile(configPath, JSON.stringify({ themeId, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.warn('Failed to write theme preference file:', e);
      return false;
    }
  });

  // ── Active Native Storage & Volume Watcher (Linux / macOS / Windows) ─
  let previousVolumeUuids = new Set<string>();
  let isVolumeMonitoring = false;

  const monitorVolumeChanges = async () => {
    if (isVolumeMonitoring) return;
    isVolumeMonitoring = true;
    try {
      const currentVolumes = await queryAttachedVolumes();
      const currentUuids = new Set(currentVolumes.map((v) => v.uuid));

      // 1. Detect newly mounted volumes
      for (const vol of currentVolumes) {
        if (!previousVolumeUuids.has(vol.uuid)) {
          console.log(`[Volume Attached] Volume "${vol.label}" (${vol.uuid}) mounted at ${vol.mountPath}`);
          await reconcileExternalVolumes();
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('storage:volumeMounted', vol);
              win.webContents.send('storage:mountsChanged', { timestamp: Date.now() });
            }
          });
        }
      }

      // 2. Detect unmounted volumes
      for (const prevUuid of previousVolumeUuids) {
        if (!currentUuids.has(prevUuid)) {
          console.log(`[Volume Disconnected] Volume "${prevUuid}" unplugged`);
          await reconcileExternalVolumes();
          BrowserWindow.getAllWindows().forEach((win) => {
            if (!win.isDestroyed()) {
              win.webContents.send('storage:volumeUnmounted', { uuid: prevUuid });
              win.webContents.send('storage:mountsChanged', { timestamp: Date.now() });
            }
          });
        }
      }

      previousVolumeUuids = currentUuids;
    } catch {} finally {
      isVolumeMonitoring = false;
    }
  };

  // Initial volume scan on startup
  monitorVolumeChanges();

  const volumeInterval = setInterval(monitorVolumeChanges, 2000);
  app.on('will-quit', () => clearInterval(volumeInterval));
}
