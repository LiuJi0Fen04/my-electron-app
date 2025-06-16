// renderer.js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const toggleLeftBtn = document.getElementById('toggle-left-btn');
    const toggleRightBtn = document.getElementById('toggle-right-btn');
    const resizer = document.getElementById('resizer');
    const leftPanel = document.getElementsByClassName('left-panel')[0];
    const rightPanel = document.getElementsByClassName('right-panel')[0];

    // --- Button Click Handlers ---
    toggleLeftBtn.addEventListener('click', () => {
        ipcRenderer.send('toggle-left-view');
        toggleLeftBtn.innerText = (toggleLeftBtn.innerText === 'Open Left View') ? 'Close Left View' : 'Open Left View';
    });

    toggleRightBtn.addEventListener('click', () => {
        ipcRenderer.send('toggle-right-view');
        toggleRightBtn.innerText = (toggleRightBtn.innerText === 'Open Right View') ? 'Close Right View' : 'Open Right View';
    });

    // --- Resizer Logic ---
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        console.log('Resizer mousedown');
        isResizing = true;
        // Add event listeners to the document to handle dragging anywhere on the page
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            console.log('mouse up');
            isResizing = false;
            // Remove the listeners when the mouse is released
            document.removeEventListener('mousemove', handleMouseMove);
            // Optional: Add a class to show the body is not being selected
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';

        });
        // Optional: Add a class to show dragging is in progress
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    function handleMouseMove(e) {
        // console.log('mouse move')
        if (!isResizing) return;


        console.log('Mouse move, elements:', {
            leftPanel: !!leftPanel,
            rightPanel: !!rightPanel,
            resizer: !!resizer
        });

        
        // Calculate the new width for the left panel based on mouse position
        const container = resizer.parentNode;
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = e.clientX - containerRect.left;

        // Apply the new widths to the panels
        // We use `flex-grow: 0` to allow `flex-basis` to take full control
        leftPanel.style.flexGrow = '0';
        leftPanel.style.flexBasis = newLeftWidth + 'px';
        
        // Let the right panel fill the remaining space
        rightPanel.style.flexGrow = '1';
        rightPanel.style.flexBasis = '0'; // Reset basis so it can grow

        // Send the new bounds to the main process to update the BrowserViews
        const totalWidth = container.clientWidth;
        const rightWidth = totalWidth - newLeftWidth - resizer.offsetWidth;

        ipcRenderer.send('update-view-bounds', {
            left: newLeftWidth,
            right: rightWidth
        });
    }

    // Listen for the main window resize event
    ipcRenderer.on('window-resized', () => {
        // When the window is resized, we need to tell the main process
        // the current widths of our panels so the BrowserViews can be adjusted correctly.
        const container = resizer.parentNode;
        const totalWidth = container.clientWidth;
        const leftWidth = leftPanel.offsetWidth;
        const rightWidth = totalWidth - leftWidth - resizer.offsetWidth;

        ipcRenderer.send('update-view-bounds', {
            left: leftWidth,
            right: rightWidth
        });
    });
});
