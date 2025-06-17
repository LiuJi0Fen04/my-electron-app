// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, BrowserView } = require('electron');
const path = require('path');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep references to the views
let leftView = null;
let rightView = null;

// Store the last known widths of the panels
let panelWidths = {
  left: null, // We'll let the renderer decide the initial width
  right: null,
};

let isSidePanelHidden = false; // Track side panel visibility state

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // Enable Node.js integration in the renderer process
      contextIsolation: false, // Disable context isolation (for simpler IPC in this example)
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Optional: Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Dereference the window object when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // When the main window is resized, notify the renderer process
  mainWindow.on('resize', () => {
     if(mainWindow) {
        mainWindow.webContents.send('window-resized'); // Send message to renderer
     }
  });
}

// App lifecycle events
app.whenReady().then(createWindow); // Create window when app is ready

app.on('window-all-closed', function () {
  // Quit app when all windows are closed, except on macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On macOS, re-create a window when the dock icon is clicked and no other windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * Updates the bounds (position and size) of the BrowserViews (left and right panels).
 * This function calculates the new positions based on the main window size and side panel visibility.
 */
function updateBrowserViewBounds() {
  if (!mainWindow) return; // Do nothing if main window is not available

  const [windowWidth, windowHeight] = mainWindow.getContentSize(); // Get main window dimensions
  const viewHeight = windowHeight - 180; // Calculate view height, accounting for padding/headers

  // Adjust for side panel presence
  let offsetX = 0; // Horizontal offset for views
  let availableWidth = windowWidth; // Width available for main content (left and right panels)
  const sidePanelWidth = 250; // The fixed width of your side panel as defined in CSS

  // If the side panel is not hidden, adjust offset and available width
  if (!isSidePanelHidden) {
      offsetX = sidePanelWidth; // Shift views to the right by side panel's width
      availableWidth -= sidePanelWidth; // Reduce available width for main content
  }
    
  // Calculate panel widths, defaulting to half of available width if not set
  const leftPanelWidth = panelWidths.left || (availableWidth / 2);
  const rightPanelWidth = availableWidth - leftPanelWidth;

  // Update left view bounds if it exists
  if (leftView) {
      leftView.setBounds({ x: offsetX + 30, y: 150, width: leftPanelWidth - 60, height: viewHeight });
  }
  // Update right view bounds if it exists
  if (rightView) {
      const xPosition = offsetX + leftPanelWidth + 30; // Calculate x position for right view
      rightView.setBounds({ x: xPosition, y: 150, width: rightPanelWidth - 60, height: viewHeight });
  }
}

// --- IPC Handlers for Toggling Views ---

// Handler for toggling the left view
ipcMain.on('toggle-left-view', () => {
  if (!mainWindow) return;
  
  if (leftView) {
    // If left view exists, remove and destroy it
    mainWindow.removeBrowserView(leftView);
    leftView.webContents.destroy();
    leftView = null;
    console.log('Left view closed.');
  } else {
    // If left view does not exist, create and add it
    leftView = new BrowserView();
    mainWindow.addBrowserView(leftView);
    leftView.webContents.loadFile('left.html'); // Load content into the view
    console.log('Left view opened.');
  }
  updateBrowserViewBounds(); // Update bounds after toggling
});

// Handler for toggling the right view
ipcMain.on('toggle-right-view', () => {
  if (!mainWindow) return;
  
  if (rightView) {
    // If right view exists, remove and destroy it
    mainWindow.removeBrowserView(rightView);
    rightView.webContents.destroy();
    rightView = null;
    console.log('Right view closed.');
  } else {
    // If right view does not exist, create and add it
    rightView = new BrowserView();
    mainWindow.addBrowserView(rightView);
    rightView.webContents.loadFile('right.html'); // Load content into the view
    console.log('Right view opened.');
  }
  updateBrowserViewBounds(); // Update bounds after toggling
});

// --- IPC Handler for Resizing Views ---
// Handler for receiving updated panel widths from the renderer process
ipcMain.on('update-view-bounds', (event, widths) => {
    panelWidths = widths; // Store the new panel widths
    updateBrowserViewBounds(); // Update BrowserView bounds based on new widths
});

// IPC Handler for side panel visibility changes
ipcMain.on('side-panel-toggled', (event, isHidden) => {
    isSidePanelHidden = isHidden; // Update the side panel visibility state
    updateBrowserViewBounds(); // Re-calculate and update BrowserView bounds
});
