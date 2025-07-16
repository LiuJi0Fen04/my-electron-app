document.addEventListener('DOMContentLoaded', () => {
    // --- Resizer Elements ---
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
        document.body.style.userSelect = 'none'; // Prevent text selection during resize
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
    }

    function doResize(e) {
        if (!isResizing) return;

        if (activeResizer === leftMiddleResizer) {
            const newLeftWidth = e.clientX;
            const containerWidth = container.offsetWidth;
            const minLeftWidth = 100; // From CSS min-width
            const maxLeftWidth = containerWidth * 0.5; // From CSS max-width

            let calculatedWidth = Math.min(Math.max(newLeftWidth, minLeftWidth), maxLeftWidth);
            leftPanel.style.width = `${calculatedWidth}px`;
            // Recalculate middle panel width based on remaining space
            middlePanel.style.flexGrow = '1'; // Ensure middle panel takes remaining space
            middlePanel.style.width = 'auto'; // Reset width to allow flex-grow to work
        } else if (activeResizer === middleRightResizer) {
            const newRightWidth = container.offsetWidth - e.clientX;
            const minRightWidth = 250; // Approx min-width for right panels
            const maxRightWidth = container.offsetWidth * 0.7; // Max right panel width

            let calculatedWidth = Math.min(Math.max(newRightWidth, minRightWidth), maxRightWidth);
            rightPanelsContainer.style.width = `${calculatedWidth}px`;
            rightPanelsContainer.style.flexShrink = '0'; // Prevent shrinking
            middlePanel.style.flexGrow = '1'; // Ensure middle panel takes remaining space
            middlePanel.style.width = 'auto'; // Reset width
        } else if (activeResizer === rightTopBottomResizer) {
            const rightPanelHeight = rightPanelsContainer.offsetHeight;
            const newTopHeight = e.clientY - rightPanelsContainer.getBoundingClientRect().top;
            const minTopHeight = 100;
            const maxTopHeight = rightPanelHeight - 100; // Ensure bottom panel has space

            let calculatedHeight = Math.min(Math.max(newTopHeight, minTopHeight), maxTopHeight);
            rightTopPanel.style.height = `${calculatedHeight}px`;
            rightTopPanel.style.flexGrow = '0'; // Prevent growing
            rightBottomPanel.style.flexGrow = '1'; // Ensure bottom panel takes remaining space
            rightBottomPanel.style.height = 'auto'; // Reset height
        }
        // Redraw canvases on resize to ensure content scales correctly
        resizeImageCanvas();
        resizeProcedureCanvas();
    }

    function stopResizing() {
        isResizing = false;
        if (activeResizer) {
            activeResizer.classList.remove('active');
            activeResizer = null;
        }
        document.body.style.userSelect = ''; // Re-enable text selection
        document.body.style.cursor = ''; // Reset cursor

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
    }

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResizing);

    // --- Image Viewer Canvas ---
    const imageCanvas = document.getElementById('imageCanvas');
    const imageCtx = imageCanvas.getContext('2d');
    const openFolderBtn = document.getElementById('open-folder-btn');
    const thumbnailGallery = document.getElementById('thumbnailGallery');
    const clearShapesBtn = document.getElementById('clear-shapes-btn');

    let currentImage = new Image();
    let imagePan = { x: 0, y: 0 };
    let imageZoom = 1.0;
    let isPanningImage = false;
    let lastMousePos = { x: 0, y: 0 };
    let activeTool = 'default'; // 'default', 'rectangle', 'circle', 'pan'
    let drawingShape = null; // { type: 'rectangle'/'circle', startX, startY, endX, endY }
    let drawnShapes = []; // Array to store completed shapes
    let loadedImages = []; // Array of { src: base64, path: originalPath }
    let activeImageIndex = -1;

    // Tool buttons
    const rectangleToolBtn = document.getElementById('rectangle-tool');
    const circleToolBtn = document.getElementById('circle-tool');
    const panToolBtn = document.getElementById('pan-tool');
    const defaultToolBtn = document.getElementById('default-tool');

    function setActiveTool(tool) {
        document.querySelectorAll('.tool-area').forEach(btn => btn.classList.remove('active'));
        const toolBtn = document.getElementById(`${tool}-tool`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
        activeTool = tool;
        imageCanvas.style.cursor = (tool === 'pan') ? 'grab' : 'crosshair';
        if (tool === 'default') {
            imageCanvas.style.cursor = 'default';
        }
    }

    rectangleToolBtn.addEventListener('click', () => setActiveTool('rectangle'));
    circleToolBtn.addEventListener('click', () => setActiveTool('circle'));
    panToolBtn.addEventListener('click', () => setActiveTool('pan'));
    defaultToolBtn.addEventListener('click', () => setActiveTool('default'));

    function resizeImageCanvas(initial = false) {
        const container = imageCanvas.parentElement;
        imageCanvas.width = container.clientWidth;
        imageCanvas.height = container.clientHeight;
        if (initial) {
            // Initial centering and fitting
            if (currentImage.src) {
                const imgAspectRatio = currentImage.width / currentImage.height;
                const canvasAspectRatio = imageCanvas.width / imageCanvas.height;

                if (imgAspectRatio > canvasAspectRatio) {
                    // Image is wider than canvas, fit by width
                    imageZoom = imageCanvas.width / currentImage.width;
                } else {
                    // Image is taller than canvas, fit by height
                    imageZoom = imageCanvas.height / currentImage.height;
                }
                imagePan.x = (imageCanvas.width - currentImage.width * imageZoom) / 2;
                imagePan.y = (imageCanvas.height - currentImage.height * imageZoom) / 2;
            }
        }
        drawImage();
    }

    function drawImage() {
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        if (currentImage.src) {
            imageCtx.save();
            imageCtx.translate(imagePan.x, imagePan.y);
            imageCtx.scale(imageZoom, imageZoom);
            imageCtx.drawImage(currentImage, 0, 0);
            imageCtx.restore();

            // Draw shapes
            imageCtx.strokeStyle = '#e6c07b'; // Yellowish color
            imageCtx.lineWidth = 2;
            drawnShapes.forEach(shape => {
                imageCtx.beginPath();
                const startX = (shape.startX * imageZoom) + imagePan.x;
                const startY = (shape.startY * imageZoom) + imagePan.y;
                const endX = (shape.endX * imageZoom) + imagePan.x;
                const endY = (shape.endY * imageZoom) + imagePan.y;

                if (shape.type === 'rectangle') {
                    imageCtx.strokeRect(startX, startY, endX - startX, endY - startY);
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                    imageCtx.arc(startX, startY, radius, 0, Math.PI * 2);
                    imageCtx.stroke();
                }
            });

            // Draw current drawing shape
            if (drawingShape) {
                imageCtx.beginPath();
                imageCtx.strokeStyle = '#61afef'; // Blueish color for active drawing
                imageCtx.lineWidth = 2;

                const startX = (drawingShape.startX * imageZoom) + imagePan.x;
                const startY = (drawingShape.startY * imageZoom) + imagePan.y;
                const currentX = (drawingShape.currentX * imageZoom) + imagePan.x;
                const currentY = (drawingShape.currentY * imageZoom) + imagePan.y;

                if (drawingShape.type === 'rectangle') {
                    imageCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
                } else if (drawingShape.type === 'circle') {
                    const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                    imageCtx.arc(startX, startY, radius, 0, Math.PI * 2);
                    imageCtx.stroke();
                }
            }
        }
    }

    function getCanvasCoords(e) {
        const rect = imageCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { x, y };
    }

    function getImageCoords(canvasX, canvasY) {
        const x = (canvasX - imagePan.x) / imageZoom;
        const y = (canvasY - imagePan.y) / imageZoom;
        return { x, y };
    }

    function handleImageCanvasMouseDown(e) {
        const { x, y } = getCanvasCoords(e);
        const imageCoords = getImageCoords(x, y);

        if (activeTool === 'pan' || activeTool === 'default') {
            isPanningImage = true;
            imageCanvas.style.cursor = 'grabbing';
            lastMousePos = { x, y };
        } else if (activeTool === 'rectangle' || activeTool === 'circle') {
            drawingShape = {
                type: activeTool,
                startX: imageCoords.x,
                startY: imageCoords.y,
                currentX: imageCoords.x,
                currentY: imageCoords.y
            };
        }
    }

    function handleImageCanvasMouseMove(e) {
        const { x, y } = getCanvasCoords(e);
        const imageCoords = getImageCoords(x, y);

        if (isPanningImage) {
            imagePan.x += x - lastMousePos.x;
            imagePan.y += y - lastMousePos.y;
            lastMousePos = { x, y };
            drawImage();
        } else if (drawingShape) {
            drawingShape.currentX = imageCoords.x;
            drawingShape.currentY = imageCoords.y;
            drawImage();
        }
    }

    function handleImageCanvasMouseUp(e) {
        isPanningImage = false;
        imageCanvas.style.cursor = (activeTool === 'pan') ? 'grab' : 'crosshair';
        if (activeTool === 'default') {
            imageCanvas.style.cursor = 'default';
        }

        if (drawingShape) {
            // Normalize shape coordinates (e.g., ensure startX < endX)
            const finalShape = { ...drawingShape };
            if (finalShape.type === 'rectangle') {
                finalShape.endX = finalShape.currentX;
                finalShape.endY = finalShape.currentY;
            }
            // For circle, currentX/Y are relative to center, so just store as is
            drawnShapes.push(finalShape);
            drawingShape = null;
            drawImage();
        }
    }

    function handleImageCanvasMouseLeave() {
        isPanningImage = false;
        drawingShape = null; // Cancel drawing if mouse leaves canvas
        imageCanvas.style.cursor = (activeTool === 'pan') ? 'grab' : 'crosshair';
        if (activeTool === 'default') {
            imageCanvas.style.cursor = 'default';
        }
        drawImage(); // Redraw to clear any partial drawing
    }

    function handleImageCanvasWheel(e) {
        e.preventDefault(); // Prevent page scrolling

        const zoomFactor = 1.1;
        const mouseX = e.clientX - imageCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - imageCanvas.getBoundingClientRect().top;

        // Calculate image coordinates under the mouse before zoom
        const imgX = (mouseX - imagePan.x) / imageZoom;
        const imgY = (mouseY - imagePan.y) / imageZoom;

        if (e.deltaY < 0) { // Zoom in
            imageZoom *= zoomFactor;
        } else { // Zoom out
            imageZoom /= zoomFactor;
        }

        // Keep zoom within reasonable bounds
        imageZoom = Math.max(0.1, Math.min(10.0, imageZoom));

        // Recalculate pan to keep the point under the mouse fixed
        imagePan.x = mouseX - imgX * imageZoom;
        imagePan.y = mouseY - imgY * imageZoom;

        drawImage();
    }

    clearShapesBtn.addEventListener('click', () => {
        drawnShapes = [];
        drawingShape = null;
        drawImage();
    });

    openFolderBtn.addEventListener('click', async () => {
        if (typeof window.electronAPI !== 'undefined') {
            const result = await window.electronAPI.openImageFolder();
            if (result.success && result.images.length > 0) {
                loadedImages = result.images.map((src, index) => ({ src, path: `Image ${index + 1}` })); // Mock path
                thumbnailGallery.innerHTML = ''; // Clear existing thumbnails

                loadedImages.forEach((imgData, index) => {
                    const thumbDiv = document.createElement('div');
                    thumbDiv.classList.add('thumbnail-item');
                    thumbDiv.dataset.index = index;

                    const img = document.createElement('img');
                    img.src = imgData.src;
                    img.alt = `Thumbnail ${index + 1}`;
                    thumbDiv.appendChild(img);

                    thumbDiv.addEventListener('click', () => {
                        displayImage(index);
                        document.querySelectorAll('.thumbnail-item').forEach(item => item.classList.remove('active'));
                        thumbDiv.classList.add('active');
                    });
                    thumbnailGallery.appendChild(thumbDiv);
                });

                // Display the first image by default
                displayImage(0);
                if (loadedImages.length > 0) {
                    thumbnailGallery.querySelector('.thumbnail-item').classList.add('active');
                }
            } else if (result.error) {
                alert(`Error opening folder: ${result.error}`);
            }
        } else {
            alert('Electron API not available. Cannot open image folder.');
            // Mock image loading for browser testing
            loadedImages = [
                { src: '[https://placehold.co/600x400/FF0000/FFFFFF?text=Image+1](https://placehold.co/600x400/FF0000/FFFFFF?text=Image+1)', path: 'Mock Image 1' },
                { src: '[https://placehold.co/400x600/00FF00/000000?text=Image+2](https://placehold.co/400x600/00FF00/000000?text=Image+2)', path: 'Mock Image 2' },
                { src: '[https://placehold.co/800x500/0000FF/FFFFFF?text=Image+3](https://placehold.co/800x500/0000FF/FFFFFF?text=Image+3)', path: 'Mock Image 3' }
            ];
            thumbnailGallery.innerHTML = '';
            loadedImages.forEach((imgData, index) => {
                const thumbDiv = document.createElement('div');
                thumbDiv.classList.add('thumbnail-item');
                thumbDiv.dataset.index = index;
                const img = document.createElement('img');
                img.src = imgData.src;
                img.alt = `Thumbnail ${index + 1}`;
                thumbDiv.appendChild(img);
                thumbDiv.addEventListener('click', () => {
                    displayImage(index);
                    document.querySelectorAll('.thumbnail-item').forEach(item => item.classList.remove('active'));
                    thumbDiv.classList.add('active');
                });
                thumbnailGallery.appendChild(thumbDiv);
            });
            displayImage(0);
            if (loadedImages.length > 0) {
                thumbnailGallery.querySelector('.thumbnail-item').classList.add('active');
            }
        }
    });

    function displayImage(index) {
        if (index >= 0 && index < loadedImages.length) {
            activeImageIndex = index;
            currentImage.onload = () => {
                resizeImageCanvas(true); // Recalculate pan/zoom for new image
            };
            currentImage.src = loadedImages[index].src;
            drawnShapes = []; // Clear shapes when new image is displayed
        }
    }

    // Attach image canvas interaction listeners
    imageCanvas.addEventListener('mousedown', handleImageCanvasMouseDown);
    imageCanvas.addEventListener('mousemove', handleImageCanvasMouseMove);
    imageCanvas.addEventListener('mouseup', handleImageCanvasMouseUp);
    imageCanvas.addEventListener('mouseleave', handleImageCanvasMouseLeave);
    imageCanvas.addEventListener('wheel', handleImageCanvasWheel);

    // --- Procedure Editor Canvas ---
    const procedureCanvas = document.getElementById('procedureCanvas');
    const procedureCtx = procedureCanvas.getContext('2d');
    const overviewCanvas = document.getElementById('overviewCanvas');
    const overviewCtx = overviewCanvas.getContext('2d');
    const toggleOverviewBtn = document.getElementById('toggle-overview-btn');
    const overviewWindow = document.querySelector('.overview-window');
    const nodeContextMenu = document.getElementById('node-context-menu');
    const contextDeleteNode = document.getElementById('context-delete-node');
    const contextCopyNode = document.getElementById('context-copy-node');
    const clearNodesBtn = document.getElementById('clear-nodes-btn');

    let procedureNodes = [];
    let procedurePan = { x: 0, y: 0 };
    let procedureZoom = 1.0;
    let isPanningProcedure = false;
    let lastProcedureMousePos = { x: 0, y: 0 };
    let selectedNode = null;
    let isDraggingNode = false;
    let dragOffsetX, dragOffsetY;
    let clipboardNode = null; // For copy/paste functionality

    function resizeProcedureCanvas(initial = false) {
        const container = procedureCanvas.parentElement;
        procedureCanvas.width = container.clientWidth;
        procedureCanvas.height = container.clientHeight;
        overviewCanvas.width = overviewWindow.clientWidth;
        overviewCanvas.height = overviewWindow.clientHeight;
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function drawProcedureCanvas() {
        procedureCtx.clearRect(0, 0, procedureCanvas.width, procedureCanvas.height);
        procedureCtx.save();
        procedureCtx.translate(procedurePan.x, procedurePan.y);
        procedureCtx.scale(procedureZoom, procedureZoom);

        // Draw connections first
        procedureNodes.forEach(node => {
            // For simplicity, draw connections from this node to others
            // In a real app, you'd have a specific connections array
            node.connections = node.connections || []; // Ensure connections array exists
            node.connections.forEach(targetNodeId => {
                const targetNode = procedureNodes.find(n => n.id === targetNodeId);
                if (targetNode) {
                    drawConnection(node, targetNode);
                }
            });
        });

        // Draw nodes
        procedureNodes.forEach(node => drawNode(node));

        procedureCtx.restore();
    }

    function drawNode(node) {
        const nodeWidth = 100;
        const nodeHeight = 50;

        procedureCtx.beginPath();
        procedureCtx.rect(node.x, node.y, nodeWidth, nodeHeight);

        procedureCtx.fillStyle = node.id === (selectedNode ? selectedNode.id : null) ? '#61afef' : '#4b5263'; // Highlight selected
        procedureCtx.strokeStyle = '#5c6370';
        procedureCtx.lineWidth = 2;
        procedureCtx.fill();
        procedureCtx.stroke();

        procedureCtx.fillStyle = '#abb2bf';
        procedureCtx.font = '14px sans-serif';
        procedureCtx.textAlign = 'center';
        procedureCtx.textBaseline = 'middle';
        procedureCtx.fillText(node.type.toUpperCase(), node.x + nodeWidth / 2, node.y + nodeHeight / 2);
    }

    function drawConnection(sourceNode, targetNode) {
        procedureCtx.strokeStyle = '#abb2bf';
        procedureCtx.lineWidth = 2;
        procedureCtx.beginPath();
        // Simple connection from center of source to center of target
        procedureCtx.moveTo(sourceNode.x + 50, sourceNode.y + 25);
        procedureCtx.lineTo(targetNode.x + 50, targetNode.y + 25);
        procedureCtx.stroke();
        // Draw arrow head (simplified)
        const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
        procedureCtx.save();
        procedureCtx.translate(targetNode.x + 50, targetNode.y + 25);
        procedureCtx.rotate(angle);
        procedureCtx.beginPath();
        procedureCtx.moveTo(-10, -5);
        procedureCtx.lineTo(0, 0);
        procedureCtx.lineTo(-10, 5);
        procedureCtx.stroke();
        procedureCtx.restore();
    }


    function drawOverviewCanvas() {
        overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
        if (procedureNodes.length === 0) return;

        // Calculate bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        procedureNodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + 100); // Assuming node width 100
            maxY = Math.max(maxY, node.y + 50);  // Assuming node height 50
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        const overviewPadding = 10;
        const scaleX = (overviewCanvas.width - overviewPadding * 2) / contentWidth;
        const scaleY = (overviewCanvas.height - overviewPadding * 2) / contentHeight;
        const overviewScale = Math.min(scaleX, scaleY);

        overviewCtx.save();
        overviewCtx.translate(overviewPadding, overviewPadding);
        overviewCtx.scale(overviewScale, overviewScale);
        overviewCtx.translate(-minX, -minY); // Translate to origin of content

        // Draw nodes on overview
        overviewCtx.fillStyle = '#4b5263';
        overviewCtx.strokeStyle = '#5c6370';
        procedureNodes.forEach(node => {
            overviewCtx.fillRect(node.x, node.y, 100, 50);
            overviewCtx.strokeRect(node.x, node.y, 100, 50);
        });

        // Draw connections on overview (simplified)
        overviewCtx.strokeStyle = '#abb2bf';
        procedureNodes.forEach(node => {
            node.connections = node.connections || [];
            node.connections.forEach(targetNodeId => {
                const targetNode = procedureNodes.find(n => n.id === targetNodeId);
                if (targetNode) {
                    overviewCtx.beginPath();
                    overviewCtx.moveTo(node.x + 50, node.y + 25);
                    overviewCtx.lineTo(targetNode.x + 50, targetNode.y + 25);
                    overviewCtx.stroke();
                }
            });
        });

        // Draw current viewport rectangle on overview
        overviewCtx.strokeStyle = '#e6c07b';
        overviewCtx.lineWidth = 3 / overviewScale; // Scale line width back
        overviewCtx.strokeRect(
            (-procedurePan.x / procedureZoom),
            (-procedurePan.y / procedureZoom),
            (procedureCanvas.width / procedureZoom),
            (procedureCanvas.height / procedureZoom)
        );

        overviewCtx.restore();
    }

    function getProcedureCanvasCoords(e) {
        const rect = procedureCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return { x, y };
    }

    function getProcedureWorldCoords(canvasX, canvasY) {
        const x = (canvasX - procedurePan.x) / procedureZoom;
        const y = (canvasY - procedurePan.y) / procedureZoom;
        return { x, y };
    }

    function hitTestNode(worldX, worldY) {
        const nodeWidth = 100;
        const nodeHeight = 50;
        for (let i = procedureNodes.length - 1; i >= 0; i--) { // Iterate backwards to pick top-most
            const node = procedureNodes[i];
            if (worldX >= node.x && worldX <= node.x + nodeWidth &&
                worldY >= node.y && worldY <= node.y + nodeHeight) {
                return node;
            }
        }
        return null;
    }

    function handleProcedureCanvasMouseDown(e) {
        const { x, y } = getProcedureCanvasCoords(e);
        const worldCoords = getProcedureWorldCoords(x, y);

        if (e.button === 0) { // Left click
            selectedNode = hitTestNode(worldCoords.x, worldCoords.y);
            if (selectedNode) {
                isDraggingNode = true;
                dragOffsetX = worldCoords.x - selectedNode.x;
                dragOffsetY = worldCoords.y - selectedNode.y;
                procedureCanvas.style.cursor = 'grabbing';
            } else {
                isPanningProcedure = true;
                lastProcedureMousePos = { x, y };
                procedureCanvas.style.cursor = 'grab';
            }
        }
        drawProcedureCanvas();
    }

    function handleProcedureCanvasMouseMove(e) {
        const { x, y } = getProcedureCanvasCoords(e);
        const worldCoords = getProcedureWorldCoords(x, y);

        if (isDraggingNode && selectedNode) {
            selectedNode.x = worldCoords.x - dragOffsetX;
            selectedNode.y = worldCoords.y - dragOffsetY;
            drawProcedureCanvas();
            drawOverviewCanvas();
        } else if (isPanningProcedure) {
            procedurePan.x += x - lastProcedureMousePos.x;
            procedurePan.y += y - lastProcedureMousePos.y;
            lastProcedureMousePos = { x, y };
            drawProcedureCanvas();
            drawOverviewCanvas();
        }
    }

    function handleProcedureCanvasMouseUp(e) {
        isDraggingNode = false;
        isPanningProcedure = false;
        procedureCanvas.style.cursor = 'default';
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function handleProcedureCanvasWheel(e) {
        e.preventDefault();

        const zoomFactor = 1.1;
        const mouseX = e.clientX - procedureCanvas.getBoundingClientRect().left;
        const mouseY = e.clientY - procedureCanvas.getBoundingClientRect().top;

        const worldX = (mouseX - procedurePan.x) / procedureZoom;
        const worldY = (mouseY - procedurePan.y) / procedureZoom;

        if (e.deltaY < 0) { // Zoom in
            procedureZoom *= zoomFactor;
        } else { // Zoom out
            procedureZoom /= zoomFactor;
        }

        procedureZoom = Math.max(0.1, Math.min(5.0, procedureZoom)); // Limit zoom

        procedurePan.x = mouseX - worldX * procedureZoom;
        procedurePan.y = mouseY - worldY * procedureZoom;

        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function handleProcedureCanvasContextMenu(e) {
        e.preventDefault();
        const { x, y } = getProcedureCanvasCoords(e);
        const worldCoords = getProcedureWorldCoords(x, y);

        selectedNode = hitTestNode(worldCoords.x, worldCoords.y);
        if (selectedNode) {
            nodeContextMenu.style.left = `${e.clientX}px`;
            nodeContextMenu.style.top = `${e.clientY}px`;
            nodeContextMenu.classList.remove('hidden');
        } else {
            nodeContextMenu.classList.add('hidden');
        }
        drawProcedureCanvas(); // Redraw to highlight selected node
    }

    // Hide context menu on any click outside
    document.addEventListener('click', (e) => {
        if (!nodeContextMenu.contains(e.target)) {
            nodeContextMenu.classList.add('hidden');
        }
    });

    contextDeleteNode.addEventListener('click', () => {
        if (selectedNode) {
            procedureNodes = procedureNodes.filter(node => node.id !== selectedNode.id);
            // Also remove any connections to/from this node
            procedureNodes.forEach(node => {
                if (node.connections) {
                    node.connections = node.connections.filter(connId => connId !== selectedNode.id);
                }
            });
            selectedNode = null;
            drawProcedureCanvas();
            drawOverviewCanvas();
            nodeContextMenu.classList.add('hidden');
        }
    });

    contextCopyNode.addEventListener('click', () => {
        if (selectedNode) {
            clipboardNode = { ...selectedNode };
            // Remove connections from clipboard node, as they might not be relevant to a new node
            delete clipboardNode.connections;
            console.log('Node copied to clipboard:', clipboardNode);
            nodeContextMenu.classList.add('hidden');
        }
    });

    // Keyboard shortcuts for delete, copy, paste
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedNode) {
                e.preventDefault(); // Prevent browser back navigation for backspace
                contextDeleteNode.click(); // Trigger delete logic
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') { // Ctrl+C or Cmd+C
            e.preventDefault();
            if (selectedNode) {
                clipboardNode = { ...selectedNode };
                delete clipboardNode.connections; // Don't copy connections directly
                console.log('Node copied via keyboard:', clipboardNode);
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardNode) { // Ctrl+V or Cmd+V
            e.preventDefault();
            const pastedNode = { ...clipboardNode };
            pastedNode.id = Date.now(); // Assign a new unique ID
            // Offset the pasted node slightly so it's visible
            pastedNode.x += 30;
            pastedNode.y += 30;
            procedureNodes.push(pastedNode);
            selectedNode = pastedNode; // Select the newly pasted node
            drawProcedureCanvas();
            drawOverviewCanvas();
            console.log('Node pasted via keyboard:', pastedNode);
        }
    });


    // Toggle overview window
    toggleOverviewBtn.addEventListener('click', () => {
        overviewWindow.classList.toggle('hidden');
        toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▼' : '▲';
        // Redraw overview if it becomes visible
        if (!overviewWindow.classList.contains('hidden')) {
            resizeProcedureCanvas(); // This will redraw overview
        }
    });

    clearNodesBtn.addEventListener('click', () => {
        procedureNodes = [];
        selectedNode = null;
        drawProcedureCanvas();
        drawOverviewCanvas();
    });

    // --- New Tooling Logic ---
    const addToolsActivator = document.getElementById('add-tools-activator');
    const calibrationToolsActivator = document.getElementById('calibration-tools-activator');
    const addToolsWindow = document.getElementById('add-tools-window');
    const calibrationToolsWindow = document.getElementById('calibration-tools-window');

    let activeToolWindow = null; // To keep track of which tool window is open

    // Function to open a tool window
    function openToolWindow(windowElement, activatorElement) {
        if (activeToolWindow && activeToolWindow !== windowElement) {
            activeToolWindow.classList.add('hidden'); // Hide the currently active window if different
        }
        windowElement.classList.toggle('hidden'); // Toggle visibility
        activeToolWindow = windowElement.classList.contains('hidden') ? null : windowElement;

        // Position the window next to the activator (example positioning, adjust as needed)
        const activatorRect = activatorElement.getBoundingClientRect();
        windowElement.style.left = `${activatorRect.right + 10}px`; // 10px to the right of activator
        windowElement.style.top = `${activatorRect.top}px`;
    }

    addToolsActivator.addEventListener('click', () => {
        openToolWindow(addToolsWindow, addToolsActivator);
    });

    calibrationToolsActivator.addEventListener('click', () => {
        openToolWindow(calibrationToolsWindow, calibrationToolsActivator);
    });

    // Close tool window if clicked outside of any activator or tool window
    document.addEventListener('click', (event) => {
        const isClickInsideAddActivator = addToolsActivator.contains(event.target);
        const isClickInsideCalibActivator = calibrationToolsActivator.contains(event.target);
        const isClickInsideAddWindow = addToolsWindow.contains(event.target);
        const isClickInsideCalibWindow = calibrationToolsWindow.contains(event.target);

        if (activeToolWindow && !(isClickInsideAddActivator || isClickInsideCalibActivator || isClickInsideAddWindow || isClickInsideCalibWindow)) {
            activeToolWindow.classList.add('hidden');
            activeToolWindow = null;
        }
    });


    // --- Drag and Drop for Tools to Procedure Canvas ---
    let draggedNodeType = null; // To store the type of node/tool being dragged

    document.querySelectorAll('.add-node-btn, .calibration-tool-btn').forEach(button => {
        button.addEventListener('dragstart', (e) => {
            draggedNodeType = e.target.dataset.nodeType || e.target.dataset.toolType; // Get data from 'data-node-type' or 'data-tool-type'
            e.dataTransfer.setData('text/plain', draggedNodeType); // Set data for drag operation
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    procedureCanvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'copy';
    });

    procedureCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const droppedType = e.dataTransfer.getData('text/plain');

        if (droppedType) {
            const { x, y } = getProcedureCanvasCoords(e);
            const worldCoords = getProcedureWorldCoords(x, y);

            console.log(`Dropped ${droppedType} at canvas coordinates: (${worldCoords.x}, ${worldCoords.y})`);

            // Example: Add a new node to the procedure canvas
            if (droppedType === 'step' || droppedType === 'decision' || droppedType === 'start' || droppedType === 'end') {
                const newNode = {
                    id: Date.now(), // Simple unique ID
                    type: droppedType,
                    x: worldCoords.x - 50, // Center node on drop point
                    y: worldCoords.y - 25,
                    connections: [] // Initialize connections
                };
                procedureNodes.push(newNode);
                selectedNode = newNode; // Select the newly added node
                drawProcedureCanvas();
                drawOverviewCanvas();
                // Close the tool window after dropping
                if (activeToolWindow) {
                    activeToolWindow.classList.add('hidden');
                    activeToolWindow = null;
                }
            } else if (droppedType === 'measure' || droppedType === 'align') {
                // Handle calibration tool drop (e.g., activate a mode or place an indicator)
                alert(`Activated ${droppedType} tool at (${Math.round(worldCoords.x)}, ${Math.round(worldCoords.y)})`);
                 if (activeToolWindow) {
                    activeToolWindow.classList.add('hidden');
                    activeToolWindow = null;
                }
            }
        }
        draggedNodeType = null; // Reset
    });

    // --- Electron IPC Communication ---
    const sendMessageBtn = document.getElementById('send-message-btn');
    const mainMessageDisplay = document.getElementById('main-message-display');

    if (sendMessageBtn && typeof window.electronAPI !== 'undefined') {
        sendMessageBtn.addEventListener('click', async () => {
            try {
                const response = await window.electronAPI.sendMessageToMain('Hello from renderer!');
                mainMessageDisplay.textContent = `Main replied: ${response}`;
            } catch (error) {
                console.error('Error sending message to main:', error);
                mainMessageDisplay.textContent = 'Error sending message to main.';
            }
        });

        // Listen for messages from the main process
        window.electronAPI.onMessageFromMain((message) => {
            console.log('Renderer received message from main:', message);
            // You can update UI based on messages from main
        });
    } else {
        // Fallback for browser environment (not Electron)
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => {
                mainMessageDisplay.textContent = 'Electron API not available. Cannot send message to main.';
                console.warn('window.electronAPI is not defined. Running outside Electron context?');
            });
        }
    }


    // --- Initial Setup ---
    window.addEventListener('resize', () => {
        resizeImageCanvas(true); // True to re-center/fit image on resize
        resizeProcedureCanvas(true); // True to re-center/fit procedure view
    });

    // Initial canvas sizing and drawing
    resizeImageCanvas(true);
    resizeProcedureCanvas(true);

    // Set initial active tool for image viewer
    setActiveTool('default');

}); // End of DOMContentLoaded
