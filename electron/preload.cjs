'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getBackendUrl: () => ipcRenderer.invoke('backend:get-url'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
});

contextBridge.exposeInMainWorld('electronUpdater', {
  isAvailable: true,
  getConfig: () => ipcRenderer.invoke('updater:get-config'),
  setConfig: (partial) => ipcRenderer.invoke('updater:set-config', partial),
  scanChanges: () => ipcRenderer.invoke('updater:scan-changes'),
  createBackup: () => ipcRenderer.invoke('updater:create-backup'),
  applyUpdate: (scanResult) => ipcRenderer.invoke('updater:apply-update', scanResult),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
});
