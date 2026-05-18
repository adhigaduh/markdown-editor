const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () =>
    ipcRenderer.invoke('file:open'),

  openFileByPath: (filePath) =>
    ipcRenderer.invoke('file:open-by-path', filePath),

  saveFile: (filePath, content) =>
    ipcRenderer.invoke('file:save', { path: filePath, content }),

  saveFileAs: (content) =>
    ipcRenderer.invoke('file:save-as', { content }),

  getRecentFiles: () =>
    ipcRenderer.invoke('files:recent'),

  onMenuEvent: (callback) => {
    const listener = (_, eventName) => callback(eventName);
    ipcRenderer.on('menu:event', listener);
    return () => ipcRenderer.removeListener('menu:event', listener);
  },

  showMenu: () => ipcRenderer.send('menu:popup'),

  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  onMaximizeChange: (callback) => {
    const listener = (_, value) => callback(value);
    ipcRenderer.on('window:maximize-change', listener);
    return () => ipcRenderer.removeListener('window:maximize-change', listener);
  },
});
