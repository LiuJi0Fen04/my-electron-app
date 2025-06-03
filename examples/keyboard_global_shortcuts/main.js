const { app, BrowserWindow, globalShortcut } = require('electron/main')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile('index.html')
}

function registerGlobalShortcut() {
  globalShortcut.register('Alt+CommandOrControl+I', () => {
    console.log('Electron loves glabal shortcuts!');
  })
}


// App ready → Register shortcut → Create window
app.whenReady().then(() => {
  globalShortcut.register('Alt+CommandOrControl+I', () => {
    console.log('Electron loves global shortcuts!')
  })
}).then(createWindow)

// // can be writen as a clean version
// app.whenReady().then(() => {
//   registerGlobalShortcut()
//   createWindow()
// })


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