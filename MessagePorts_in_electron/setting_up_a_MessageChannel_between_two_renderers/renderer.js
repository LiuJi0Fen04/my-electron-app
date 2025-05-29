// elsewhere in your code to send a message to the other renderers message handler
function sendPingWhenReady() {
    if (window.electronMessagePort) {
      window.electronMessagePort.postMessage('ping1');
    } else {
      // Try again shortly
      setTimeout(sendPingWhenReady, 100);
    }
  }
  sendPingWhenReady();