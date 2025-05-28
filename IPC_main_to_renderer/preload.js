const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  // The first argument is always the channel name (a string, e.g., 'update-counter').
  // The part inside the parentheses, callback, is a parameter—a variable name you choose, which will be a function provided by whoever calls onUpdateCounter.
  onUpdateCounter: (callback) => ipcRenderer.on('update-counter', (_event, value) => callback(value)),
  counterValue: (value) => ipcRenderer.send('counter-value', value)
})

// the way to use icpRenderer.on
// ipcRenderer.on('some-channel', (event, arg1, arg2, arg3) => {
//   // arg1, arg2, arg3 correspond to the values sent
// });

// this is an arrow fuction in JavaScript
// (callback) => ipcRenderer.on('update-counter', (_event, value) => callback(value))



// Summary Table
// | Code Part | What it is | What it means/does |
// |----------------------------------|---------------------------|----------------------------------------------------|
// | (callback) => ... | Arrow function | Takes a function as a parameter |
// | (_event, value) => ... | Arrow function | Takes two parameters, but only uses value |
// | _event | Unused parameter | The underscore means "I’m not using this variable" |
// | callback(value) | Function call | Calls your function with the value |