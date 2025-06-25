const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  insert: (content) => ipcRenderer.invoke('insert-record', content),
  getAll: () => ipcRenderer.invoke('get-records')
});
