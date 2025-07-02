const { app, BrowserWindow, ipcMain, Menu, dialog, MenuItem } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db;
let project_db;
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

  // Create or open the database
  db = new sqlite3.Database('recent_projects.db');
  db.run(`CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      content TEXT NOT NULL UNIQUE
      )
      `,(err) => {
      if (err) console.error('Error creating projects table:', err.message);
  });

  // name 料号
  db.run(`
    CREATE TABLE IF NOT EXISTS sub_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        product_name TEXT NOT NULL, 
        station_number INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES records(id) ON DELETE CASCADE
    )
  `, (err) => {
      if (err) console.error('Error creating sub_projects table:', err.message);
  });


  ipcMain.handle('insert-project', async (event, content) => {
    console.log('insert-record handler registered');
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO records (content) VALUES (?)`, [content], function(err) {
        if (err) {
          console.error("Insert Error:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  ipcMain.handle('get-records', async () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT content FROM records`, [], (err, rows) => {
        if (err) {
          console.error("Query Error:", err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });


  ipcMain.handle('get-project-id', async (event, projectName) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT id FROM records WHERE content = ?`, [projectName], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.id : null);
        }
      });
    });
  });

  ipcMain.handle('add-sub-project', async (event, subProject) => {
    const { projectId, productName, stationNumber } = subProject;
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO sub_projects (project_id, product_name, station_number) VALUES (?, ?, ?)',
            [projectId, productName, stationNumber],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('sub success');
                    resolve({ id: this.lastID, ...subProject });
                }
            }
        );
    });
});



  ipcMain.handle('has-record', async (event, content) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT 1 FROM records WHERE content = ?`, [content], (err, row) => {
        if (err) {
          console.error('Check error:', err);
          reject(err);
        } else {
          resolve(!!row); // true if found, false if not
        }
      });
    });
  });

  ipcMain.handle('delete-record', async (event, content) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM records WHERE content = ?`, [content], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  
  ipcMain.handle('rename-record', async (event, oldContent, newContent) => {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE records SET content = ? WHERE content = ?`, [newContent, oldContent], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

function createNewWindow(filePath, frame = true) {
  const newWindow = new BrowserWindow({
    width: 650,
    height: 400,
    minWidth: 650,
    minHeight: 400,
    maxWidth: 1200,
    maxHeight: 900,
    parent: mainWindow,
    maximizable: false,
    minimizable: false,
    modal: true,
    // frame: frame,
    // remove the default titlebar
    titleBarStyle: 'hidden',
    // expose window controls in windows/linux
    ...(process.platform !== 'darwin' ? {titleBarOverlay: {color: '#f9fafb',    symbolColor: '#74b1be', height: 30}} :{}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  });

  newWindow.loadFile(filePath);

  newWindow.webContents.openDevTools();
}

// function openSettingsWindow(parentWindow){
//   // preventing opening it twice
//   if(settingsWindow && !settingsWindow.isDestroyed()){
//     settingsWindow.focus();  // Just bring it to front
//     return;
//   }
// }


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

  ipcMain.on('open-new-window', (event, filePath, frame) => {
    createNewWindow(filePath, frame);
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    if(result.canceled || result.filePaths.length === 0){
      return null;
    }

    return result.filePaths[0];
  });


  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


// when click '算法配置编辑' this app will open a config.html page which in the exactly location of index.html. in config.html, there are two area arrange in left and right, which could be click 