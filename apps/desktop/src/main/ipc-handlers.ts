import { ipcMain, dialog, app, Notification, BrowserWindow } from 'electron';
import { join, resolve, dirname } from 'path';
import { readFile, stat, readdir, access, writeFile, mkdir } from 'fs/promises';
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

      const courseDir = join(baseDir, 'coursenest_courses', course.id);
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

      const cleanRelative = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      const fullPath = validatePathBoundary(join(baseDir, 'coursenest_courses', courseId, cleanRelative));

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
      const fullPath = validatePathBoundary(join(baseDir, 'coursenest_courses', courseId, cleanRelative));

      try {
        await access(fullPath, constants.R_OK);
        const fileBuf = await readFile(fullPath);
        return { exists: true, buffer: fileBuf.buffer };
      } catch (err: any) {
        return { exists: false, error: err.message };
      }
    },
  );

  // ── Auto-Discovery & Scanning Directory for Courses ──────────────────
  async function scanDirectoryRecursive(baseDir: string): Promise<any[]> {
    const discovered: any[] = [];
    try {
      const resolved = validatePathBoundary(baseDir);
      await access(resolved, constants.R_OK);

      const coursesSubdir = join(resolved, 'coursenest_courses');
      const dirsToCheck: string[] = [];

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
              const coursesFolder = join(mountPath, 'coursenest_courses');
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
        const coursesFolder = join(configuredExternalMountPath, 'coursenest_courses');
        const hasCourses = existsSync(coursesFolder);
        let courseCount = 0;
        if (hasCourses) {
          const courseDirs = await readdir(coursesFolder, { withFileTypes: true });
          courseCount = courseDirs.filter((d) => d.isDirectory()).length;
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
}
