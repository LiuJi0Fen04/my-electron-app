// renderer.js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron');

const toggleLeftBtn = document.getElementById('toggle-left-btn');
const toggleRightBtn = document.getElementById('toggle-right-btn');

toggleLeftBtn.addEventListener('click', () => {
    // Send a message to the main process to toggle the view
    ipcRenderer.send('toggle-left-view');

    // Update button text for user feedback
    if (toggleLeftBtn.innerText === 'Open Left View') {
        toggleLeftBtn.innerText = 'Close Left View';
    } else {
        toggleLeftBtn.innerText = 'Open Left View';
    }
});

toggleRightBtn.addEventListener('click', () => {
    // Send a message to the main process to toggle the view
    ipcRenderer.send('toggle-right-view');

    // Update button text for user feedback
    if (toggleRightBtn.innerText === 'Open Right View') {
        toggleRightBtn.innerText = 'Close Right View';
    } else {
        toggleRightBtn.innerText = 'Open Right View';
    }
});
