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
    // resizer is the three resizer
    function startResizing(e, resizer) {
        isResizing = true;
        activeResizer = resizer;
        activeResizer.classList.add('active');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = resizer.style.cursor;
        // Temporarily disable image interaction during panel resize
        imageCanvas.removeEventListener('mousedown', handleCanvasMouseDown);
        imageCanvas.removeEventListener('mousemove', handleCanvasMouseMove);
        imageCanvas.removeEventListener('mouseup', handleCanvasMouseUp);
        imageCanvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
        imageCanvas.removeEventListener('wheel', handleCanvasWheel);
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
            console.log('containerRect.width', containerRect.width);
            console.log('newLeftWidth', newLeftWidth);
            console.log('leftMiddleResizer.offsetWidth', leftMiddleResizer.offsetWidth);
            console.log('middleRightResizer.offsetWidth', middleRightResizer.offsetWidth);            
            console.log('currentMiddleWidth', currentMiddleWidth);
            console.log('currentRightWidth', currentRightWidth);
            console.log('currentMiddleWidth + currentRightWidth', currentMiddleWidth + currentRightWidth);
            console.log('remainingWidth', remainingWidth);
            if (currentMiddleWidth + currentRightWidth > remainingWidth) {
                newLeftWidth = Math.min(newLeftWidth, containerRect.width - (minPanelWidth * 2 + leftMiddleResizer.offsetWidth + middleRightResizer.offsetWidth));
            }
            console.log('newLeftWidth', newLeftWidth);

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

            resizeCanvas(false); // Resize canvas when its parent container changes size, but don't reset image state
        }
    }

    function stopResizing() {
        isResizing = false;
        if (activeResizer) {
            activeResizer.classList.remove('active');
            // if (activeResizer === middleRightResizer) {
            //     middlePanel.style.width = '';
            //     middlePanel.style.flexGrow = 1;
            // }
        }
        activeResizer = null;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        resizeCanvas(false); // Ensure canvas is redrawn after layout changes settle, but don't reset image state

        // Re-enable image interaction after panel resize
        imageCanvas.addEventListener('mousedown', handleCanvasMouseDown);
        imageCanvas.addEventListener('mousemove', handleCanvasMouseMove);
        imageCanvas.addEventListener('mouseup', handleCanvasMouseUp);
        imageCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
        imageCanvas.addEventListener('wheel', handleCanvasWheel);
    }

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('mouseleave', stopResizing);

    // --- IPC Communication (Removed settings button, keeping message button) ---
    // Removed settingsBtn listener as the button is gone

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

    // --- Image Viewer & Drawing Logic ---
    const openFolderBtn = document.getElementById('open-folder-btn');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    const addRectangleToolBtn = document.getElementById('rectangle-tool');
    const addCircleToolBtn = document.getElementById('circle-tool');
    const panToolBtn = document.getElementById('pan-tool');
    const defaultToolBtn = document.getElementById('default-tool'); // For zoom/pan mode
    const clearShapesBtn = document.getElementById('clear-shapes-btn');

    let loadedImages = [];
    let currentImageIndex = -1;

    // Drawing State Variables
    let currentTool = 'default'; // 'default', 'rectangle', 'circle', 'pan' (pan is part of default)
    let isDrawing = false;
    let startPoint = { x: 0, y: 0 };
    let shapes = []; // Array to store drawn shapes for the current image: {type: 'rect'/'circle', x, y, width, height OR radius}
    let drawingColor = '#FF0000'; // Default drawing color (red)
    let drawingLineWidth = 2; // Default line width

    const ZOOM_FACTOR = 0.1;

    // --- Utility Functions for Canvas Coordinates ---

    // Converts canvas coordinates (0 to canvas.width/height) to image coordinates (0 to image.width/height)
    function canvasToImageCoords(canvasX, canvasY, image, imageDrawInfo) {
        const { drawX, drawY, zoomedWidth, zoomedHeight } = imageDrawInfo;

        const imgX = (canvasX - drawX) / zoomedWidth * image.width;
        const imgY = (canvasY - drawY) / zoomedHeight * image.height;

        return { x: imgX, y: imgY };
    }

    // Converts image coordinates to canvas coordinates
    function imageToCanvasCoords(imgX, imgY, image, imageDrawInfo) {
        const { drawX, drawY, zoomedWidth, zoomedHeight } = imageDrawInfo;

        const canvasX = drawX + (imgX / image.width) * zoomedWidth;
        const canvasY = drawY + (imgY / image.height) * zoomedHeight;

        return { x: canvasX, y: canvasY };
    }

    // --- Canvas Drawing Functions ---

    function resizeCanvas(resetZoomPan = true) {
        const parent = imageCanvas.parentElement;
        imageCanvas.width = parent.clientWidth;
        imageCanvas.height = parent.clientHeight;

        if (resetZoomPan) {
            if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
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

    // Draw image and all associated shapes on canvas
    function drawImageOnCanvas(image) {
        if (!image || !ctx || currentImageIndex === -1) return;

        const currentState = loadedImages[currentImageIndex].state;
        const zoomLevel = currentState.zoom;
        const panX = currentState.panX;
        const panY = currentState.panY;
        const currentShapes = loadedImages[currentImageIndex].shapes; // Get shapes for this image

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

        // Store current image drawing info for coordinate conversions
        const imageDrawInfo = { drawX, drawY, zoomedWidth, zoomedHeight };
        if (loadedImages[currentImageIndex]) {
            loadedImages[currentImageIndex].drawInfo = imageDrawInfo;
        }

        // Draw the image
        ctx.drawImage(image, drawX, drawY, zoomedWidth, zoomedHeight);

        // Draw existing shapes
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = drawingLineWidth;
        currentShapes.forEach(shape => {
            const canvasCoordsStart = imageToCanvasCoords(shape.startX, shape.startY, image, imageDrawInfo);
            
            if (shape.type === 'rectangle') {
                const canvasCoordsEnd = imageToCanvasCoords(shape.endX, shape.endY, image, imageDrawInfo);
                const rectX = Math.min(canvasCoordsStart.x, canvasCoordsEnd.x);
                const rectY = Math.min(canvasCoordsStart.y, canvasCoordsEnd.y);
                const rectWidth = Math.abs(canvasCoordsStart.x - canvasCoordsEnd.x);
                const rectHeight = Math.abs(canvasCoordsStart.y - canvasCoordsEnd.y);
                ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            } else if (shape.type === 'circle') {

                const radius = shape.radius / image.width * zoomedWidth;
                ctx.beginPath();
                ctx.arc(canvasCoordsStart.x, canvasCoordsStart.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });
    }

    function displayImage(index) {
        if (index < 0 || index >= loadedImages.length) return;

        currentImageIndex = index;
        const currentImageInfo = loadedImages[currentImageIndex];

        if (!currentImageInfo.state) {
            currentImageInfo.state = { zoom: 1.0, panX: 0, panY: 0 };
        }
        if (!currentImageInfo.shapes) { // Initialize shapes array for new images
            currentImageInfo.shapes = [];
        }

        drawImageOnCanvas(currentImageInfo.img);

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

    // --- Canvas Event Handlers (Unified for Pan/Zoom/Draw) ---

    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function handleCanvasMouseDown(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        const mousePos = getMousePos(imageCanvas, e);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (currentTool === 'default') {
            if (e.button === 0 && loadedImages[currentImageIndex].state.zoom > 1.0) { // Left click and zoomed in
                isDraggingImage = true;
                imageCanvas.style.cursor = 'grabbing';
            }
        } else if (currentTool === 'rectangle' || currentTool === 'circle') {
            if (e.button === 0) { // Left click to start drawing
                isDrawing = true;
                startPoint = canvasToImageCoords(mousePos.x, mousePos.y, 
                                                loadedImages[currentImageIndex].img, 
                                                loadedImages[currentImageIndex].drawInfo);
            }
        }
    }

    function handleCanvasMouseMove(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        const mousePos = getMousePos(imageCanvas, e);

        if (currentTool === 'default' && isDraggingImage) {
            const currentState = loadedImages[currentImageIndex].state;
            const image = loadedImages[currentImageIndex].img;

            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            currentState.panX += deltaX;
            currentState.panY += deltaY;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            drawImageOnCanvas(image);
        } else if ((currentTool === 'rectangle' || currentTool === 'circle') && isDrawing) {
            const currentImage = loadedImages[currentImageIndex].img;
            const currentDrawInfo = loadedImages[currentImageIndex].drawInfo;
            const endPoint = canvasToImageCoords(mousePos.x, mousePos.y, currentImage, currentDrawInfo);

            drawImageOnCanvas(currentImage); // Redraw image and existing shapes

            ctx.strokeStyle = drawingColor;
            ctx.lineWidth = drawingLineWidth;
            
            if (currentTool === 'rectangle') {
                const rectX = Math.min(startPoint.x, endPoint.x);
                const rectY = Math.min(startPoint.y, endPoint.y);
                const rectWidth = Math.abs(startPoint.x - endPoint.x);
                const rectHeight = Math.abs(startPoint.y - endPoint.y);

                const canvasRectStart = imageToCanvasCoords(rectX, rectY, currentImage, currentDrawInfo);
                const canvasRectEnd = imageToCanvasCoords(rectX + rectWidth, rectY + rectHeight, currentImage, currentDrawInfo);

                ctx.strokeRect(canvasRectStart.x, canvasRectStart.y, 
                                Math.abs(canvasRectStart.x - canvasRectEnd.x), 
                                Math.abs(canvasRectStart.y - canvasRectEnd.y));
            } else if (currentTool === 'circle') {
                // Calculate radius from startPoint to current mouse position in image coords
                const radiusX = Math.abs(startPoint.x - endPoint.x);
                const radiusY = Math.abs(startPoint.y - endPoint.y);
                const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY); // Pythagorean theorem for true radius

                const canvasCenter = imageToCanvasCoords(startPoint.x, startPoint.y, currentImage, currentDrawInfo);
                const canvasRadiusPoint = imageToCanvasCoords(startPoint.x + radius, startPoint.y, currentImage, currentDrawInfo);
                const canvasRadius = Math.abs(canvasCenter.x - canvasRadiusPoint.x); // Radius in canvas coordinates

                ctx.beginPath();
                ctx.arc(canvasCenter.x, canvasCenter.y, canvasRadius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
    }

    function handleCanvasMouseUp(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        if (currentTool === 'default' && isDraggingImage) {
            isDraggingImage = false;
            imageCanvas.style.cursor = 'grab';
        } else if ((currentTool === 'rectangle' || currentTool === 'circle') && isDrawing) {
            isDrawing = false;
            const mousePos = getMousePos(imageCanvas, e);
            const endPoint = canvasToImageCoords(mousePos.x, mousePos.y, 
                                                loadedImages[currentImageIndex].img, 
                                                loadedImages[currentImageIndex].drawInfo);

            // Save the finished shape in image coordinates
            const currentShapes = loadedImages[currentImageIndex].shapes;
            if (currentTool === 'rectangle') {
                currentShapes.push({
                    type: 'rectangle',
                    startX: startPoint.x,
                    startY: startPoint.y,
                    endX: endPoint.x,
                    endY: endPoint.y
                });
            } else if (currentTool === 'circle') {
                const radiusX = Math.abs(startPoint.x - endPoint.x);
                const radiusY = Math.abs(startPoint.y - endPoint.y);
                const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY); // Pythagorean theorem

                currentShapes.push({
                    type: 'circle',
                    startX: startPoint.x, // Center X
                    startY: startPoint.y, // Center Y
                    radius: radius // Radius in image coordinates
                });
            }
            drawImageOnCanvas(loadedImages[currentImageIndex].img); // Redraw with new shape saved
        }
    }

    function handleCanvasMouseLeave() {
        if (currentTool === 'default') {
            isDraggingImage = false;
            imageCanvas.style.cursor = 'grab';
        } else if (currentTool === 'rectangle' || currentTool === 'circle') {
            isDrawing = false; // Cancel drawing if mouse leaves
            drawImageOnCanvas(loadedImages[currentImageIndex].img); // Redraw to clear temporary drawing
        }
    }

    function handleCanvasWheel(e) {
        e.preventDefault();

        if (currentImageIndex === -1 || !loadedImages[currentImageIndex] || isDrawing) return; // Don't zoom while drawing

        const currentState = loadedImages[currentImageIndex].state;
        const image = loadedImages[currentImageIndex].img;

        const scale = Math.exp(-e.deltaY * 0.001 * ZOOM_FACTOR);
        const oldZoomLevel = currentState.zoom;
        currentState.zoom = Math.max(0.1, currentState.zoom * scale);

        const mouseX = e.clientX - imageCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - imageCanvas.getBoundingClientRect().top;

        currentState.panX = mouseX - ((mouseX - currentState.panX) * (currentState.zoom / oldZoomLevel));
        currentState.panY = mouseY - ((mouseY - currentState.panY) * (currentState.zoom / oldZoomLevel));

        drawImageOnCanvas(image);
    }

    // --- Tool Selection ---
    function setActiveTool(tool) {
        currentTool = tool;
        // Remove active class from all tools
        document.querySelectorAll('.tool-area').forEach(btn => btn.classList.remove('active'));
        // Add active class to the selected tool
        document.getElementById(`${tool}-tool`).classList.add('active');

        // Set cursor based on tool
        if (tool === 'rectangle' || tool === 'circle') {
            imageCanvas.style.cursor = 'crosshair';
        } else {
            imageCanvas.style.cursor = 'grab'; // Default pan/zoom cursor
        }
        // Ensure image is redrawn to apply cursor change
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            //  drawImageOnCanvas(loadedImages[currentImageIndex].img);
        }
    }

    addRectangleToolBtn.addEventListener('click', () => setActiveTool('rectangle'));
    addCircleToolBtn.addEventListener('click', () => setActiveTool('circle'));
    panToolBtn.addEventListener('click', () => setActiveTool('pan')); // New 'pan' tool, which also means default mode
    defaultToolBtn.addEventListener('click', () => setActiveTool('default')); // Re-added default mode for zoom/pan/select
    
    // Clear Shapes Button
    clearShapesBtn.addEventListener('click', () => {
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            loadedImages[currentImageIndex].shapes = []; // Clear shapes for current image
            drawImageOnCanvas(loadedImages[currentImageIndex].img); // Redraw
        }
    });

    // --- Initial setup and event listeners ---
    openFolderBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openImageFolder();
        if (result.success && result.images.length > 0) {
            loadedImages = []; // Clear previous images and states
            thumbnailGallery.innerHTML = '';

            const loadingPromises = result.images.map((dataUrl, index) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        loadedImages[index] = {
                            img: img,
                            state: { zoom: 1.0, panX: 0, panY: 0 },
                            shapes: [] // Each image now has its own array of shapes
                        };

                        const thumbnailDiv = document.createElement('div');
                        thumbnailDiv.classList.add('thumbnail-item');
                        const thumbnailImg = document.createElement('img');
                        thumbnailImg.src = dataUrl;
                        thumbnailDiv.appendChild(thumbnailImg);
                        thumbnailGallery.appendChild(thumbnailDiv);

                        thumbnailDiv.addEventListener('click', () => {
                            displayImage(index);
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
            // promise: when all the image is loaded into thumbnail, the code run into this snippet
            Promise.all(loadingPromises).then(() => {
                if (loadedImages.length > 0) {
                    displayImage(0);
                    setActiveTool('default'); // Default to pan/zoom after loading images
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

    // Attach all canvas interaction listeners
    imageCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    imageCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    imageCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    imageCanvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    imageCanvas.addEventListener('wheel', handleCanvasWheel);


    // Initial canvas resize and tool activation
    window.addEventListener('resize', () => resizeCanvas(true)); // no channel called resizer
    resizeCanvas(true);
    setActiveTool('default'); // Set default tool on initial load
});