const { contextBridge, ipcRenderer } = require('electron/renderer')

// exposeInMainWorld is a function that exposes the electronAPI object to the main world
contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('set-title', title)  // channel name is set-title, param is title
})