const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();

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
                            mainWindow.webContents.send('load-images', folderPath, imageFiles);
                        }
                    }
                },
                // {
                //     type: 'separator'
                // },
                {
                    label: '退出',
                    role: 'quit'
                }
            ]
        },
        {
          label: '视图',
          submenu: [
            {
              label: 'Open DevTools',
              accelerator: 'CmdOrCtrl+Shitf+I',
              click: (menuItem, mainWindow) => {
                if (mainWindow){
                  mainWindow.webContents.openDevTools('detech')
                }
              }
            }
          ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
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