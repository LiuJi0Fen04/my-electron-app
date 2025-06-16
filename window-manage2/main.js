// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep references to the views
let leftView = null;
let rightView = null;

// Store the last known widths of the panels

let panelWidths = {
  left: null, // We'll let the renderer decide the initial width
  right: null,
};

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // When the main window is resized, we'll notify the renderer process
  // so it can recalculate the view bounds based on the current panel widths.
  mainWindow.on('resize', () => {
     if(mainWindow) {
        mainWindow.webContents.send('window-resized');
     }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- IPC Handlers for Toggling Views ---

ipcMain.on('toggle-left-view', () => {
  if (!mainWindow) return;
  
  const [windowWidth, windowHeight] = mainWindow.getContentSize();
  const leftPanelWidth = panelWidths.left || (windowWidth / 2);
  const viewHeight = windowHeight - 180; // Account for the button area

  if (leftView) {
    mainWindow.removeBrowserView(leftView);
    leftView.webContents.destroy();
    leftView = null;
    console.log('Left view closed.');
  } else {
    
    leftView = new BrowserView();
    mainWindow.addBrowserView(leftView);
    leftView.setBounds({ x: 30, y: 150, width: leftPanelWidth - 60, height: viewHeight });
    leftView.webContents.loadFile('left.html');
    console.log('Left view opened.');
  }
});

ipcMain.on('toggle-right-view', () => {
  if (!mainWindow) return;
  
  const [windowWidth, windowHeight] = mainWindow.getContentSize();
  const leftPanelWidth = panelWidths.left || (windowWidth / 2);
  const rightPanelWidth = windowWidth - leftPanelWidth;
  const viewHeight = windowHeight - 180;
  const xPosition = leftPanelWidth + 30;

  if (rightView) {
    mainWindow.removeBrowserView(rightView);
    rightView.webContents.destroy();
    rightView = null;
    console.log('Right view closed.');
  } else {
    rightView = new BrowserView();
    mainWindow.addBrowserView(rightView);
    rightView.setBounds({ x: xPosition, y: 150, width: rightPanelWidth - 60, height: viewHeight });
    rightView.webContents.loadFile('right.html');
    console.log('Right view opened.');
  }
});

// --- IPC Handler for Resizing Views ---
ipcMain.on('update-view-bounds', (event, widths) => {
    panelWidths = widths;
    const [windowWidth, windowHeight] = mainWindow.getContentSize();
    const viewHeight = windowHeight - 180; // Account for the button area

    if (leftView) {
        leftView.setBounds({ x: 30, y: 150, width: panelWidths.left - 60, height: viewHeight });
    }
    if (rightView) {
        const xPosition = panelWidths.left + 30;
        const rightViewWidth = windowWidth - panelWidths.left - 60;
        rightView.setBounds({ x: xPosition, y: 150, width: rightViewWidth, height: viewHeight });
    }
});
