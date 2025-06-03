const { app, BrowserWindow } = require('electron/main')

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 })

  win.loadFile('index.html')

  // current window
  // 👉 "Watch all input events for this window (win) before they reach the page."
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      console.log('Pressed Control+I')

      // Stops the key event from continuing — your app swallows it.
      // This prevents the renderer from reacting to that key combo (e.g., it won’t trigger a text box shortcut or menu action).
      event.preventDefault()
    }
  })
})


// ✅ webContents.on('before-input-event', ...)
// This is an event listener for keyboard and mouse input that happens before the page gets it (i.e., before a renderer process like your web page or JavaScript gets it).
// It allows you to intercept and modify input behavior, even before a keydown or keyup happens in the DOM.



// ❗Important Difference from globalShortcut.register
// | Feature      | `webContents.on('before-input-event')` | `globalShortcut.register()` |
// | ------------ | -------------------------------------- | --------------------------- |
// | Scope        | Active **window only**                 | **Global** OS-level         |
// | Context      | Inside app content                     | System-wide                 |
// | Needs focus? | Yes                                    | No                          |



// ✅ When to Use This
// Create custom shortcuts inside the app window
// Override browser-like shortcuts (e.g. Ctrl+R, Ctrl+I)
// Intercept and block dangerous or unwanted inputs
// Implement app-level behavior (like toggling dev tools, menus, or debug UI)
