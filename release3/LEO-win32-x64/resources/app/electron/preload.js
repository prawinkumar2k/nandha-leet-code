const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    selectSavePath: (options) => ipcRenderer.invoke('select-save-path', options),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getDbPath: () => ipcRenderer.invoke('get-db-path'),
});
