const { app, BrowserWindow, Menu, MenuItem } = require('electron/main')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  })

  win.loadFile('index.html')
} 

const menu = new Menu()
menu.append(new MenuItem({
  label: 'Electron',
  submenu: [{
    // In Electron, the role property in a menu or submenu item is a special keyword that tells Electron to use a built-in, standard menu 
    // item with predefined behavior. When you specify a role, Electron automatically provides the label, icon, keyboard shortcut, and 
    // action for that menu item, according to the platform’s conventions.
    // role: Defines built-in behavior for the menu item (like undo, redo, copy, quit, etc.).-
    // label: Defines the text displayed on the menu item.
    role: 'help',
    // to configure a local keyboard shortcut, you need to specify an accelerator  property when creating a MenuItem within the Menu module
    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Alt+Shift+I', 
    click: () => { 
      console.log('Electron rocks!') 
    }
  }]
}))


// The accelerator syntax is platform-agnostic. Electron automatically translates the shortcut to the correct keys for
// Windows, macOS, and Linux. For example, CmdOrCtrl will be Command on macOS and Control on Windows/Linux.
// accelerator: 'CmdOrCtrl+R',




Menu.setApplicationMenu(menu)

app.whenReady().then(createWindow)

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