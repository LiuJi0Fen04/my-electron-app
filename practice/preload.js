const {contextBridge, ipcRenderer} = require('electron/renderer')

contextBridge.exposeInMainWorld('darkmode', {
    toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
    system: () => ipcRenderer.invoke('dark-mode:system')
})