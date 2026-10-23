import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  dialog: {
    openFiles: (options) => ipcRenderer.invoke("dialog:openFiles", options),
    openDirectory: () => ipcRenderer.invoke("dialog:openDirectory")
  },
  fs: {
    readFile: (path) => ipcRenderer.invoke("fs:readFile", path),
    stat: (path) => ipcRenderer.invoke("fs:stat", path),
    readDir: (path) => ipcRenderer.invoke("fs:readDir", path)
  },
  storage: {
    checkVolumeAccess: (volumePath) => ipcRenderer.invoke("storage:checkVolumeAccess", volumePath),
    setExternalMountPath: (mountPath) => ipcRenderer.invoke("storage:setExternalMountPath", mountPath)
  },
  app: {
    getPath: (name) => ipcRenderer.invoke("app:getPath", name),
    getDataDir: () => ipcRenderer.invoke("app:getDataDir"),
    getResourcesDir: () => ipcRenderer.invoke("app:getResourcesDir"),
    getPlatformInfo: () => ipcRenderer.invoke("app:getPlatformInfo"),
    showNotification: (title, body) => ipcRenderer.invoke("app:showNotification", title, body)
  }
};
contextBridge.exposeInMainWorld("__ELECTRON__", electronAPI);
