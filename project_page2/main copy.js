const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // Import dialog
const path = require('path');
const fs = require('fs'); // Keep fs for synchronous reading of JSON

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200, // Slightly wider for the new content
        height: 800, // Slightly taller
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile('index.html');

    // mainWindow.webContents.openDevTools(); // Uncomment for debugging

    ipcMain.on('send-message-to-main', (event, message) => {
        console.log('Message from renderer:', message);
        mainWindow.webContents.send('message-from-main', 'Hello from main process!');
    });

    ipcMain.on('open-settings-window', () => {
        console.log('Open settings window command received.');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Settings',
            message: 'Settings panel would open here!'
        });
    });

    // NEW IPC Handler for opening image folder
    ipcMain.handle('open-image-folder', async (event) => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (!canceled && filePaths.length > 0) {
            const folderPath = filePaths[0];
            const imageFiles = findImageFiles(folderPath);
            return imageFiles.map(file => path.join(folderPath, file)); // Return full paths
        }
        return [];
    });

    // NEW IPC Handler for opening node detail window
    ipcMain.on('open-node-detail-window', (event, nodeType) => {
        let nodeDetailWindow = new BrowserWindow({
            width: 600,
            height: 700,
            frame: false, // Make it frameless as requested
            webPreferences: {
                preload: path.join(__dirname, 'node_detail_preload.js'), // New preload script
                contextIsolation: true,
                nodeIntegration: false
            },
            parent: mainWindow, // Make it a child of the main window
            modal: false, // Can interact with parent window
            show: false // Don't show until content is ready
        });

        nodeDetailWindow.loadFile(path.join(__dirname, 'node_detail_window.html')); // Load new HTML

        // Read module_descriptor.json synchronously to get data before sending
        let moduleDescriptorData;
        try {
            const descriptorPath = path.join(__dirname, 'module_descriptor.json');
            const rawData = fs.readFileSync(descriptorPath, 'utf8');
            moduleDescriptorData = JSON.parse(rawData);
        } catch (error) {
            console.error('Failed to read module_descriptor.json:', error);
            // Optionally, show a dialog or send an error back to renderer
            dialog.showErrorBox('Error', 'Could not load module descriptor data.');
            nodeDetailWindow.close();
            return;
        }

        const specificModuleData = { [nodeType]: moduleDescriptorData[nodeType] };

        nodeDetailWindow.once('ready-to-show', () => {
            nodeDetailWindow.show();
            // Send the specific module data to the renderer process of the new window
            nodeDetailWindow.webContents.send('module-data', specificModuleData);
        });

        // Uncomment for debugging the detail window
        // nodeDetailWindow.webContents.openDevTools();

        // Handle window close event to clean up reference
        nodeDetailWindow.on('closed', () => {
            nodeDetailWindow = null;
        });
    });
}

function findImageFiles(folderPath) {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const files = fs.readdirSync(folderPath);
    return files.filter(file => {
        const extension = path.extname(file).toLowerCase();
        return supportedExtensions.includes(extension);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

