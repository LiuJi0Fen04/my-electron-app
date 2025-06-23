const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');


function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // If you need a preload script
      nodeIntegration: false, // Be cautious with this in production
      contextIsolation: true // Or true with proper context bridge setup
    }
  });

  mainWindow.loadFile('index.html'); // Load the generated HTML
  ipcMain.on('navigate', (event, page) => {
    console.log('heard config')
    if (page === 'config.html'){
      mainWindow.loadFile(path.join(__dirname, page));
    }
  })

  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});



// when click '算法配置编辑' this app will open a config.html page which in the exactly location of index.html. in config.html, there are two area arrange in left and right, which could be click 