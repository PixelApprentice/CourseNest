import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose a safe, typed API to the renderer process via contextBridge.
 * 
 * SECURITY: Never expose ipcRenderer directly or allow arbitrary IPC channels.
 * Every exposed method maps to a specific, validated handler in the main process.
 */
const electronAPI = {
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
} as const;

contextBridge.exposeInMainWorld('__ELECTRON__', electronAPI);

export type ElectronAPI = typeof electronAPI;
