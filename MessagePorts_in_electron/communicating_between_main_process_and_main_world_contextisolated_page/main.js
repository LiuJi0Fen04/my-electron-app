const { app, BrowserWindow, MessageChannelMain } = require('electron')
const path = require('node:path')

// declare window in the outer scope
let bw = null

const createWindow = () => {
  bw = new BrowserWindow({
    show: true,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  })
  bw.loadFile('index.html')
  bw.webContents.openDevTools()
}

app.whenReady().then(async () => {
  createWindow()

  // We'll be sending one end of this channel to the main world of the
  // context-isolated page.
  const { port1, port2 } = new MessageChannelMain()

  // It's OK to send a message on the channel before the other end has
  // registered a listener. Messages will be queued until a listener is
  // registered.
  port2.postMessage({ test: 21 })

  // We can also receive messages from the main world of the renderer.
  port2.on('message', (event) => {
    console.log('from renderer main world:', event.data)
  })
  port2.start()
  console.log('send message to main world')
  // The preload script will receive this IPC message and transfer the port
  // over to the main world.
  bw.webContents.postMessage('main-world-port', null, [port1])
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