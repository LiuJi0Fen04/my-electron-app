const { app, BrowserWindow, BrowserView, ipcMain } = require('electron')
const path = require('path')

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')

  const view = new BrowserView()
  mainWindow.setBrowserView(view)
  view.setBounds({ x: 0, y: 500, width: 1000, height: 200 })
  view.setAutoResize({ width: true, height: false })


  // navigationHistory class allows you to manage and interact with browsing history of your electron app 
  const navigationHistory = view.webContents.navigationHistory
  ipcMain.handle('nav:back', () =>
    navigationHistory.goBack()
  )

  ipcMain.handle('nav:forward', () => {
    navigationHistory.goForward()
  })

  ipcMain.handle('nav:canGoBack', () => navigationHistory.canGoBack())
  ipcMain.handle('nav:canGoForward', () => navigationHistory.canGoForward())
  ipcMain.handle('nav:loadURL', (_, url) =>
    view.webContents.loadURL(url)
  )
  ipcMain.handle('nav:getCurrentURL', () => view.webContents.getURL())
  ipcMain.handle('nav:getHistory', () => {
    return navigationHistory.getAllEntries()
  })

  // this event is a built in event 
  view.webContents.on('did-navigate', () => {
    console.log('completely new url')
    mainWindow.webContents.send('nav:updated')
  })

  // this event is also a built in event
  view.webContents.on('did-navigate-in-page', () => {
    console.log('in page url')
    mainWindow.webContents.send('nav:updated')
  })
  mainWindow.webContents.openDevTools({mode: 'detach'})
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})


// 🔄 Difference from webview Tag
// | `BrowserView`                                  | `<webview>` Tag                  |
// | ---------------------------------------------- | -------------------------------- |
// | Used in the **main process**                   | Used in the **renderer process** |
// | Better for performance and control             | Easier for simple embedding      |
// | More manual layout                             | Automatically fits into DOM      |
// | Requires setting bounds and attaching manually | Just put it in HTML              |

// ✅ When to Use BrowserView:
// Split-screen UI (like browser tabs or side panels)
// Preview panels
// Embedding external sites in parts of your app

// ⚠️ Security Tip:
// Always be careful when loading remote URLs. Use contextIsolation, disable nodeIntegration, 
// and control permissions to avoid exposing your app to security risks.



// | Feature                | `BrowserWindow` (`mainWindow`) | `BrowserView` (`view`)          |
// | ---------------------- | ------------------------------ | ------------------------------- |
// | Is a top-level window? | ✅ Yes                         | ❌ No                          |
// | Can display web pages? | ✅ Yes                         | ✅ Yes                         |
// | Has window frame/menu? | ✅ Yes                         | ❌ No                          |
// | Can embed other views? | ✅ Yes                         | ❌ No                          |
// | Typically used for...  | Main app window                | Embedding content into a window |
// | Has system-level frame/chrome   | ✅ Yes                            | ❌ No                            |
// | OS resource usage (e.g. memory) | 🟥 Higher (due to native window) | 🟨 Lower (no native window)     |




// did-navigate
//   Fires when: The user navigates to a completely new page (the main URL changes).
//   Examples:
//   Going from https://example.com to https://google.com
//   Reloading the page
//   Clicking a link that loads a new document

// did-navigate-in-page
//   Fires when: The user navigates within the same page (the main URL stays the same, but the hash or history state changes).
//   Examples:
//   Going from https://example.com#section1 to https://example.com#section2
//   Using history.pushState() or history.replaceState() in a single-page app (SPA) to change the URL without a full reload

// Summary Table:
//   | Event                  | Full page load | Hash/history API change |
//   |------------------------|:--------------:|:-----------------------:|
//   | did-navigate           | ✅             | ❌                     |
//   | did-navigate-in-page   | ❌             | ✅                     |