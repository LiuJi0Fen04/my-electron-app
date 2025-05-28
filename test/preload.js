const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
  ping: () => ipcRenderer.invoke('ping')
})

// preload.js's function is to handle the events from the renderer process using ipcRenderer!!!
// improt Node.js and electron moudle in a context-isolated render process
