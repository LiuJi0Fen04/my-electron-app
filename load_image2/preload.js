const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 监听从主进程发来的 'load-images' 事件
    onLoadImages: (callback) => ipcRenderer.on('load-images', (_event, folderPath, imageFiles) => callback(folderPath, imageFiles))
});