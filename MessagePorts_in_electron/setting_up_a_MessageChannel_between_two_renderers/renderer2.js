// * The function keeps calling itself every 100ms until window.electronMessagePort is defined 
// (i.e., not undefined or null).
// *As soon as window.electronMessagePort becomes available (set by your preload script after 
// receiving the port), the if condition is true, postMessage is called, and the recursion 
// stops—the function does not call itself again.


function sendPingWhenReady() {
    if (window.electronMessagePort) {
      window.electronMessagePort.postMessage('ping2');
    } else {
      // Try again shortly
      setTimeout(sendPingWhenReady, 100);
    }
  }
  sendPingWhenReady();