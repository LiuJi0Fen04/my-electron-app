const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendMessageToMain: (message) => ipcRenderer.send('send-message-to-main', message),
    onMessageFromMain: (callback) => ipcRenderer.on('message-from-main', (event, message) => callback(message)),
    openSettings: () => {
        ipcRenderer.send('open-settings-window');
    },
    // NEW: Expose function to open image folder
    openImageFolder: () => ipcRenderer.invoke('open-image-folder'),
    // NEW: Expose function to open node detail window
    openNodeDetail: (nodeType) => ipcRenderer.send('open-node-detail-window', nodeType)
});

ipcRenderer.on('message-from-main', (event, message) => {
    console.log('Preload received message from main:', message);
});
