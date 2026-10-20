import { ipcMain, dialog, app, Notification } from 'electron';
import { join } from 'path';
import { readFile, stat, readdir } from 'fs/promises';

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
            extensions: ['zip', 'pdf', 'docx', 'pptx', 'mp4', 'webm', 'mkv'],
          },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      return result.canceled ? [] : result.filePaths;
    },
  );

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  // ── Filesystem ──────────────────────────────────────────────────────

  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    // Validate path is within allowed directories
    const dataDir = join(app.getPath('userData'), 'data');
    const resolvedPath = join(filePath);

    // Basic path traversal protection
    if (!resolvedPath.startsWith(dataDir) && !resolvedPath.startsWith(app.getPath('temp'))) {
      throw new Error('Access denied: file is outside allowed directories');
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
  }));

  // ── Notifications ───────────────────────────────────────────────────

  ipcMain.handle('app:showNotification', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
}
