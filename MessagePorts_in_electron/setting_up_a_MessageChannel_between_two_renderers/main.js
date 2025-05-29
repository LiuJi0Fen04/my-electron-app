const { BrowserWindow, app, MessageChannelMain } = require('electron')
const path = require('node:path')

app.whenReady().then(async () => {
  // create the windows.
  const mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: false, // preload file has access to the main window
      // preload: 'preloadMain.js'
      preload: path.join(__dirname, 'preloadMain.js')

    }
  })

  const secondaryWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: false,
      // preload: 'preloadSecondary.js'
      preload: path.join(__dirname, 'preloadSecondary.js')
    }
  })
  mainWindow.loadFile('index.html')
  secondaryWindow.loadFile('index2.html')

  mainWindow.webContents.openDevTools()
  secondaryWindow.webContents.openDevTools()

  // set up the channel.
  const { port1, port2 } = new MessageChannelMain()

  // once the webContents are ready, send a port to each webContents with postMessage.
  // Electron triggers 'ready-to-show' automatically when the window's web page has finished rendering its first paint.
  mainWindow.once('ready-to-show', () => {
    console.log("main ready")
    mainWindow.show();
    mainWindow.webContents.postMessage('port', null, [port1])
  })

  secondaryWindow.once('ready-to-show', () => {
    secondaryWindow.show();
    secondaryWindow.webContents.postMessage('port', null, [port2])
  })
})