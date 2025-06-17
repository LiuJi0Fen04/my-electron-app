// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.(weak references won't prevent garbage collection)
let mainWindow;

// Keep references to the views
let leftView = null;
let rightView = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
    //   preload: path.join(__dirname, 'preload.js'),
      // It's recommended to use a preload script for security,
      // but for this simple example, we'll enable nodeIntegration.
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows in an array if your app supports multi windows, 
    // this is the time when you should delete the corresponding element.
    mainWindow = null;  // it only removes the reference from your code, making it eligible for gabage collection 
  });

  // Listen for the window to be resized to adjust view bounds
  mainWindow.on('resize', () => {
    const [width, height] = mainWindow.getContentSize();   // simultaneously assign the size
    const viewHeight = height - 180; // Account for the button area

    if (leftView) {
      leftView.setBounds({ x: 30, y: 150, width: (width / 2) - 60, height: viewHeight });
    }
    // else{
    //     console.log('still no left view')
    // }
    if (rightView) {
      rightView.setBounds({ x: (width / 2) + 30, y: 150, width: (width / 2) - 60, height: viewHeight });
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- IPC Handlers for Toggling Views ---

// Handle the left view
ipcMain.on('toggle-left-view', () => {
  if (!mainWindow) return;

  const [width, height] = mainWindow.getContentSize();
//   const [width1, height1] = mainWindow.getSize();
//   console.log('mainWindows content size: ', width, height)
//   console.log('mainWindows size: ', width1, height1)

  const viewWidth = (width / 2) - 60; // Subtract padding/margins
  const viewHeight = height - 180; // Account for the button area

  if (leftView) {
    // If the view exists, remove and destroy it
    mainWindow.removeBrowserView(leftView);
    leftView.webContents.destroy();
    leftView = null;
    console.log('Left view closed.');
  } else {
    // If the view doesn't exist, create and add it
    leftView = new BrowserView();
    // to use addBrowserView instead of setBrowserView
    // mainWindow.setBrowserView(leftView);
    mainWindow.addBrowserView(leftView);
    leftView.setBounds({ x: 30, y: 150, width: viewWidth, height: viewHeight });
    leftView.webContents.loadFile('left.html');
    console.log('Left view opened.');
  }
});

// Handle the right view
ipcMain.on('toggle-right-view', () => {
  if (!mainWindow) return;

  const [width, height] = mainWindow.getContentSize();
  const viewWidth = (width / 2) - 60;
  const viewHeight = height - 180;
  const xPosition = (width / 2) + 30;

  if (rightView) {
    // If the view exists, remove and destroy it
    mainWindow.removeBrowserView(rightView);
    rightView.webContents.destroy();
    rightView = null;
    console.log('Right view closed.');
  } else {
    // If the view doesn't exist, create and add it
    rightView = new BrowserView();
    mainWindow.addBrowserView(rightView);
    rightView.setBounds({ x: xPosition, y: 150, width: viewWidth, height: viewHeight });
    rightView.webContents.loadFile('right.html');
    console.log('Right view opened.');
  }
});

