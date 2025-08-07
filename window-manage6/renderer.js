
document.addEventListener('DOMContentLoaded', () => {
    const workspace = document.getElementById('workspace');
    const tools = document.querySelectorAll('.tool');
    let activePopup = null; // To keep track of the currently displayed popup
    let hideTimeout = null; // To manage delayed hiding of the popup

    // --- Drag-and-drop functionality for sub-tools ---
    // This part handles the actual dragging and dropping onto the workspace.
    // It needs to be set up for both the original template sub-tools (though they are hidden)
    // and crucially, for the cloned sub-tools that appear in the popup.
    // The dragstart/dragend listeners are re-attached when cloning.

    // Workspace event listeners for dropping
    workspace.addEventListener('dragover', (event) => {
        event.preventDefault(); // Essential to allow a drop
        event.dataTransfer.dropEffect = 'copy'; // Visual feedback for 'copy' operation
        workspace.classList.add('drop-highlight'); // Add visual highlight to workspace
    });

    workspace.addEventListener('dragleave', () => {
        workspace.classList.remove('drop-highlight'); // Remove highlight when drag leaves
    });

    workspace.addEventListener('drop', (event) => {
        event.preventDefault(); // Prevent default drop behavior (e.g., opening file)
        workspace.classList.remove('drop-highlight'); // Remove highlight

        const toolName = event.dataTransfer.getData('text/plain'); // Get the data (tool name)

        // Create a new element to represent the dropped tool in the workspace
        const newToolElement = document.createElement('div');
        newToolElement.textContent = toolName;
        newToolElement.classList.add('dropped-tool');

        workspace.appendChild(newToolElement); // Add the new tool to the workspace
    });

    // --- New logic for displaying sub-tools on hover in the right panel ---
    tools.forEach(tool => {
        // When mouse enters a main tool
        tool.addEventListener('mouseenter', (event) => {
            // Clear any pending hide timeouts to prevent immediate disappearance
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // If there's an active popup from a *different* tool, remove it
            if (activePopup && activePopup.parentElement) {
                activePopup.remove();
                activePopup = null;
            }

            const subToolsContainer = tool.querySelector('.sub-tools-container');
            if (subToolsContainer) {
                const popup = document.createElement('div');
                popup.classList.add('sub-tool-popup');

                // Clone each sub-tool from the hidden template and append to the popup
                Array.from(subToolsContainer.children).forEach(subTool => {
                    const clonedSubTool = subTool.cloneNode(true); // Deep clone the element

                    // IMPORTANT: Re-attach drag listeners to the cloned elements
                    clonedSubTool.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', e.target.textContent);
                        e.dataTransfer.effectAllowed = 'copy';
                        e.target.classList.add('dragging');
                    });
                    clonedSubTool.addEventListener('dragend', (e) => {
                        e.target.classList.remove('dragging');
                    });
                    popup.appendChild(clonedSubTool);
                });

                // Calculate vertical position of the popup relative to the workspace
                const toolRect = tool.getBoundingClientRect(); // Position of the hovered tool
                const workspaceRect = workspace.getBoundingClientRect(); // Position of the workspace

                // Align the top of the popup with the top of the hovered tool
                // Adjust for workspace's own top offset
                let topPosition = toolRect.top - workspaceRect.top;

                // Optional: Add a small vertical offset for visual spacing
                topPosition += 10;

                // Apply the calculated position to the popup
                popup.style.top = `${topPosition}px`;
                popup.style.left = '20px'; // Fixed left offset from the workspace's left edge

                workspace.appendChild(popup); // Add the popup to the workspace
                activePopup = popup; // Set this as the currently active popup

                // Add mouseleave listener to the popup itself
                // This allows the user to move the mouse onto the popup without it disappearing
                popup.addEventListener('mouseleave', () => {
                    hideTimeout = setTimeout(() => {
                        if (activePopup && activePopup.parentElement) {
                            activePopup.remove();
                            activePopup = null;
                        }
                    }, 100); // Small delay before hiding
                });
                // If mouse re-enters the popup, clear the hide timeout
                popup.addEventListener('mouseenter', () => {
                    if (hideTimeout) {
                        clearTimeout(hideTimeout);
                        hideTimeout = null;
                    }
                });
            }
        });

        // When mouse leaves a main tool
        tool.addEventListener('mouseleave', () => {
            // Set a timeout to hide the popup. This delay is crucial
            // to allow the user to move their cursor from the tool
            // to the sub-tool popup without the popup disappearing.
            hideTimeout = setTimeout(() => {
                // Only hide if the mouse hasn't re-entered the popup
                if (activePopup && activePopup.parentElement) {
                    activePopup.remove();
                    activePopup = null;
                }
            }, 100); // Small delay (e.g., 100 milliseconds)
        });
    });
});
