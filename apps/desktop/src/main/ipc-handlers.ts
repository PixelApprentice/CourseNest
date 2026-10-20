import { ipcMain, dialog, app, Notification } from 'electron';
import { join } from 'path';
import { readFile, stat, readdir, access } from 'fs/promises';
import { constants } from 'fs';

let configuredExternalMountPath: string | null = null;

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
    const dataDir = join(app.getPath('userData'), 'data');
    const tempDir = app.getPath('temp');
    const resolvedPath = join(filePath);

    // Validate path is within allowed boundaries (internal dataDir, temp, or configured external mount)
    const isAllowedInternal = resolvedPath.startsWith(dataDir) || resolvedPath.startsWith(tempDir);
    const isAllowedExternal = configuredExternalMountPath ? resolvedPath.startsWith(configuredExternalMountPath) : false;
    const isStandardMediaMount = resolvedPath.startsWith('/media') || resolvedPath.startsWith('/mnt') || resolvedPath.startsWith('/Volumes');

    if (!isAllowedInternal && !isAllowedExternal && !isStandardMediaMount) {
      throw new Error('Access denied: file is outside authorized storage directories');
    }

    const buffer = await readFile(resolvedPath);
    return buffer.buffer;
  });

  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    const stats = await stat(filePath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime.toISOString(),
    };
  });

  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    const entries = await readdir(dirPath, { withFileTypes: true });
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
}
