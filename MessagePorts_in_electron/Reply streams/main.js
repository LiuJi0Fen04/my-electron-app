ipcMain.on('give-me-a-stream', (event, msg) => {
    // The renderer has sent us a MessagePort that it wants us to send our
    // response over.
    const [replyPort] = event.ports
  
    // Here we send the messages synchronously, but we could just as easily store
    // the port somewhere and send messages asynchronously.
    for (let i = 0; i < msg.count; i++) {
      replyPort.postMessage(msg.element)
    }
  
    // We close the port when we're done to indicate to the other end that we
    // won't be sending any more messages. This isn't strictly necessary--if we
    // didn't explicitly close the port, it would eventually be garbage
    // collected, which would also trigger the 'close' event in the renderer.
    replyPort.close()
  })