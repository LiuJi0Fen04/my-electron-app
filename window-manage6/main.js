const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1000, // Adjust as needed
    height: 700, // Adjust as needed
    webPreferences: {
      // The line below caused the error if preload.js was missing.
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Be cautious with this in production
      contextIsolation: false // Be cautious with this in production
    }
  });

  win.loadFile('index.html'); // Load your HTML file
  // win.webContents.openDevTools(); // Optional: Open DevTools for debugging
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
