const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // listen for the 'load-images' event from the main process
    onLoadImages: (callback) => ipcRenderer.on('load-images', (_event, folderPath, imageFiles) => callback(folderPath, imageFiles))
});