import { ipcMain, dialog, app, Notification } from 'electron';
import { join, resolve } from 'path';
import { readFile, stat, readdir, access, writeFile } from 'fs/promises';
import { constants, existsSync, readFileSync } from 'fs';

let configuredExternalMountPath: string | null = null;

function validatePathBoundary(targetPath: string): string {
  const resolvedPath = resolve(targetPath);
  const dataDir = resolve(app.getPath('userData'));
  const tempDir = resolve(app.getPath('temp'));
  const documentsDir = resolve(app.getPath('documents'));
  const downloadsDir = resolve(app.getPath('downloads'));

  const isAllowedInternal =
    resolvedPath.startsWith(dataDir) ||
    resolvedPath.startsWith(tempDir) ||
    resolvedPath.startsWith(documentsDir) ||
    resolvedPath.startsWith(downloadsDir);
  const isAllowedExternal = configuredExternalMountPath
    ? resolvedPath.startsWith(resolve(configuredExternalMountPath))
    : false;
  const isStandardMediaMount =
    resolvedPath.startsWith('/media') ||
    resolvedPath.startsWith('/run/media') ||
    resolvedPath.startsWith('/mnt') ||
    resolvedPath.startsWith('/Volumes') ||
    /^[a-zA-Z]:\\/.test(resolvedPath);

  if (!isAllowedInternal && !isAllowedExternal && !isStandardMediaMount) {
    throw new Error(`Access denied: path "${targetPath}" is outside authorized storage directories`);
  }
  return resolvedPath;
}

export function registerIpcHandlers(): void {
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
            extensions: ['zip', 'tar.gz', 'tgz', 'pdf', 'docx', 'pptx', 'mp4', 'webm', 'mkv', 'json'],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      return result.canceled ? [] : result.filePaths;
    },
  );

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!result.canceled && result.filePaths[0]) {
      configuredExternalMountPath = result.filePaths[0];
      return result.filePaths[0];
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
    configuredExternalMountPath = mountPath;
    return { success: true, mountPath };
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
