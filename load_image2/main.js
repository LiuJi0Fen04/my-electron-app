const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // 推荐的安全实践
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();

    // --- 创建菜单 ---
    const menuTemplate = [
        {
            label: '文件',
            submenu: [
                {
                    label: '打开文件夹...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        });

                        if (!canceled && filePaths.length > 0) {
                            const folderPath = filePaths[0];
                            const imageFiles = findImageFiles(folderPath);
                            // 将图片文件列表发送到渲染进程
                            mainWindow.webContents.send('load-images', folderPath, imageFiles);
                        }
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: '退出',
                    role: 'quit'
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

// --- 查找文件夹中的图片 ---
function findImageFiles(folderPath) {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const files = fs.readdirSync(folderPath);
    return files.filter(file => {
        const extension = path.extname(file).toLowerCase();
        return supportedExtensions.includes(extension);
    });
}


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});