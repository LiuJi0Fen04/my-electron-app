const { app, BrowserWindow } = require('electron/main')

let progressInterval

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile('index.html')

  const INCREMENT = 0.03
  const INTERVAL_DELAY = 100 // ms

  let c = 0
  progressInterval = setInterval(() => {
    // update progress bar to next value
    // values between 0 and 1 will show progress, >1 will show indeterminate or stick at 100%
    // (on windows)when c > 1,Shows indeterminate mode → a green block sliding left to right (like a loading animation)
    win.setProgressBar(c)

    // increment or reset progress bar
    if (c < 2) {
      c += INCREMENT
      console.log('incrementing progress bar')
    } else {
        console.log('resetting progress bar')
      c = (-INCREMENT * 5) // reset to a bit less than 0 to show reset state
    }
  }, INTERVAL_DELAY)
    // the inteval runs until the qpp quits, if the windows is closed but the app stays alive, the interval continues running in the background.
    win.on('closed', () => {
        clearInterval(progressInterval)
    })
}

app.whenReady().then(createWindow)

// // before the app is terminated, clear both timers
// app.on('before-quit', () => {
//   clearInterval(progressInterval)
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


// additionally, prevent creating multiple intervals if multiple windows are opened accidencially 
if (progressInterval) cleaarInterval(progressInterval)