const { ipcRenderer } = require('electron')

ipcRenderer.on('port', e => {
  // port received, make it globally available.
  window.electronMessagePort = e.ports[0]
  console.log('secondary port received')
  
  window.electronMessagePort.onmessage = messageEvent => {
    // handle message
    console.log('Received message:', messageEvent.data);
  }
})