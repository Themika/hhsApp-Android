const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('save-database-file', data),
  readData: () => ipcRenderer.invoke('read-database-file'),
  // Ensure this is exactly as written:
  readPdfFile: (filePath) => ipcRenderer.invoke('read-pdf-file', filePath)
});