const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

// 处理选择文件夹请求
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) return [];

  const folderPath = result.filePaths[0];

  // 读取图像文件
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  const files = fs.readdirSync(folderPath);
  const imagePaths = files
    .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => `file://${path.join(folderPath, file)}`);

  return imagePaths;
});

app.whenReady().then(createWindow);
