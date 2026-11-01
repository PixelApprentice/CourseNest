import { ipcMain, dialog, app, Notification, BrowserWindow } from 'electron';
import { join, resolve, dirname, basename } from 'path';
import { readFile, stat, readdir, access, writeFile, mkdir, rm } from 'fs/promises';
import { constants, existsSync, readFileSync } from 'fs';

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

  // ── External Disk Course Writing & Ingestion ─────────────────────────
  ipcMain.handle('storage:saveCourseToDisk', async (_event, params: { course: any; targetDir?: string }) => {
    try {
      const { course, targetDir } = params;
      const baseDir = targetDir
        ? validatePathBoundary(targetDir)
        : configuredExternalMountPath
        ? validatePathBoundary(configuredExternalMountPath)
        : join(app.getPath('userData'), 'courses');

      const courseDir = resolveCourseStorageDir(baseDir, course.id);
      await mkdir(courseDir, { recursive: true });

      const manifestPath = join(courseDir, 'coursenest-manifest.json');
      const courseWithDir = {
        ...course,
        storageTier: targetDir || configuredExternalMountPath ? 'external' : 'internal',
        externalMountPath: baseDir,
        externalCourseDir: courseDir,
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
    async (_event, params: { courseId: string; filePath: string; buffer: ArrayBuffer; targetDir?: string }) => {
      const { courseId, filePath, buffer, targetDir } = params;
      const baseDir = targetDir
        ? validatePathBoundary(targetDir)
        : configuredExternalMountPath
        ? validatePathBoundary(configuredExternalMountPath)
        : join(app.getPath('userData'), 'courses');

      const courseDir = resolveCourseStorageDir(baseDir, courseId);
      const cleanRelative = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullPath = validatePathBoundary(join(courseDir, cleanRelative));

      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, Buffer.from(buffer));
      return { success: true, fullPath };
    },
  );

  ipcMain.handle(
    'storage:readMediaFile',
    async (_event, params: { courseId: string; filePath: string; targetDir?: string }) => {
      const { courseId, filePath, targetDir } = params;
      const baseDir = targetDir
        ? validatePathBoundary(targetDir)
        : configuredExternalMountPath
        ? validatePathBoundary(configuredExternalMountPath)
        : join(app.getPath('userData'), 'courses');

      const cleanRelative = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
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
          return { exists: true, buffer: fileBuf.buffer };
        } catch {}
      }

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

  ipcMain.handle('storage:scanDirectoryForCourses', async (_event, dirPath?: string) => {
    const target = dirPath || configuredExternalMountPath;
    if (!target) return [];
    return await scanDirectoryRecursive(target);
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
  let lastMountSnapshot = '';
  const monitorVolumeChanges = async () => {
    try {
      let snapshot = '';
      if (process.platform === 'linux') {
        if (existsSync('/proc/mounts')) {
          try {
            snapshot = await readFile('/proc/mounts', 'utf-8');
          } catch {}
        }
      }
      const user = process.env.USER || process.env.LOGNAME || '';
      for (const p of ['/run/media', `/run/media/${user}`, '/media', `/media/${user}`, '/mnt', '/Volumes']) {
        if (existsSync(p)) {
          try {
            const list = await readdir(p);
            snapshot += `|${p}:${list.sort().join(',')}`;
          } catch {}
        }
      }
      if (lastMountSnapshot && snapshot !== lastMountSnapshot) {
        lastMountSnapshot = snapshot;
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('storage:mountsChanged', { timestamp: Date.now() });
          }
        });
      } else {
        lastMountSnapshot = snapshot;
      }
    } catch {}
  };

  const volumeInterval = setInterval(monitorVolumeChanges, 1500);
  app.on('will-quit', () => clearInterval(volumeInterval));
}
