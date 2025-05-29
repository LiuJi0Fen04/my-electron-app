const { ipcRenderer } = require('electron')


// Registers an event listener for a specific event ('port' in this case).
ipcRenderer.on('port', e => {
  // port received, make it globally available.
  window.electronMessagePort = e.ports[0]
  console.log('mainport received')

  // setting a message handler
  window.electronMessagePort.onmessage = messageEvent => {
    // handle message
    console.log('Received message:', messageEvent.data);
  }
})
