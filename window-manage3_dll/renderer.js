// renderer.js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer } = require('electron');
const addon = require('./hello_addon/build/Release/hello_addon.node');

document.addEventListener('DOMContentLoaded', () => {
    // Get references to existing DOM elements
    const toggleLeftBtn = document.getElementById('toggle-left-btn');
    const toggleRightBtn = document.getElementById('toggle-right-btn');
    const resizer = document.getElementById('resizer');
    const leftPanel = document.getElementsByClassName('left-panel')[0];
    const rightPanel = document.getElementsByClassName('right-panel')[0];

    // Get references to new side panel elements
    const toggleSidePanelBtn = document.getElementById('toggle-side-panel-btn');
    const closeSidePanelBtn = document.getElementById('close-side-panel-btn');
    const sidePanelContainer = document.getElementById('side-panel-container'); // Get by ID
    const mainContentContainer = document.getElementById('main-content-container'); // The main content area

    const SIDE_PANEL_WIDTH = 250; // Must match the width defined in styles.css

    // Function to update the main content container's position and width
    function updateMainContentLayout(isSidePanelHidden) {
        if (isSidePanelHidden) {
            mainContentContainer.style.left = '0px';
            mainContentContainer.style.width = '100%';
        } else {
            mainContentContainer.style.left = `${SIDE_PANEL_WIDTH}px`;
            mainContentContainer.style.width = `calc(100% - ${SIDE_PANEL_WIDTH}px)`;
        }
    }

    // --- Button Click Handlers ---

    // Toggle left view button functionality
    toggleLeftBtn.addEventListener('click', () => {
        ipcRenderer.send('toggle-left-view'); // Send IPC message to main process
        // Update button text based on current state
        toggleLeftBtn.innerText = (toggleLeftBtn.innerText === 'Open Left View') ? 'Close Left View' : 'Open Left View';
    });

    // Toggle right view button functionality
    toggleRightBtn.addEventListener('click', () => {
        ipcRenderer.send('toggle-right-view'); // Send IPC message to main process
        // Update button text based on current state
        toggleRightBtn.innerText = (toggleRightBtn.innerText === 'Open Right View') ? 'Close Right View' : 'Open Right View';
    });

    // Side panel toggle logic (for the always-visible button)
    toggleSidePanelBtn.addEventListener('click', () => {
        // Toggle the 'hidden' class on the side panel container
        const isHidden = sidePanelContainer.classList.toggle('hidden');
        updateMainContentLayout(isHidden); // Update main content layout
        // Notify the main process about the side panel's new visibility state
        ipcRenderer.send('side-panel-toggled', isHidden);
    });

    // Close side panel button functionality (inside the side panel)
    closeSidePanelBtn.addEventListener('click', () => {
        // Add the 'hidden' class to ensure the side panel is hidden
        sidePanelContainer.classList.add('hidden');
        updateMainContentLayout(true); // Update main content layout for hidden panel
        // Notify the main process that the side panel is now hidden
        ipcRenderer.send('side-panel-toggled', true);
    });

    // --- Resizer Logic ---
    let isResizing = false; // Flag to track if resizing is in progress

    // Event listener for mouse down on the resizer
    resizer.addEventListener('mousedown', (e) => {
        console.log('Resizer mousedown');
        isResizing = true;
        // Add event listeners to the document to handle dragging anywhere on the page
        document.addEventListener('mousemove', handleMouseMove);
        // Event listener for mouse up to stop resizing
        document.addEventListener('mouseup', () => {
            console.log('mouse up');
            isResizing = false;
            // Remove the listeners when the mouse is released
            document.removeEventListener('mousemove', handleMouseMove);
            // Reset cursor and user selection styles
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        });
        // Set cursor and user selection styles while dragging
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    // Function to handle mouse movement during resizing
    function handleMouseMove(e) {
        if (!isResizing) return; // Do nothing if not resizing

        console.log('Mouse move, elements:', {
            leftPanel: !!leftPanel,
            rightPanel: !!rightPanel,
            resizer: !!resizer
        });

        // Calculate the new width for the left panel based on mouse position
        // The clientX is relative to the viewport. We need to account for the main content container's offset.
        const mainContentRect = mainContentContainer.getBoundingClientRect();
        const newLeftWidth = e.clientX - mainContentRect.left;

        // Apply the new widths to the panels
        leftPanel.style.flexGrow = '0';
        leftPanel.style.flexBasis = newLeftWidth + 'px';
        
        rightPanel.style.flexGrow = '1';
        rightPanel.style.flexBasis = '0'; // Reset basis so it can grow

        // Send the new bounds to the main process to update the BrowserViews
        const totalWidth = mainContentContainer.clientWidth; // Use main content container's width
        const rightWidth = totalWidth - newLeftWidth - resizer.offsetWidth;

        ipcRenderer.send('update-view-bounds', {
            left: newLeftWidth,
            right: rightWidth
        });
    }

    // Listen for the main window resize event from the main process
    ipcRenderer.on('window-resized', () => {
        console.log('heard window-resized event')
        const totalWidth = mainContentContainer.clientWidth; // Use main content container's width
        const leftWidth = leftPanel.offsetWidth;
        const rightWidth = totalWidth - leftWidth - resizer.offsetWidth;

        ipcRenderer.send('update-view-bounds', {
            left: leftWidth,
            right: rightWidth
        });
    });

    // Initialize layout on load
    updateMainContentLayout(sidePanelContainer.classList.contains('hidden'));
});
