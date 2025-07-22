const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // Import dialog
const path = require('path');
// const fs = require('node:fs/promises'); // For reading directory
const fs = require('fs');
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

    mainWindow.webContents.openDevTools(); // Uncomment for debugging

    ipcMain.on('send-message-to-main', (event, message) => {
        console.log('Message from renderer:', message);
        mainWindow.webContents.send('message-from-main', 'Hello from main process!');
    });

    ipcMain.on('open-settings-window', () => {
        // In a real app, you'd open a new BrowserWindow for settings here
        console.log('Open settings window command received.');
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Settings',
            message: 'Settings panel would open here!'
        });
    });

    // NEW IPC Handler for opening image folder
    ipcMain.handle('open-image-folder', async (event) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            try {
                const imageFiles = findImageFiles(folderPath);
                return { success: true, folderPath, images: imageFiles };
                // mainWindow.webContents.send('load-images', folderPath, imageFiles);
            } catch (error) {
                console.error('Failed to read directory or files:', error);
                return { success: false, error: error.message };
            }
        }
        return { success: false, canceled: true };
    });


    // // NEW IPC Handler for opening image folder
    // ipcMain.handle('open-image-folder', async (event) => {
    //     const result = await dialog.showOpenDialog(mainWindow, {
    //         properties: ['openDirectory']
    //     });

    //     if (!result.canceled && result.filePaths.length > 0) {
    //         const folderPath = result.filePaths[0];
    //         try {
    //             const files = await fs.readdir(folderPath, { withFileTypes: true });
    //             const imageFiles = files
    //                 .filter(dirent => dirent.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(dirent.name))
    //                 .map(dirent => path.join(folderPath, dirent.name));

    //             // Read image data as base64 for display in renderer
    //             const imageData = await Promise.all(imageFiles.map(async filePath => {
    //                 const data = await fs.readFile(filePath, { encoding: 'base64' });
    //                 const ext = path.extname(filePath).toLowerCase().substring(1);
    //                 return `data:image/${ext};base64,${data}`;
    //             }));
    //             return { success: true, folderPath, images: imageData };
    //         } catch (error) {
    //             console.error('Failed to read directory or files:', error);
    //             return { success: false, error: error.message };
    //         }
    //     }
    //     return { success: false, canceled: true };
    // });
    // mainWindow.webContents.openDevTools();
}


// find all supported image files in the folder 
function findImageFiles(folderPath) {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const files = fs.readdirSync(folderPath);
    // 1 Array<string> → This means the method applies to an array of strings.
    // 2 filter(...) → The method filters elements based on a condition.
    // 3 predicate: (value, index, array) => unknown → The filtering function:
    //    3.1 value: string → The current item in the array.
    //    3.2 index: number → The item's position in the array.
    //    3.3 array: string[] → The full array being filtered.(which can be usefull for comparisons or calculations that involve multiple elements)
    //    3.4 Returns: unknown, but typically true or false. If true, the item is included in the result.
    // 4 thisArg?: any → Optional. Specifies this context for the predicate function.
    // 5 Returns: string[] → The filtered array with only the items that satisfied the condition.
    return files.filter(file => {
        const extension = path.extname(file).toLowerCase(); // return the extension name of the path 
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