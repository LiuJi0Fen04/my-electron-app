const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const createWindow = () => {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.once('ready-to-show', () => {
    console.log("main ready")
    win.show();
  })
  // devTools
  win.webContents.openDevTools()
  win.loadFile('index.html')
//   win.loadURL('https://github.com')
//   const contents = win.webContents
//   console.log(contents)
}

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})