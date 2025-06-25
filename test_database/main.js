const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  win.loadFile('index.html');

  // Create or open the database
  db = new sqlite3.Database('database.db');
  db.run(`CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY, content TEXT)`);

  ipcMain.handle('insert-record', async (event, content) => {
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
}

app.whenReady().then(createWindow);
