document.addEventListener('DOMContentLoaded', () => {
    // --- Resizer Elements (No Change) ---
    const leftPanel = document.querySelector('.left-panel');
    const middlePanel = document.querySelector('.middle-panel');
    const rightPanelsContainer = document.querySelector('.right-panels-container');
    const rightTopPanel = document.querySelector('.right-top-panel');
    const rightBottomPanel = document.querySelector('.right-bottom-panel');
    const container = document.querySelector('.container');

    const leftMiddleResizer = document.getElementById('left-middle-resizer');
    const middleRightResizer = document.getElementById('middle-right-resizer');
    const rightTopBottomResizer = document.getElementById('right-top-bottom-resizer');

    let isResizing = false;
    let activeResizer = null;

    function startResizing(e, resizer) {
        isResizing = true;
        activeResizer = resizer;
        activeResizer.classList.add('active');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = resizer.style.cursor;
    }

    function resize(e) {
        if (!isResizing || !activeResizer) return;

        const containerRect = container.getBoundingClientRect();
        const minPanelWidth = 100;
        const minPanelHeight = 50;

        if (activeResizer === leftMiddleResizer) {
            let newLeftWidth = e.clientX - containerRect.left;
            newLeftWidth = Math.max(minPanelWidth, newLeftWidth);
            const remainingWidth = containerRect.width - newLeftWidth - leftMiddleResizer.offsetWidth - middleRightResizer.offsetWidth;
            const currentMiddleWidth = middlePanel.getBoundingClientRect().width;
            const currentRightWidth = rightPanelsContainer.getBoundingClientRect().width;

            if (currentMiddleWidth + currentRightWidth > remainingWidth) {
                newLeftWidth = Math.min(newLeftWidth, containerRect.width - (minPanelWidth * 2 + leftMiddleResizer.offsetWidth + middleRightResizer.offsetWidth));
            }

            leftPanel.style.width = `${newLeftWidth}px`;

        } else if (activeResizer === middleRightResizer) {
            const leftWidth = leftPanel.getBoundingClientRect().width;
            let newMiddleWidth = e.clientX - leftWidth - leftMiddleResizer.offsetWidth - containerRect.left;

            newMiddleWidth = Math.max(minPanelWidth, newMiddleWidth);
            const availableForMiddleAndRight = containerRect.width - leftWidth - leftMiddleResizer.offsetWidth - middleRightResizer.offsetWidth;
            const currentRightWidth = rightPanelsContainer.getBoundingClientRect().width;

            if (newMiddleWidth + minPanelWidth > availableForMiddleAndRight) {
                newMiddleWidth = availableForMiddleAndRight - minPanelWidth;
            }

            middlePanel.style.width = `${newMiddleWidth}px`;
            middlePanel.style.flexGrow = 0;

        } else if (activeResizer === rightTopBottomResizer) {
            const rightContainerRect = rightPanelsContainer.getBoundingClientRect();
            let newTopHeight = e.clientY - rightContainerRect.top;

            const maxTopHeight = rightContainerRect.height - minPanelHeight - rightTopBottomResizer.offsetHeight;

            const clampedTopHeight = Math.max(minPanelHeight, Math.min(newTopHeight, maxTopHeight));
            const clampedBottomHeight = rightContainerRect.height - clampedTopHeight - rightTopBottomResizer.offsetHeight;

            rightTopPanel.style.height = `${clampedTopHeight}px`;
            rightBottomPanel.style.height = `${clampedBottomHeight}px`;

            resizeCanvas(); // Resize canvas when its parent container changes size
        }
    }

    function stopResizing() {
        isResizing = false;
        if (activeResizer) {
            activeResizer.classList.remove('active');
            if (activeResizer === middleRightResizer) {
                middlePanel.style.width = '';
                middlePanel.style.flexGrow = 1;
            }
        }
        activeResizer = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        resizeCanvas(false); // Do not reset zoom/pan on general panel resize
    }

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('mouseleave', stopResizing);

    // --- IPC Communication (No Change) ---
    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
        window.electronAPI.openSettings();
    });

    const sendMessageBtn = document.getElementById('send-message-btn');
    const mainMessageDisplay = document.getElementById('main-message-display');
    sendMessageBtn.addEventListener('click', () => {
        const message = 'Hello from renderer process!';
        window.electronAPI.sendMessageToMain(message);
        mainMessageDisplay.textContent = 'Message sent to main process...';
    });

    window.electronAPI.onMessageFromMain((message) => {
        mainMessageDisplay.textContent = `Received from Main: ${message}`;
    });

    // --- Image Viewer Logic (MAJOR CHANGES HERE) ---
    const openFolderBtn = document.getElementById('open-folder-btn');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    let currentImages = []; // Array of base64 data URLs (not directly used after loading)
    let loadedImages = [];  // Array of objects { img: ImageObject, state: { zoom: 1.0, panX: 0, panY: 0 } }
    let currentImageIndex = -1;

    // These will now be properties of the current image's state object
    // let zoomLevel = 1.0;
    // let panX = 0;
    // let panY = 0;

    let isDraggingImage = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const ZOOM_FACTOR = 0.1;

    // Function to resize canvas to fit its parent container
    // Added a parameter 'resetZoomPan' to control whether to reset or maintain state
    function resizeCanvas(resetZoomPan = true) {
        const parent = imageCanvas.parentElement;
        imageCanvas.width = parent.clientWidth;
        imageCanvas.height = parent.clientHeight;

        if (resetZoomPan) {
            // This is for initial load or full window resize, not for internal panel resizes
            if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
                 // Update the current image's state, but don't reset it
                loadedImages[currentImageIndex].state.zoom = 1.0;
                loadedImages[currentImageIndex].state.panX = 0;
                loadedImages[currentImageIndex].state.panY = 0;
            }
        }
        
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            drawImageOnCanvas(loadedImages[currentImageIndex].img);
        } else {
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        }
    }

    // Draw image on canvas with zoom and pan
    function drawImageOnCanvas(image) {
        if (!image || !ctx || currentImageIndex === -1) return;

        const currentState = loadedImages[currentImageIndex].state;
        const zoomLevel = currentState.zoom;
        const panX = currentState.panX;
        const panY = currentState.panY;

        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

        const canvasWidth = imageCanvas.width;
        const canvasHeight = imageCanvas.height;
        const imageWidth = image.width;
        const imageHeight = image.height;

        const canvasAspectRatio = canvasWidth / canvasHeight;
        const imageAspectRatio = imageWidth / imageHeight;

        let fittedWidth, fittedHeight;

        if (imageAspectRatio > canvasAspectRatio) {
            fittedWidth = canvasWidth;
            fittedHeight = canvasWidth / imageAspectRatio;
        } else {
            fittedHeight = canvasHeight;
            fittedWidth = canvasHeight * imageAspectRatio;
        }

        const zoomedWidth = fittedWidth * zoomLevel;
        const zoomedHeight = fittedHeight * zoomLevel;

        const initialX = (canvasWidth - fittedWidth) / 2;
        const initialY = (canvasHeight - fittedHeight) / 2;

        const drawX = initialX + panX;
        const drawY = initialY + panY;

        ctx.drawImage(image, drawX, drawY, zoomedWidth, zoomedHeight);
    }

    function displayImage(index) {
        if (index < 0 || index >= loadedImages.length) return;

        // Save current image's state if an image was previously displayed
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            // State is already updated by wheel/mousemove listeners, no need to manually save here
            // Just ensure currentImageIndex points to the previous image to save its state
        }

        currentImageIndex = index;
        const currentImage = loadedImages[currentImageIndex];

        // If this image has no state yet (first time viewing it), initialize it
        if (!currentImage.state) {
            currentImage.state = { zoom: 1.0, panX: 0, panY: 0 };
        }
        // Now, draw the image using its specific stored state
        drawImageOnCanvas(currentImage.img);

        // Update active thumbnail
        const thumbnails = thumbnailGallery.querySelectorAll('.thumbnail-item');
        thumbnails.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // --- Zoom and Pan Event Listeners ---

    imageCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        const currentState = loadedImages[currentImageIndex].state;
        const image = loadedImages[currentImageIndex].img;

        const scale = Math.exp(-e.deltaY * 0.001 * ZOOM_FACTOR);
        const oldZoomLevel = currentState.zoom;
        currentState.zoom = Math.max(0.1, currentState.zoom * scale); // Update state directly

        const mouseX = e.clientX - imageCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - imageCanvas.getBoundingClientRect().top;

        // Adjust pan offsets to zoom towards/from the mouse cursor
        currentState.panX = mouseX - ((mouseX - currentState.panX) * (currentState.zoom / oldZoomLevel));
        currentState.panY = mouseY - ((mouseY - currentState.panY) * (currentState.zoom / oldZoomLevel));

        drawImageOnCanvas(image);
    });

    imageCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 && currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            const currentState = loadedImages[currentImageIndex].state;
            if (currentState.zoom > 1.0) { // Only drag if zoomed in
                isDraggingImage = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                imageCanvas.style.cursor = 'grabbing';
            }
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (isDraggingImage) {
            if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return; // Safety check

            const currentState = loadedImages[currentImageIndex].state;
            const image = loadedImages[currentImageIndex].img;

            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            currentState.panX += deltaX; // Update state directly
            currentState.panY += deltaY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            drawImageOnCanvas(image);
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        isDraggingImage = false;
        imageCanvas.style.cursor = 'grab';
    });

    imageCanvas.addEventListener('mouseleave', () => {
        isDraggingImage = false;
        imageCanvas.style.cursor = 'grab';
    });

    imageCanvas.style.cursor = 'grab'; // Set default cursor for when not dragging

    openFolderBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openImageFolder();
        if (result.success && result.images.length > 0) {
            currentImages = result.images; // These are just dataURLs, not Image objects with state
            loadedImages = []; // Clear previous loaded images and states
            thumbnailGallery.innerHTML = '';

            const loadingPromises = currentImages.map((dataUrl, index) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        // Store image object along with its initial state
                        loadedImages[index] = {
                            img: img,
                            state: { zoom: 1.0, panX: 0, panY: 0 } // Initialize state for each image
                        };

                        const thumbnailDiv = document.createElement('div');
                        thumbnailDiv.classList.add('thumbnail-item');
                        const thumbnailImg = document.createElement('img');
                        thumbnailImg.src = dataUrl;
                        thumbnailDiv.appendChild(thumbnailImg);
                        thumbnailGallery.appendChild(thumbnailDiv);

                        thumbnailDiv.addEventListener('click', () => {
                            displayImage(index); // Use displayImage function to show and activate thumbnail
                        });
                        resolve();
                    };
                    img.onerror = (e) => {
                        console.error(`Error loading image at index ${index}:`, e);
                        reject();
                    };
                    img.src = dataUrl;
                });
            });

            Promise.all(loadingPromises).then(() => {
                if (loadedImages.length > 0) {
                    displayImage(0); // Display the first image, which will use its initial state
                }
            }).catch(error => {
                console.error("One or more images failed to load:", error);
            });

        } else if (result.error) {
            console.error('Error opening folder:', result.error);
            alert(`Error opening folder: ${result.error}`);
        } else if (result.canceled) {
            console.log('Folder selection canceled.');
        }
    });

    // Initial canvas resize on load
    window.addEventListener('resize', () => resizeCanvas(true)); // Pass true for full window resize
    resizeCanvas(true); // Initial call, reset zoom/pan
});