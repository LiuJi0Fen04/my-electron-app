const { app, BrowserWindow } = require('electron/main')
const fs = require('node:fs')
const path = require('node:path')

app.disableHardwareAcceleration()

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      offscreen: true
    }
  })

  win.loadURL('https://github.com')
  // listen for the 'paint' event, which is triggered when offscreen rendering produces a new image frame
  // this is used only when offscreen: true is set in webPreferences 
  // parameters: 
  // event: The event object(standard in event listener)
  // dirty: anobject representing the area of the screen that changed
  // image: a nativeimage object repesenting the rendering frame 
  win.webContents.on('paint', (event, dirty, image) => {
    fs.writeFileSync('ex.png', image.toPNG())
  })
  // tells electron to try rendering at 60 frames per second(only meaningful when offscreen is set to true)
  win.webContents.setFrameRate(60)
  // process.cwd gives the current working directory 
  console.log(`The screenshot has been successfully saved to ${path.join(process.cwd(), 'ex.png')}`)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


// offscreen rendering
// | Goal                                    | What to do                                   |
// | --------------------------------------- | -------------------------------------------- |
// | 🖼 Show the window to the user          | Remove `offscreen: true`                     |
// | 🧪 Take a hidden screenshot             | Keep `offscreen: true`                       |
// | 🔁 Preview in window **and** save image | Use visible window + `capturePage()` instead |
