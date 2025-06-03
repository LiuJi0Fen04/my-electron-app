const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const https = require('node:https')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

// construct a local path icon name 
const iconName = path.join(__dirname, 'iconForDragAndDrop.png')
// create a write stream to that file
const icon = fs.createWriteStream(iconName)

// Create a new file to copy - you can also copy existing files.
fs.writeFileSync(path.join(__dirname, 'drag-and-drop-1.md'), '# First file to test drag and drop')
fs.writeFileSync(path.join(__dirname, 'drag-and-drop-2.md'), '# Second file to test drag and drop')

// use 'https.get' to fetch an image from a URL
// https.get('https://img.icons8.com/ios/452/drag-and-drop.png', (response) => {
https.get('https://img.icons8.com/?size=100&id=dxP0aGodjMtJ&format=png&color=000000', (response) => {
  // pipes the HTTP response into the file stream  
  response.pipe(icon)
})

app.whenReady().then(createWindow)


// electron can't detect where the file has been dropped for security and privacy to prevent apps from spying on users behavior
// even native apps like Finder and explorer don't expose this info
ipcMain.on('ondragstart', (event, filePath) => {
  console.log('ondrag', filePath)
  event.sender.startDrag({
    file: path.join(__dirname, filePath),
    icon: iconName
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})