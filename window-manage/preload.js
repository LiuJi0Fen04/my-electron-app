const {contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.send('message-from-child', message),
  openchild: (message) => ipcRenderer.send('open-child-window', message),
  onReply: (callback) => ipcRenderer.on('reply-from-main', (event, args) => callback(args))
})



