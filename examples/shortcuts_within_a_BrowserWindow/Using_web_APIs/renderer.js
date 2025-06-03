function handleKeyPress (event) {
    // You can put code here to handle the keypress.
    document.getElementById('last-keypress').innerText = event.key
    console.log(`You pressed ${event.key}`)
  }
  
// | Argument                | Meaning                                                                                                                     |
// | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
// | `eventType`             | A **string** that specifies the type of event to listen for — e.g. `'click'`, `'keydown'`, `'keyup'`, `'mousemove'`, etc. ✅ |
// | `handlerFunction`       | The **function** that should run when the event occurs                                                                      |
// | `useCapture` (optional) | A boolean to specify whether to use capture phase (`true`) or bubble phase (`false`, default)                               |
window.addEventListener('keyup', handleKeyPress, true)
