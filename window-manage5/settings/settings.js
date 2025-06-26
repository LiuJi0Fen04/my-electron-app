(async() => {
    // Get references to all necessary DOM elements
    const navItems = document.querySelectorAll('.nav-item'); // All navigation links in the sidebar
    const settingsSections = document.querySelectorAll('.settings-section'); // All content sections on the right
    const downloadPathInput = document.getElementById('downloadPath'); // Input field for download path
    const changeDownloadPathBtn = document.getElementById('changeDownloadPathBtn'); // Button to change download path
    const languageSelect = document.getElementById('languageSelect'); // Dropdown for language selection
    const themeToggle = document.getElementById('themeToggle'); // Checkbox for dark mode
    const fontSizeRange = document.getElementById('fontSize'); // Range slider for font size
    const currentFontSizeSpan = document.getElementById('currentFontSize'); // Span to display current font size

    /**
     * Shows the specified settings section and updates the active navigation item.
     * @param {string} sectionId - The ID of the section to show (e.g., 'downloads', 'languages').
     */
    const showSection = (sectionId) => {
        // Hide all settings sections first
        settingsSections.forEach(section => {
            section.classList.add('hidden'); // Add 'hidden' class to hide the section
            section.classList.remove('active'); // Remove 'active' class (if previously set for JS logic)
        });

        // Show the target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden'); // Remove 'hidden' class to show the section
            targetSection.classList.add('active'); // Add 'active' class (useful for styling or other JS logic)
        }

        // Update active navigation item styling
        navItems.forEach(item => {
            if (item.dataset.section === sectionId) {
                item.classList.add('active'); // Add 'active' class to the clicked navigation item
            } else {
                item.classList.remove('active'); // Remove 'active' class from other navigation items
            }
        });
    };

    // Add event listeners to navigation items
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior (page reload)
            const section = e.target.dataset.section; // Get the data-section attribute value
            showSection(section); // Call the function to show the corresponding section
        });
    });

    // Event listener for the "Change Download Path" button
    changeDownloadPathBtn.addEventListener('click', () => {
        // In a real Electron app, this would typically involve Inter-Process Communication (IPC)
        // to interact with the main process to open a native file dialog (e.g., dialog.showOpenDialog).
        // For this purely client-side example, we'll use a simple browser prompt.

        // Example for a real Electron app (assuming a preload script exposes window.electronAPI):
        // window.electronAPI.openDirectoryDialog().then(path => {
        //     if (path) {
        //         downloadPathInput.value = path;
        //         // Send this path to the main process for persistent storage
        //         // window.electronAPI.saveSetting('downloadPath', path);
        //     }
        // });

        // For demonstration purposes only (simple prompt):
        const newPath = prompt("Enter new download path (e.g., D:\\NewDownloads):", downloadPathInput.value);
        if (newPath) {
            downloadPathInput.value = newPath;
            console.log(`Download path changed to: ${newPath}`);
            // In a real Electron app, you'd save this setting persistently via IPC
        }
    });

    // Event listener for language selection
    languageSelect.addEventListener('change', (e) => {
        const selectedLanguage = e.target.value;
        console.log(`Language changed to: ${selectedLanguage}`);
        // In a real Electron app, this would likely involve:
        // 1. Saving the preference via IPC to the main process.
        // 2. Potentially reloading the renderer process or the entire app to apply the language change.
    });

    // Event listener for dark mode toggle
    themeToggle.addEventListener('change', (e) => {
        const isDarkMode = e.target.checked;
        console.log(`Dark mode: ${isDarkMode ? 'Enabled' : 'Disabled'}`);
        // In a real Electron app, you might:
        // 1. Add/remove a 'dark-mode' class to the <body> or <html> element.
        // 2. Save this preference persistently via IPC.
    });

    // Event listener for font size range slider
    fontSizeRange.addEventListener('input', (e) => {
        const fontSize = e.target.value;
        currentFontSizeSpan.textContent = fontSize; // Update the displayed font size
        console.log(`Font size: ${fontSize}px`);
        // In a real Electron app, you might:
        // 1. Apply this as a CSS variable to the root element (e.g., document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`)).
        // 2. Save this preference persistently via IPC.
    });

    // Initialize: Show the 'Downloads' section when the page loads
    // This ensures that one section is visible by default.
    showSection('downloads');
})();