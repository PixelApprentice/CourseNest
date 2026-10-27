import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
    onMaximizedChanged: (callback) => {
      const listener = (_e, isMax) => callback(isMax);
      ipcRenderer.on("window:maximized-status", listener);
      return () => ipcRenderer.removeListener("window:maximized-status", listener);
    }
  },
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
    setExternalMountPath: (mountPath) => ipcRenderer.invoke("storage:setExternalMountPath", mountPath),
    saveCourseToDisk: (params) => ipcRenderer.invoke("storage:saveCourseToDisk", params),
    writeMediaFile: (params) => ipcRenderer.invoke("storage:writeMediaFile", params),
    readMediaFile: (params) => ipcRenderer.invoke("storage:readMediaFile", params),
    scanDirectoryForCourses: (dirPath) => ipcRenderer.invoke("storage:scanDirectoryForCourses", dirPath),
    listExternalMounts: () => ipcRenderer.invoke("storage:listExternalMounts"),
    getPersistentCourses: () => ipcRenderer.invoke("storage:getPersistentCourses"),
    savePersistentCourses: (courses) => ipcRenderer.invoke("storage:savePersistentCourses", courses)
  },
  app: {
    getPath: (name) => ipcRenderer.invoke("app:getPath", name),
    getDataDir: () => ipcRenderer.invoke("app:getDataDir"),
    getResourcesDir: () => ipcRenderer.invoke("app:getResourcesDir"),
    getPlatformInfo: () => ipcRenderer.invoke("app:getPlatformInfo"),
    showNotification: (title, body) => ipcRenderer.invoke("app:showNotification", title, body)
  },
  theme: {
    getTheme: () => ipcRenderer.invoke("theme:getTheme"),
    setTheme: (themeId) => ipcRenderer.invoke("theme:setTheme", themeId)
  }
};
contextBridge.exposeInMainWorld("__ELECTRON__", electronAPI);
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
