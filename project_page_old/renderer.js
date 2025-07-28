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
        // Temporarily disable image viewer interaction during panel resize
        imageCanvas.removeEventListener('mousedown', handleImageCanvasMouseDown);
        imageCanvas.removeEventListener('mousemove', handleImageCanvasMouseMove);
        imageCanvas.removeEventListener('mouseup', handleImageCanvasMouseUp);
        imageCanvas.removeEventListener('mouseleave', handleImageCanvasMouseLeave);
        imageCanvas.removeEventListener('wheel', handleImageCanvasWheel);
        // Temporarily disable procedure canvas interaction during panel resize
        procedureCanvas.removeEventListener('mousedown', handleProcedureCanvasMouseDown);
        procedureCanvas.removeEventListener('mousemove', handleProcedureCanvasMouseMove);
        procedureCanvas.removeEventListener('mouseup', handleProcedureCanvasMouseUp);
        procedureCanvas.removeEventListener('wheel', handleProcedureCanvasWheel);
        procedureCanvas.removeEventListener('contextmenu', handleProcedureCanvasContextMenu);
        procedureCanvas.removeEventListener('dragover', handleProcedureCanvasDragOver); // Corrected: using named function
        procedureCanvas.removeEventListener('drop', handleProcedureCanvasDrop);       // Corrected: using named function
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

            resizeImageCanvas(false);
        }
        resizeProcedureCanvas(false);
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
        resizeImageCanvas(false);
        resizeProcedureCanvas(false);

        // Re-enable image viewer interaction after panel resize
        imageCanvas.addEventListener('mousedown', handleImageCanvasMouseDown);
        imageCanvas.addEventListener('mousemove', handleImageCanvasMouseMove);
        imageCanvas.addEventListener('mouseup', handleImageCanvasMouseUp);
        imageCanvas.addEventListener('mouseleave', handleImageCanvasMouseLeave);
        imageCanvas.addEventListener('wheel', handleImageCanvasWheel);
        // Re-enable procedure canvas interaction after panel resize
        procedureCanvas.addEventListener('mousedown', handleProcedureCanvasMouseDown);
        procedureCanvas.addEventListener('mousemove', handleProcedureCanvasMouseMove);
        procedureCanvas.addEventListener('mouseup', handleProcedureCanvasMouseUp);
        procedureCanvas.addEventListener('wheel', handleProcedureCanvasWheel);
        procedureCanvas.addEventListener('contextmenu', handleProcedureCanvasContextMenu);
        procedureCanvas.addEventListener('dragover', handleProcedureCanvasDragOver); // Corrected: using named function
        procedureCanvas.addEventListener('drop', handleProcedureCanvasDrop);       // Corrected: using named function
    }

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('mouseleave', stopResizing);

    // --- IPC Communication (No Change) ---
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

    // --- Image Viewer & Drawing Logic (Renamed functions to avoid conflict) ---
    const openFolderBtn = document.getElementById('open-folder-btn');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctxImage = imageCanvas.getContext('2d');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    const rectangleToolBtn = document.getElementById('rectangle-tool');
    const circleToolBtn = document.getElementById('circle-tool');
    const panToolBtn = document.getElementById('pan-tool');
    const defaultToolBtn = document.getElementById('default-tool');
    const clearShapesBtn = document.getElementById('clear-shapes-btn');

    let loadedImages = [];
    let currentImageIndex = -1;

    let currentTool = 'default';
    let isDrawing = false;
    let startPoint = { x: 0, y: 0 };
    let drawingColor = '#FF0000';
    let drawingLineWidth = 2;

    const IMAGE_VIEWER_ZOOM_FACTOR = 0.1;

    function getImageMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function imageCanvasToImageCoords(canvasX, canvasY, image, imageDrawInfo) {
        const { drawX, drawY, zoomedWidth, zoomedHeight } = imageDrawInfo;

        const imgX = (canvasX - drawX) / zoomedWidth * image.width;
        const imgY = (canvasY - drawY) / zoomedHeight * image.height;

        return { x: imgX, y: imgY };
    }

    function imageToImageCanvasCoords(imgX, imgY, image, imageDrawInfo) {
        const { drawX, drawY, zoomedWidth, zoomedHeight } = imageDrawInfo;

        const canvasX = drawX + (imgX / image.width) * zoomedWidth;
        const canvasY = drawY + (imgY / image.height) * zoomedHeight;

        return { x: canvasX, y: canvasY };
    }

    function resizeImageCanvas(resetZoomPan = true) {
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
            ctxImage.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        }
    }

    function drawImageOnCanvas(image) {
        if (!image || !ctxImage || currentImageIndex === -1) return;

        const currentState = loadedImages[currentImageIndex].state;
        const zoomLevel = currentState.zoom;
        const panX = currentState.panX;
        const panY = currentState.panY;
        const currentShapes = loadedImages[currentImageIndex].shapes;

        ctxImage.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

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

        const imageDrawInfo = { drawX, drawY, zoomedWidth, zoomedHeight };
        if (loadedImages[currentImageIndex]) {
            loadedImages[currentImageIndex].drawInfo = imageDrawInfo;
        }

        ctxImage.drawImage(image, drawX, drawY, zoomedWidth, zoomedHeight);

        ctxImage.strokeStyle = drawingColor;
        ctxImage.lineWidth = drawingLineWidth;
        currentShapes.forEach(shape => {
            const canvasCoordsStart = imageToImageCanvasCoords(shape.startX, shape.startY, image, imageDrawInfo);
            
            if (shape.type === 'rectangle') {
                const canvasCoordsEnd = imageToImageCanvasCoords(shape.endX, shape.endY, image, imageDrawInfo);
                const rectX = Math.min(canvasCoordsStart.x, canvasCoordsEnd.x);
                const rectY = Math.min(canvasCoordsStart.y, canvasCoordsEnd.y);
                const rectWidth = Math.abs(canvasCoordsStart.x - canvasCoordsEnd.x);
                const rectHeight = Math.abs(canvasCoordsStart.y - canvasCoordsEnd.y);
                ctxImage.strokeRect(rectX, rectY, rectWidth, rectHeight);
            } else if (shape.type === 'circle') {
                const scaleFactor = zoomedWidth / image.width;
                const radius = shape.radius * scaleFactor;

                ctxImage.beginPath();
                ctxImage.arc(canvasCoordsStart.x, canvasCoordsStart.y, radius, 0, 2 * Math.PI);
                ctxImage.stroke();
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
        if (!currentImageInfo.shapes) {
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

    // --- Canvas Event Handlers (Image Viewer) ---

    function handleImageCanvasMouseDown(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        const mousePos = getImageMousePos(imageCanvas, e);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (currentTool === 'default') {
            if (e.button === 0 && loadedImages[currentImageIndex].state.zoom > 1.0) {
                isDraggingImage = true;
                imageCanvas.style.cursor = 'grabbing';
            }
        } else if (currentTool === 'rectangle' || currentTool === 'circle') {
            if (e.button === 0) {
                isDrawing = true;
                startPoint = imageCanvasToImageCoords(mousePos.x, mousePos.y,
                                                loadedImages[currentImageIndex].img,
                                                loadedImages[currentImageIndex].drawInfo);
            }
        }
    }

    function handleImageCanvasMouseMove(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        const mousePos = getImageMousePos(imageCanvas, e);

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
            const endPoint = imageCanvasToImageCoords(mousePos.x, mousePos.y, currentImage, currentDrawInfo);

            drawImageOnCanvas(currentImage);

            ctxImage.strokeStyle = drawingColor;
            ctxImage.lineWidth = drawingLineWidth;
            
            if (currentTool === 'rectangle') {
                const rectX = Math.min(startPoint.x, endPoint.x);
                const rectY = Math.min(startPoint.y, endPoint.y);
                const rectWidth = Math.abs(startPoint.x - endPoint.x);
                const rectHeight = Math.abs(startPoint.y - endPoint.y);

                const canvasRectStart = imageToImageCanvasCoords(rectX, rectY, currentImage, currentDrawInfo);
                const canvasRectEnd = imageToImageCanvasCoords(rectX + rectWidth, rectY + rectHeight, currentImage, currentDrawInfo);

                ctxImage.strokeRect(canvasRectStart.x, canvasRectStart.y,
                                Math.abs(canvasRectStart.x - canvasRectEnd.x),
                                Math.abs(canvasRectStart.y - canvasRectEnd.y));
            } else if (currentTool === 'circle') {
                const radiusX = Math.abs(startPoint.x - endPoint.x);
                const radiusY = Math.abs(startPoint.y - endPoint.y);
                const radiusImageCoords = Math.sqrt(radiusX * radiusX + radiusY * radiusY);

                const canvasCenter = imageToImageCanvasCoords(startPoint.x, startPoint.y, currentImage, currentDrawInfo);
                
                const scaleFactor = currentDrawInfo.zoomedWidth / currentImage.width;
                const canvasRadius = radiusImageCoords * scaleFactor;

                ctxImage.beginPath();
                ctxImage.arc(canvasCenter.x, canvasCenter.y, canvasRadius, 0, 2 * Math.PI);
                ctxImage.stroke();
            }
        }
    }

    function handleImageCanvasMouseUp(e) {
        if (currentImageIndex === -1 || !loadedImages[currentImageIndex]) return;

        if (currentTool === 'default' && isDraggingImage) {
            isDraggingImage = false;
            imageCanvas.style.cursor = 'grab';
        } else if ((currentTool === 'rectangle' || currentTool === 'circle') && isDrawing) {
            isDrawing = false;
            const mousePos = getImageMousePos(imageCanvas, e);
            const endPoint = imageCanvasToImageCoords(mousePos.x, mousePos.y,
                                                loadedImages[currentImageIndex].img,
                                                loadedImages[currentImageIndex].drawInfo);

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
                const radius = Math.sqrt(radiusX * radiusX + radiusY * radiusY);

                currentShapes.push({
                    type: 'circle',
                    startX: startPoint.x,
                    startY: startPoint.y,
                    radius: radius
                });
            }
            drawImageOnCanvas(loadedImages[currentImageIndex].img);
        }
    }

    function handleImageCanvasMouseLeave() {
        if (currentTool === 'default') {
            isDraggingImage = false;
            imageCanvas.style.cursor = 'grab';
        } else if (currentTool === 'rectangle' || currentTool === 'circle') {
            isDrawing = false;
            drawImageOnCanvas(loadedImages[currentImageIndex].img);
        }
    }

    function handleImageCanvasWheel(e) {
        e.preventDefault();

        if (currentImageIndex === -1 || !loadedImages[currentImageIndex] || isDrawing) return;

        const currentState = loadedImages[currentImageIndex].state;
        const image = loadedImages[currentImageIndex].img;

        const scale = Math.exp(-e.deltaY * 0.001 * IMAGE_VIEWER_ZOOM_FACTOR);
        const oldZoomLevel = currentState.zoom;
        currentState.zoom = Math.max(0.1, currentState.zoom * scale);

        const mouseX = e.clientX - imageCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - imageCanvas.getBoundingClientRect().top;

        currentState.panX = mouseX - ((mouseX - currentState.panX) * (currentState.zoom / oldZoomLevel));
        currentState.panY = mouseY - ((mouseY - currentState.panY) * (currentState.zoom / oldZoomLevel));

        drawImageOnCanvas(image);
    }

    // --- Tool Selection (No Change) ---
    function setActiveTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.tool-area').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}-tool`).classList.add('active');

        if (tool === 'rectangle' || tool === 'circle') {
            imageCanvas.style.cursor = 'crosshair';
        } else {
            imageCanvas.style.cursor = 'grab';
        }
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
             drawImageOnCanvas(loadedImages[currentImageIndex].img);
        }
    }

    rectangleToolBtn.addEventListener('click', () => setActiveTool('rectangle'));
    circleToolBtn.addEventListener('click', () => setActiveTool('circle'));
    panToolBtn.addEventListener('click', () => setActiveTool('pan'));
    defaultToolBtn.addEventListener('click', () => setActiveTool('default'));
    
    clearShapesBtn.addEventListener('click', () => {
        if (currentImageIndex !== -1 && loadedImages[currentImageIndex]) {
            loadedImages[currentImageIndex].shapes = [];
            drawImageOnCanvas(loadedImages[currentImageIndex].img);
        }
    });

    // --- Initial setup and event listeners (Image Viewer) ---
    openFolderBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.openImageFolder();
        if (result.success && result.images.length > 0) {
            loadedImages = [];
            thumbnailGallery.innerHTML = '';

            const loadingPromises = result.images.map((dataUrl, index) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        loadedImages[index] = {
                            img: img,
                            state: { zoom: 1.0, panX: 0, panY: 0 },
                            shapes: []
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

            Promise.all(loadingPromises).then(() => {
                if (loadedImages.length > 0) {
                    displayImage(0);
                    setActiveTool('default');
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

    imageCanvas.addEventListener('mousedown', handleImageCanvasMouseDown);
    imageCanvas.addEventListener('mousemove', handleImageCanvasMouseMove);
    imageCanvas.addEventListener('mouseup', handleImageCanvasMouseUp);
    imageCanvas.addEventListener('mouseleave', handleImageCanvasMouseLeave);
    imageCanvas.addEventListener('wheel', handleImageCanvasWheel);


    window.addEventListener('resize', () => {
        resizeImageCanvas(true);
        resizeProcedureCanvas(true);
    });
    resizeImageCanvas(true);
    setActiveTool('default');


    // #################################################################################
    // ############################# PROCEDURE EDITOR LOGIC ############################
    // #################################################################################

    const procedureCanvas = document.getElementById('procedureCanvas');
    const ctxProcedure = procedureCanvas.getContext('2d');
    const overviewCanvas = document.getElementById('overviewCanvas');
    const ctxOverview = overviewCanvas.getContext('2d');
    const toggleOverviewBtn = document.getElementById('toggle-overview-btn');
    const overviewWindow = document.querySelector('.overview-window');
    const addNodeButtons = document.querySelectorAll('.add-node-btn');
    const clearNodesBtn = document.getElementById('clear-nodes-btn');

    // Toolbox hover elements
    const toolboxWrapper = document.querySelector('.toolbox-wrapper');
    const toolboxHandle = document.querySelector('.toolbox-handle');

    // Context Menu elements
    const nodeContextMenu = document.getElementById('node-context-menu');
    const contextDeleteNodeBtn = document.getElementById('context-delete-node');
    const contextCopyNodeBtn = document.getElementById('context-copy-node');

    let procedureNodes = []; // Stores {id, type, text, x, y, width, height}
    let selectedNode = null; // Currently selected node for dragging/context menu
    let clipboardNode = null; // For copy/paste functionality

    let isDraggingNode = false; // For dragging existing nodes on canvas
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let isPanningProcedureCanvas = false; // For panning the canvas itself
    let lastPanMouseX = 0;
    let lastPanMouseY = 0;


    let procedureCanvasState = {
        zoom: 1.0,
        panX: 0,
        panY: 0
    };

    const PROCEDURE_CANVAS_ZOOM_FACTOR = 0.1;
    const NODE_WIDTH = 120;
    const NODE_HEIGHT = 60;

    // --- Utility Functions for Procedure Canvas Coordinates ---

    function getProcedureMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    function procedureCanvasToWorldCoords(canvasX, canvasY) {
        const worldX = (canvasX / procedureCanvasState.zoom) - procedureCanvasState.panX;
        const worldY = (canvasY / procedureCanvasState.zoom) - procedureCanvasState.panY;
        return { x: worldX, y: worldY };
    }

    function worldToProcedureCanvasCoords(worldX, worldY) {
        const canvasX = (worldX + procedureCanvasState.panX) * procedureCanvasState.zoom;
        const canvasY = (worldY + procedureCanvasState.panY) * procedureCanvasState.zoom;
        return { x: canvasX, y: canvasY };
    }

    // --- Procedure Canvas Drawing Functions ---

    function resizeProcedureCanvas(resetZoomPan = true) {
        const parent = procedureCanvas.parentElement;
        procedureCanvas.width = parent.clientWidth;
        procedureCanvas.height = parent.clientHeight;

        if (resetZoomPan) {
            procedureCanvasState.zoom = 1.0;
            procedureCanvasState.panX = 0;
            procedureCanvasState.panY = 0;
        }
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function drawProcedureCanvas() {
        ctxProcedure.clearRect(0, 0, procedureCanvas.width, procedureCanvas.height);

        drawGrid(ctxProcedure, procedureCanvas.width, procedureCanvas.height, procedureCanvasState.zoom, procedureCanvasState.panX, procedureCanvasState.panY);

        procedureNodes.forEach(node => {
            const { x, y } = worldToProcedureCanvasCoords(node.x, node.y);
            const width = node.width * procedureCanvasState.zoom;
            const height = node.height * procedureCanvasState.zoom;

            ctxProcedure.fillStyle = getNodeColor(node.type);
            ctxProcedure.strokeStyle = selectedNode === node ? '#61afef' : '#5c6370';
            ctxProcedure.lineWidth = selectedNode === node ? 3 : 1;
            ctxProcedure.fillRect(x, y, width, height);
            ctxProcedure.strokeRect(x, y, width, height);

            ctxProcedure.fillStyle = '#ffffff';
            ctxProcedure.font = `${14 * procedureCanvasState.zoom}px Arial`;
            ctxProcedure.textAlign = 'center';
            ctxProcedure.textBaseline = 'middle';
            ctxProcedure.fillText(node.text, x + width / 2, y + height / 2);
        });
    }

    function drawGrid(ctx, canvasWidth, canvasHeight, zoom, panX, panY, gridSize = 20) {
        ctx.strokeStyle = '#4b5263';
        ctx.lineWidth = 0.5;

        const scaledGridSize = gridSize * zoom;

        for (let x = (panX * zoom) % scaledGridSize; x < canvasWidth; x += scaledGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }

        for (let y = (panY * zoom) % scaledGridSize; y < canvasHeight; y += scaledGridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    }


    function getNodeColor(type) {
        switch (type) {
            case 'step': return '#98c379';
            case 'decision': return '#e6c07b';
            case 'start': return '#61afef';
            case 'end': return '#e06c75';
            default: return '#abb2bf';
        }
    }

    // --- Overview Canvas Functions ---

    function drawOverviewCanvas() {
        const overviewWidth = overviewCanvas.width;
        const overviewHeight = overviewCanvas.height;
        ctxOverview.clearRect(0, 0, overviewWidth, overviewHeight);

        if (procedureNodes.length === 0) {
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        procedureNodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        const scaleX = overviewWidth / contentWidth;
        const scaleY = overviewHeight / contentHeight;
        const overviewScale = Math.min(scaleX, scaleY);

        procedureNodes.forEach(node => {
            const ovX = (node.x - minX) * overviewScale;
            const ovY = (node.y - minY) * overviewScale;
            const ovWidth = node.width * overviewScale;
            const ovHeight = node.height * overviewScale;

            ctxOverview.fillStyle = getNodeColor(node.type);
            ctxOverview.fillRect(ovX, ovY, ovWidth, ovHeight);
        });

        ctxOverview.strokeStyle = '#61afef';
        ctxOverview.lineWidth = 2;
        ctxOverview.setLineDash([5, 5]);

        const viewportWorldX = -procedureCanvasState.panX;
        const viewportWorldY = -procedureCanvasState.panY;
        const viewportWorldWidth = procedureCanvas.width / procedureCanvasState.zoom;
        const viewportWorldHeight = procedureCanvas.height / procedureCanvasState.zoom;

        const ovViewportX = (viewportWorldX - minX) * overviewScale;
        const ovViewportY = (viewportWorldY - minY) * overviewScale;
        const ovViewportWidth = viewportWorldWidth * overviewScale;
        const ovViewportHeight = viewportWorldHeight * overviewScale;

        ctxOverview.strokeRect(ovViewportX, ovViewportY, ovViewportWidth, ovViewportHeight);
        ctxOverview.setLineDash([]);
    }

    // --- Procedure Canvas Event Handlers ---

    function handleProcedureCanvasMouseDown(e) {
        nodeContextMenu.classList.add('hidden');

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        selectedNode = procedureNodes.find(node =>
            worldMousePos.x >= node.x && worldMousePos.x <= node.x + node.width &&
            worldMousePos.y >= node.y && worldMousePos.y <= node.y + node.height
        );

        if (selectedNode) {
            isDraggingNode = true;
            dragOffsetX = worldMousePos.x - selectedNode.x;
            dragOffsetY = worldMousePos.y - selectedNode.y;
            procedureCanvas.style.cursor = 'grabbing';
        } else {
            isPanningProcedureCanvas = true;
            lastPanMouseX = e.clientX;
            lastPanMouseY = e.clientY;
            procedureCanvas.style.cursor = 'grab';
        }
        drawProcedureCanvas();
    }

    function handleProcedureCanvasMouseMove(e) {
        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        if (isDraggingNode && selectedNode) {
            selectedNode.x = worldMousePos.x - dragOffsetX;
            selectedNode.y = worldMousePos.y - dragOffsetY;
            drawProcedureCanvas();
            drawOverviewCanvas();
        } else if (isPanningProcedureCanvas && e.buttons === 1) {
            const deltaX = e.clientX - lastPanMouseX;
            const deltaY = e.clientY - lastPanMouseY;
            procedureCanvasState.panX += deltaX / procedureCanvasState.zoom;
            procedureCanvasState.panY += deltaY / procedureCanvasState.zoom;
            lastPanMouseX = e.clientX;
            lastPanMouseY = e.clientY;
            drawProcedureCanvas();
            drawOverviewCanvas();
        }
    }

    function handleProcedureCanvasMouseUp() {
        isDraggingNode = false;
        isPanningProcedureCanvas = false;
        procedureCanvas.style.cursor = 'grab';
        drawProcedureCanvas();
    }

    function handleProcedureCanvasWheel(e) {
        e.preventDefault();

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePosBeforeZoom = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        const scale = Math.exp(-e.deltaY * 0.001 * PROCEDURE_CANVAS_ZOOM_FACTOR);
        const oldZoom = procedureCanvasState.zoom;
        procedureCanvasState.zoom = Math.max(0.1, procedureCanvasState.zoom * scale);

        procedureCanvasState.panX = worldMousePosBeforeZoom.x - (mousePos.x / procedureCanvasState.zoom);
        procedureCanvasState.panY = worldMousePosBeforeZoom.y - (mousePos.y / procedureCanvasState.zoom);

        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function handleProcedureCanvasContextMenu(e) {
        e.preventDefault();

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        selectedNode = procedureNodes.find(node =>
            worldMousePos.x >= node.x && worldMousePos.x <= node.x + node.width &&
            worldMousePos.y >= node.y && worldMousePos.y <= node.y + node.height
        );

        if (selectedNode) {
            nodeContextMenu.style.left = `${e.clientX}px`;
            nodeContextMenu.style.top = `${e.clientY}px`;
            nodeContextMenu.classList.remove('hidden');
            drawProcedureCanvas();
        } else {
            nodeContextMenu.classList.add('hidden');
        }
    }

    // NEW: Dragover handler for procedure canvas
    function handleProcedureCanvasDragOver(e) {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'copy'; // Visual feedback for drop
    }

    // NEW: Drop handler for procedure canvas
    function handleProcedureCanvasDrop(e) {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('text/plain');
        if (nodeType) {
            const mousePos = getProcedureMousePos(procedureCanvas, e);
            const worldDropPos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

            const newNode = {
                id: Date.now(),
                type: nodeType,
                text: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${procedureNodes.length + 1}`,
                x: worldDropPos.x - (NODE_WIDTH / 2),
                y: worldDropPos.y - (NODE_HEIGHT / 2),
                width: NODE_WIDTH,
                height: NODE_HEIGHT
            };
            procedureNodes.push(newNode);
            drawProcedureCanvas();
            drawOverviewCanvas();
        }
    }

    // Hide context menu if clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!nodeContextMenu.contains(e.target)) {
            nodeContextMenu.classList.add('hidden');
            selectedNode = null;
            drawProcedureCanvas();
        }
    });

    // --- Toolbox Interaction (Drag-and-Drop) ---
    addNodeButtons.forEach(button => {
        button.addEventListener('dragstart', (e) => {
            const nodeType = e.target.dataset.nodeType;
            e.dataTransfer.setData('text/plain', nodeType);
            e.dataTransfer.effectAllowed = 'copy';
            nodeContextMenu.classList.add('hidden');
        });
    });

    clearNodesBtn.addEventListener('click', () => {
        procedureNodes = [];
        drawProcedureCanvas();
        drawOverviewCanvas();
    });

    // --- Overview Window Toggle ---
    toggleOverviewBtn.addEventListener('click', () => {
        overviewWindow.classList.toggle('hidden');
        toggleOverviewBtn.classList.toggle('unfolded');
        if (!overviewWindow.classList.contains('hidden')) {
            drawOverviewCanvas();
        }
    });

    // --- Overview Canvas Panning (Clicking on overview moves main canvas) ---
    overviewCanvas.addEventListener('mousedown', (e) => {
        const overviewRect = overviewCanvas.getBoundingClientRect();
        const mouseX = e.clientX - overviewRect.left;
        const mouseY = e.clientY - overviewRect.top;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        procedureNodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const padding = 50;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        const overviewScaleX = overviewCanvas.width / contentWidth;
        const overviewScaleY = overviewCanvas.height / contentHeight;
        const overviewScale = Math.min(overviewScaleX, overviewScaleY);

        const worldClickX = (mouseX / overviewScale) + minX;
        const worldClickY = (mouseY / overviewScale) + minY;

        procedureCanvasState.panX = -worldClickX + (procedureCanvas.width / 2 / procedureCanvasState.zoom);
        procedureCanvasState.panY = -worldClickY + (procedureCanvas.height / 2 / procedureCanvasState.zoom);

        drawProcedureCanvas();
        drawOverviewCanvas();
    });

    // --- Custom Context Menu Actions ---
    contextDeleteNodeBtn.addEventListener('click', () => {
        if (selectedNode) {
            procedureNodes = procedureNodes.filter(node => node !== selectedNode);
            selectedNode = null;
            drawProcedureCanvas();
            drawOverviewCanvas();
            nodeContextMenu.classList.add('hidden');
        }
    });

    contextCopyNodeBtn.addEventListener('click', () => {
        if (selectedNode) {
            clipboardNode = { ...selectedNode };
            clipboardNode.id = Date.now();
            clipboardNode.x += 20;
            clipboardNode.y += 20;
            console.log('Node copied to clipboard:', clipboardNode);
            nodeContextMenu.classList.add('hidden');
        }
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        if (e.key === 'Delete' && selectedNode) {
            e.preventDefault();
            procedureNodes = procedureNodes.filter(node => node !== selectedNode);
            selectedNode = null;
            drawProcedureCanvas();
            drawOverviewCanvas();
            nodeContextMenu.classList.add('hidden');
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNode) {
            e.preventDefault();
            clipboardNode = { ...selectedNode };
            clipboardNode.id = Date.now();
            console.log('Node copied via keyboard:', clipboardNode);
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardNode) {
            e.preventDefault();
            const pastedNode = { ...clipboardNode };
            pastedNode.id = Date.now();
            pastedNode.x += 30;
            pastedNode.y += 30;
            procedureNodes.push(pastedNode);
            selectedNode = pastedNode;
            drawProcedureCanvas();
            drawOverviewCanvas();
            console.log('Node pasted via keyboard:', pastedNode);
        }
    });


    // --- Initial Setup ---
    window.addEventListener('resize', () => {
        resizeImageCanvas(true);
        resizeProcedureCanvas(true);
    });
    resizeImageCanvas(true);
    setActiveTool('default');

    // Attach all procedure canvas interaction listeners
    procedureCanvas.addEventListener('mousedown', handleProcedureCanvasMouseDown);
    procedureCanvas.addEventListener('mousemove', handleProcedureCanvasMouseMove);
    procedureCanvas.addEventListener('mouseup', handleProcedureCanvasMouseUp);
    procedureCanvas.addEventListener('wheel', handleProcedureCanvasWheel);
    procedureCanvas.addEventListener('contextmenu', handleProcedureCanvasContextMenu);
    procedureCanvas.addEventListener('dragover', handleProcedureCanvasDragOver); // Corrected: using named function
    procedureCanvas.addEventListener('drop', handleProcedureCanvasDrop);       // Corrected: using named function
});