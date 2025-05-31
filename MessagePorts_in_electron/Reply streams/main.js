const {app, BrowserWindow,ipcMain} = require ('electron')


function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  mainWindow.loadFile('index.html')
  mainWindow.webContents.openDevTools()
}


app.whenReady().then(() => {
    // 'give-me-a-stream': The channel name. Must match the one used in ipcRenderer.postMessage.
    // (event, msg): The listener receives two arguments:
    //    event: Contains metadata about the message, including the ports property (an array of transferred MessagePorts).
    //    msg: The payload sent from the renderer (the object { element, count: 10, cnt: 12 }).
    ipcMain.on('give-me-a-stream', (event, msg) => {
      // The renderer has sent us a MessagePort that it wants us to send our
      // response over.
      const [replyPort] = event.ports
    
      // Here we send the messages synchronously, but we could just as easily store
      // the port somewhere and send messages asynchronously.
      for (let i = 0; i < msg.cnt; i++) {
        replyPort.postMessage(msg.element + i)
        console.log(msg.element + i)
      }
      replyPort.postMessage("finished from main")
      // We close the port when we're done to indicate to the other end that we
      // won't be sending any more messages. This isn't strictly necessary--if we
      // didn't explicitly close the port, it would eventually be garbage
      // collected, which would also trigger the 'close' event in the renderer.
      replyPort.close()
    })

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})


// Example mapping:
// +----------------------------------------------+-----------------------------+
// | Renderer (ipcRenderer.postMessage)           | Main (ipcMain.on)           |
// |----------------------------------------------|-----------------------------|
// | 'give-me-a-stream' (channel)                 | 'give-me-a-stream'          |
// | { element, count: 10, cnt: 12 } (payload)    | msg                         |
// | [port2] (transferables)                      | event.ports (array)         |
// +----------------------------------------------+-----------------------------+
