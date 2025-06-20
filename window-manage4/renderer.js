document.addEventListener('DOMContentLoaded', () => {
    const sidePanel = document.getElementById('sidePanel');
    const panelItems = document.querySelectorAll('.panel-item');
    const pinToggleButton = document.getElementById('pinToggleButton'); // Now targets the <a> tag
    const mainContent = document.getElementById('mainContent');

    let isPinned = false; // New state variable to track if the panel is pinned

    pinToggleButton.addEventListener('click', () => {
        isPinned = !isPinned; // Toggle the pinned state
        updatePanelState(); // Update the panel's appearance
    });

    // Add event listeners for hover (mouseenter and mouseleave)
    sidePanel.addEventListener('mouseenter', () => {
        if (!isPinned) {
            sidePanel.classList.add('open');
        }
    });

    sidePanel.addEventListener('mouseleave', () => {
        if (!isPinned) {
            sidePanel.classList.remove('open');
        }
    });

    window.addEventListener('keydown', (event) => {
        const isKeyPin = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b';
        if(isKeyPin){
            isPinned = !isPinned;
            updatePanelState();

        }
    })
    
    // Add click event listeners to each panel item
    panelItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior
            const action = item.getAttribute('data-action');
            if (action) {
                console.log(`Action clicked: ${action}`);
                // You can add your Electron IPC (Inter-Process Communication)
                // calls here to interact with the main process.
                // For this demo, we'll just log to the console.

                showMessageBox(`You clicked: ${action.charAt(0).toUpperCase() + action.slice(1)}`);
            }
        });
    });

    function updatePanelState() {
        if (isPinned) {
            sidePanel.classList.add('open', 'pinned'); // Add 'pinned' class when pinned(does the class pinned not used)
            mainContent.classList.add('pushed');
            pinToggleButton.classList.add('active'); // Activate pin icon visual
        } else {
            sidePanel.classList.remove('open', 'pinned'); // Remove 'pinned' class
            mainContent.classList.remove('pushed');
            pinToggleButton.classList.remove('active'); // Deactivate pin icon visual
        }
    }

    /**
     * Displays a custom message box instead of using alert().
     * @param {string} message The message to display.
     */
    function showMessageBox(message) {
        let messageBox = document.getElementById('messageBox');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'messageBox';
            // Apply styles directly or via classes matching style.css
            messageBox.className = 'message-box-overlay';
            messageBox.innerHTML = `
                <div class="message-box-content">
                    <p class="message-box-text">${message}</p>
                    <button id="messageBoxClose" class="message-box-button">
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('messageBoxClose').addEventListener('click', () => {
                messageBox.classList.remove('message-box-active');
                // is As
                setTimeout(() => messageBox.remove(), 300); // Remove after transition
            });
        }
        // Show the message box
        messageBox.classList.add('message-box-active');
    }
});