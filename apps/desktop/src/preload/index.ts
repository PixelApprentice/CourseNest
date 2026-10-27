import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose a safe, typed API to the renderer process via contextBridge.
 * 
 * SECURITY: Never expose ipcRenderer directly or allow arbitrary IPC channels.
 * Every exposed method maps to a specific, validated handler in the main process.
 */
const electronAPI = {
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<boolean>,
    maximize: () => ipcRenderer.invoke('window:maximize') as Promise<boolean>,
    close: () => ipcRenderer.invoke('window:close') as Promise<boolean>,
    isMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
    onMaximizedChanged: (callback: (isMaximized: boolean) => void) => {
      const listener = (_e: any, isMax: boolean) => callback(isMax);
      ipcRenderer.on('window:maximized-status', listener);
      return () => ipcRenderer.removeListener('window:maximized-status', listener);
    },
  },

  dialog: {
    openFiles: (options?: {
      filters?: Array<{ name: string; extensions: string[] }>;
      multiple?: boolean;
    }) => ipcRenderer.invoke('dialog:openFiles', options) as Promise<string[]>,

    openDirectory: () =>
      ipcRenderer.invoke('dialog:openDirectory') as Promise<string | null>,
  },

  fs: {
    readFile: (path: string) =>
      ipcRenderer.invoke('fs:readFile', path) as Promise<ArrayBuffer>,

    stat: (path: string) =>
      ipcRenderer.invoke('fs:stat', path) as Promise<{
        size: number;
        isFile: boolean;
        isDirectory: boolean;
        modifiedAt: string;
      }>,

    readDir: (path: string) =>
      ipcRenderer.invoke('fs:readDir', path) as Promise<
        Array<{ name: string; isFile: boolean; isDirectory: boolean }>
      >,
  },

  storage: {
    checkVolumeAccess: (volumePath: string) =>
      ipcRenderer.invoke('storage:checkVolumeAccess', volumePath) as Promise<{
        isMounted: boolean;
        path: string;
        error?: string;
      }>,

    setExternalMountPath: (mountPath: string) =>
      ipcRenderer.invoke('storage:setExternalMountPath', mountPath) as Promise<{
        success: boolean;
        mountPath: string;
      }>,

    saveCourseToDisk: (params: { course: any; targetDir?: string }) =>
      ipcRenderer.invoke('storage:saveCourseToDisk', params) as Promise<{
        success: boolean;
        courseDir: string;
        manifestPath: string;
      }>,

    writeMediaFile: (params: { courseId: string; filePath: string; buffer: ArrayBuffer; targetDir?: string }) =>
      ipcRenderer.invoke('storage:writeMediaFile', params) as Promise<{
        success: boolean;
        fullPath: string;
      }>,

    readMediaFile: (params: { courseId: string; filePath: string; targetDir?: string }) =>
      ipcRenderer.invoke('storage:readMediaFile', params) as Promise<{
        exists: boolean;
        buffer?: ArrayBuffer;
        error?: string;
      }>,

    scanDirectoryForCourses: (dirPath?: string) =>
      ipcRenderer.invoke('storage:scanDirectoryForCourses', dirPath) as Promise<any[]>,

    listExternalMounts: () =>
      ipcRenderer.invoke('storage:listExternalMounts') as Promise<
        Array<{
          path: string;
          label: string;
          isMounted: boolean;
          hasCourses: boolean;
          courseCount: number;
        }>
      >,

    getPersistentCourses: () =>
      ipcRenderer.invoke('storage:getPersistentCourses') as Promise<any[]>,

    savePersistentCourses: (courses: any[]) =>
      ipcRenderer.invoke('storage:savePersistentCourses', courses) as Promise<boolean>,
  },

  app: {
    getPath: (name: 'userData' | 'temp' | 'documents' | 'downloads') =>
      ipcRenderer.invoke('app:getPath', name) as Promise<string>,

    getDataDir: () =>
      ipcRenderer.invoke('app:getDataDir') as Promise<string>,

    getResourcesDir: () =>
      ipcRenderer.invoke('app:getResourcesDir') as Promise<string>,

    getPlatformInfo: () =>
      ipcRenderer.invoke('app:getPlatformInfo') as Promise<{
        platform: string;
        arch: string;
        version: string;
        isPackaged: boolean;
        dataDir: string;
      }>,

    showNotification: (title: string, body: string) =>
      ipcRenderer.invoke('app:showNotification', title, body) as Promise<void>,
  },

  theme: {
    getTheme: () => ipcRenderer.invoke('theme:getTheme') as Promise<string | null>,
    setTheme: (themeId: string) => ipcRenderer.invoke('theme:setTheme', themeId) as Promise<boolean>,
  },
} as const;

contextBridge.exposeInMainWorld('__ELECTRON__', electronAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
