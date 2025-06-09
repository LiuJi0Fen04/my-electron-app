const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    // remove the default titlebar
    titleBarStyle: 'hidden',
    // expose window controls in windows/linux
    ...(process.platform !== 'darwin' ? {titleBarOverlay: {color: '#2f3241',    symbolColor: '#74b1be', height: 30}} :{})
  })
  win.loadFile('./index.html')

  // // click through window, i.e. making the window ignore all mouse events
  // win.setIgnoreMouseEvents(true)
}

app.whenReady().then(() => {
  createWindow()
})