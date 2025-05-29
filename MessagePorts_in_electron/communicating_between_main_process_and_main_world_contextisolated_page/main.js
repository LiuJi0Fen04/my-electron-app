const { BrowserWindow, app, MessageChannelMain } = require('electron')
const path = require('node:path')

app.whenReady().then(async () => {
  // Create a BrowserWindow with contextIsolation enabled.
  const bw = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  bw.loadURL('index.html')

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

  // The preload script will receive this IPC message and transfer the port
  // over to the main world.
  bw.webContents.postMessage('main-world-port', null, [port1])
})