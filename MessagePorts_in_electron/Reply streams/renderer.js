const {ipcRenderer} = require('electron')

const makeStreamingRequest = (element, callback) => {
  // MessageChannels are lightweight--it's cheap to create a new one for each
  // request.
  const { port1, port2 } = new MessageChannel()

  // 'give-me-a-stream': This is the channel name. Both sender and listener must use the same channel name to communicate.
  // { element, count: 10, cnt: 12 }: This is the message payload (an object). It can contain any data you want to send.
  // [port2]: This is an array of transferable objects (in this case, a MessagePort). This allows you to send a MessagePort to the main process for two-way communication.
  ipcRenderer.postMessage(
    'give-me-a-stream',
    { element, count: 10, cnt: 12},
    [port2]
  )

  // ... and we hang on to the other end. The main process will send messages
  // to its end of the port, and close it when it's finished.
  port1.onmessage = (event) => {
    callback(event.data)
  }
  port1.onclose = () => {
    console.log('stream ended')
  }
}

makeStreamingRequest(42, (data) => {
  console.log('got response data:', data)
})
// We will see "got response data: 42" 10 times.