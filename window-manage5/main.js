const { app, BrowserWindow, ipcMain, Menu, dialog, MenuItem } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'recent_projects.db'));

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
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

  // // Create or open the database
  // db = new sqlite3.Database('recent_projects.db');
  // db.run(`CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY, content TEXT)`);

  // ipcMain.handle('insert-record', async (event, content) => {
  //   console.log('insert-record handler registered');
  //   return new Promise((resolve, reject) => {
  //     db.run(`INSERT INTO records (content) VALUES (?)`, [content], function(err) {
  //       if (err) {
  //         console.error("Insert Error:", err);
  //         reject(err);
  //       } else {
  //         resolve();
  //       }
  //     });
  //   });
  // });

  // ipcMain.handle('get-records', async () => {
  //   return new Promise((resolve, reject) => {
  //     db.all(`SELECT content FROM records`, [], (err, rows) => {
  //       if (err) {
  //         console.error("Query Error:", err);
  //         reject(err);
  //       } else {
  //         resolve(rows);
  //       }
  //     });
  //   });
  // });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// const menuTemplate = [
//   {
//     label: 'File',
//     submenu: [
//       {
//         label: 'Open File',
//         accelerator: 'CmdOrCtrl+O',
//         click:async(MenuItem, browserWindow) => {
//           const {canceled, filePaths} = await dialog.showOpenDialog(browserWindow, {
//             properties:['openFile']
//           });
//           if (!canceled && filePaths.length > 0){
//             browserWindow.webContents.send('file-opened', filePaths[0]);
//           }
//         }
//       },
//       {role: 'quit'}
//     ]
//   },
//     {
//     label: 'Edit',
//     submenu: [
//       { role: 'undo' },
//       { role: 'redo' },
//       { type: 'separator' },
//       { role: 'cut' },
//       { role: 'copy' },
//       { role: 'paste' }
//     ]
//   }
// ]




app.whenReady().then(() => {
  createWindow();

  const currentMenu = Menu.getApplicationMenu();
  const menuItems = currentMenu?.items || [];

  // Find the File menu
  const fileMenu = menuItems.find(item => item.label === 'File');
  if (fileMenu) {
    fileMenu.submenu.insert(0, new MenuItem({
      label: 'Open File',
      accelerator: 'CmdOrCtrl+O',
      click: async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
          properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
          mainWindow.webContents.send('file-opened', filePaths[0]);
        }
      }
    }));
  }
  const updatedMenu = Menu.buildFromTemplate(menuItems);
  Menu.setApplicationMenu(updatedMenu);


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});



// when click '算法配置编辑' this app will open a config.html page which in the exactly location of index.html. in config.html, there are two area arrange in left and right, which could be click 