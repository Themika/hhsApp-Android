const { contextBridge, ipcRenderer } = require('electron');

// Safely exposes a custom 'electronAPI.saveData()' function to your frontend script.js
contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('save-database-file', data)
});