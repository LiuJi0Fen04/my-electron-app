const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let db;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // It's safer to keep this false and use preload
            contextIsolation: true // Recommended for security
        }
    });

    mainWindow.loadFile('index.html');
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    // Initialize the database
    initDatabase();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    // Close the database connection when all windows are closed
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            }
            console.log('Database connection closed.');
        });
    }
});

function initDatabase() {
    const dbPath = path.join('project_management.db');
    console.log('dbPath: ', dbPath);
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            createTables();
        }
    });
}

function createTables() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
        `, (err) => {
            if (err) console.error('Error creating projects table:', err.message);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS sub_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'To Do',
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error('Error creating sub_projects table:', err.message);
        });
    });
}

// IPC Handlers for Database Operations
ipcMain.handle('db-get-projects', async () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM projects ORDER BY name ASC', [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('db-add-project', async (event, projectName) => {
    return new Promise((resolve, reject) => {
        // This executes an SQL INSERT statement to add a new row into the projects table.
        // ? is a placeholder, and [projectName] is the value to insert safely (prevents SQL injection).
        // The function (err) is a callback that runs once the query finishes.
        db.run('INSERT INTO projects (name) VALUES (?)', [projectName], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, name: projectName });
            }
        });
    });
});

ipcMain.handle('db-get-sub-projects', async (event, projectId) => {
    return new Promise((resolve, reject) => {
        // It's used to execute an SQL query and retrieve all matching rows from the database.
        // ORDER BY name ASC: Sort the retrieved sub-projects alphabetically by their name in ascending order
        // (err, rows) => { ... }: This is the callback function that db.all executes once the query is complete.
        //      err: If an error occurred during the database operation, this parameter will contain an Error object.
        //      rows: If the query was successful, this parameter will contain an array of JavaScript objects, where each object represents a row from the sub_projects table 
        //      (e.g., [{ id: 1, project_id: 101, name: 'Frontend UI', description: '...', status: '...' }, ...]).
        db.all('SELECT * FROM sub_projects WHERE project_id = ? ORDER BY name ASC', [projectId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // resolve(rows) on the Promise, signaling that the asynchronous operation completed successfully and passing the rows (the array of sub-project data) back as the result.
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('db-add-sub-project', async (event, subProject) => {
    const { projectId, name, description, status } = subProject;
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO sub_projects (project_id, name, description, status) VALUES (?, ?, ?, ?)',
            [projectId, name, description, status],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...subProject });
                }
            }
        );
    });
});

// Example for deleting a project and its sub-projects (due to ON DELETE CASCADE)
ipcMain.handle('db-delete-project', async (event, projectId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM projects WHERE id = ?', [projectId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
});

// Example for deleting a single sub-project
ipcMain.handle('db-delete-sub-project', async (event, subProjectId) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM sub_projects WHERE id = ?', [subProjectId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
});

ipcMain.handle('get-records', async () => {
    console.log('get records');
    return new Promise((resolve, reject) => {
        db.all(`SELECT name FROM projects`, [], (err, rows) => {
        if (err) {
            console.error("Query Error:", err);
            reject(err);
        } else {
            resolve(rows); 
        }
        });
    });
});