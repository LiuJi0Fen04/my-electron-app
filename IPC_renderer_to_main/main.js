const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')


function handleSetTitle (event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}



function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // event is not just for win.setTitle(title), but for any situation where you need to 
  // know about the sender or reply to the sender in IPC communication.
  // callback function for the set-title event, arguments are event and title


  // !!!! this is another way to write the function
  // ipcMain.on('set-title', (event, title) => {
  //   const webContents = event.sender
  //   // finds the BrowserWindow instance that matches that webContents.
  //   const win = BrowserWindow.fromWebContents(webContents)
  //   win.setTitle(title)
  // })



  // In your renderer process, you would have something like:
  //   ipcRenderer.send('set-title', 'My New Title')
  // Here, 'My New Title' is the argument.
  // Electron will call your handler as:
  //   handleSetTitle(event, 'My New Title')
  // So, the arguments are explicitly passed from the renderer to the main process via IPC. 
  // They are not "silent" or hidden—they are whatever you send from the renderer.
  ipcMain.on('set-title', handleSetTitle)



  // mainWindow.loadFile('index.html') is not executed again unless you explicitly call it somewhere else in your code (for example, to reload the page).
  // event-driven programming(or the event loop model)
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
// Startup:
// The main process runs code line by line to set up the window and load the HTML.
// It also sets up event listeners (like ipcMain.on('set-title', ...)).
// Idle:
// The program waits for events (user actions, messages from renderer, etc.).
// Event occurs:
// When the user clicks the button, an event is triggered.
// The callback function you defined for that event is executed.