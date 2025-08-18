const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nodeDetailAPI', {
    // Listens for 'module-data' messages from the main process
    onModuleData: (callback) => ipcRenderer.on('module-data', (event, data) => callback(data)),
    // Allows the renderer to close the window
    closeWindow: () => ipcRenderer.send('close-node-detail-window')
});
