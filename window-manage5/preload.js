const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});

contextBridge.exposeInMainWorld('db', {
    insert: (content) => ipcRenderer.invoke('insert-record', content),
    getAll: () => ipcRenderer.invoke('get-records'),
    has: (content) => ipcRenderer.invoke('has-record', content),
    delete: (content) => ipcRenderer.invoke('delete-record', content),
    rename: (oldContent, newContent) => ipcRenderer.invoke('rename-record', oldContent, newContent)
});