const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const windows = {};

let mainWindow;


const createMainWindow = () => {

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
//   mainWindow.webContents.openDevTools('detech');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};


const createChildWindow = (windowName) => {
    let childWindow = new BrowserWindow({
      parent: mainWindow,
      modal: false, // a modal window blocks intersection with its parent window until the modal window is closed
      width: 400,
      height: 300,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'), 
        contextIsolation: true,
        nodeIntegration: false 
      }
    });

    if (windowName === 'child1')
        childWindow.loadFile('child.html');
    else{
        childWindow.loadFile('child2.html');
    }

    // childWindow.webContents.openDevTools('detech');

    childWindow.on('closed', () => {
        delete windows[windowName];
    });
    windows[windowName] = childWindow;
  };






app.on('ready', () => {
    ipcMain.on('message-from-child', (event, arg) => {
        console.log('recievied message from child: ', arg);
        event.reply('reply-from-main', 'message receievd by main')
    });
    createMainWindow();
    createChildWindow('child1');
    createChildWindow('child2');      
    ipcMain.on('open-child-window', (event, arg) => {
      if (arg === 'child1'){
        if (!windows['child1'] || !windows['child1'].isVisible())
          windows['child1'].show()
        else
          windows['child1'].hide()
      }
      else if (arg === 'child2'){
        if (!windows['child2'] || !windows['child2'].isVisible())
          windows['child2'].show()
        else
          windows['child2'].hide()
      }
    })


});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
