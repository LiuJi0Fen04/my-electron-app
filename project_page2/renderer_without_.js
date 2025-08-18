document.addEventListener('DOMContentLoaded', () => {
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

    // Get min-width/min-height from CSS for calculations
    const getCssProperty = (element, prop) => parseFloat(window.getComputedStyle(element).getPropertyValue(prop));

    const minLeftWidth = getCssProperty(leftPanel, 'min-width');
    const minMiddleWidth = getCssProperty(middlePanel, 'min-width');
    const minRightWidth = getCssProperty(rightPanelsContainer, 'min-width');
    const resizerWidth = getCssProperty(leftMiddleResizer, 'width'); // Assuming all horizontal resizers have same width

    const minTopHeight = getCssProperty(rightTopPanel, 'min-height');
    const minBottomHeight = getCssProperty(rightBottomPanel, 'min-height');
    // const resizerHeight = getCssProperty(rightTopBottomResizer, 'height'); // Assuming resizers have defined height


    // --- Resizer Logic (Existing) ---
    const startResizing = (e, resizer) => {
        isResizing = true;
        activeResizer = resizer;
        // console.log("Start resizing", activeResizer.id);
        document.body.style.cursor = activeResizer.id.includes('horizontal') ? 'ew-resize' : 'ns-resize';
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResizing);
    };

    const resize = (e) => {
        if (!isResizing || !activeResizer) return;

        if (activeResizer.id === 'left-middle-resizer') {
            const containerRect = container.getBoundingClientRect();
            let newLeftWidth = e.clientX - containerRect.left;
            let newMiddleWidth = containerRect.width - newLeftWidth - resizerWidth - minRightWidth;

            if (newLeftWidth < minLeftWidth) newLeftWidth = minLeftWidth;
            if (newMiddleWidth < minMiddleWidth) newMiddleWidth = minMiddleWidth;

            // Recalculate middle width based on current left width to prevent negative middle width
            newMiddleWidth = containerRect.width - newLeftWidth - resizerWidth - rightPanelsContainer.offsetWidth;

            if (newLeftWidth >= minLeftWidth && newMiddleWidth >= minMiddleWidth) {
                leftPanel.style.width = `${newLeftWidth}px`;
                middlePanel.style.width = `${newMiddleWidth}px`;
            }

        } else if (activeResizer.id === 'middle-right-resizer') {
            const containerRect = container.getBoundingClientRect();
            let newRightWidth = containerRect.right - e.clientX;
            let newMiddleWidth = containerRect.width - leftPanel.offsetWidth - resizerWidth - newRightWidth;

            if (newRightWidth < minRightWidth) newRightWidth = minRightWidth;
            if (newMiddleWidth < minMiddleWidth) newMiddleWidth = minMiddleWidth;

            // Recalculate middle width based on current right width
            newMiddleWidth = containerRect.width - leftPanel.offsetWidth - resizerWidth - newRightWidth;

            if (newRightWidth >= minRightWidth && newMiddleWidth >= minMiddleWidth) {
                rightPanelsContainer.style.width = `${newRightWidth}px`;
                middlePanel.style.width = `${newMiddleWidth}px`;
            }
        } else if (activeResizer.id === 'right-top-bottom-resizer') {
            const rightPanelsRect = rightPanelsContainer.getBoundingClientRect();
            let newTopHeight = e.clientY - rightPanelsRect.top;
            let newBottomHeight = rightPanelsRect.height - newTopHeight;

            if (newTopHeight < minTopHeight) newTopHeight = minTopHeight;
            if (newBottomHeight < minBottomHeight) newBottomHeight = minBottomHeight;

            if (newTopHeight >= minTopHeight && newBottomHeight >= minBottomHeight) {
                rightTopPanel.style.height = `${newTopHeight}px`;
                rightBottomPanel.style.height = `${newBottomHeight}px`;
            }
        }
    };

    const stopResizing = () => {
        isResizing = false;
        activeResizer = null;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResizing);
        resizeProcedureCanvas(); // Redraw canvas after resizing panels
        resizeImageCanvas(); // Redraw image canvas after resizing panels
    };

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));


    // --- Image Viewer Panel (Right Top) ---
    const imageCanvas = document.getElementById('imageCanvas');
    const imageCtx = imageCanvas.getContext('2d');
    const openImageFolderBtn = document.getElementById('open-image-folder-btn');
    const imageSelect = document.getElementById('image-select');
    const prevImageBtn = document.getElementById('prev-image-btn');
    const nextImageBtn = document.getElementById('next-image-btn');
    const toolSelect = document.getElementById('tool-select');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const panToolBtn = document.getElementById('pan-tool-btn');
    const defaultToolBtn = document.getElementById('default-tool-btn');

    let currentImageIndex = -1;
    let imageFiles = [];
    let currentImage = null;
    let scale = 1.0;
    let panOffset = { x: 0, y: 0 };
    let isPanning = false;
    let startPan = { x: 0, y: 0 };
    let activeTool = 'default'; // 'default', 'pan', 'zoom'


    // Resizes the image canvas to fit its parent container
    const resizeImageCanvas = () => {
        const parent = imageCanvas.parentElement;
        imageCanvas.width = parent.clientWidth;
        imageCanvas.height = parent.clientHeight;
        drawImage();
    };


    const drawImage = () => {
        imageCtx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        if (currentImage) {
            const imgWidth = currentImage.width * scale;
            const imgHeight = currentImage.height * scale;

            // Center the image within the canvas, applying pan offset
            const x = (imageCanvas.width - imgWidth) / 2 + panOffset.x;
            const y = (imageCanvas.height - imgHeight) / 2 + panOffset.y;

            imageCtx.drawImage(currentImage, x, y, imgWidth, imgHeight);
        }
    };

    const loadImage = (filePath) => {
        currentImage = new Image();
        currentImage.src = filePath;
        currentImage.onload = () => {
            scale = 1.0; // Reset zoom
            panOffset = { x: 0, y: 0 }; // Reset pan
            drawImage();
            resizeImageCanvas();
        };
        currentImage.onerror = () => {
            console.error('Error loading image:', filePath);
            currentImage = null;
            drawImage();
        };
    };

    const updateImageSelect = () => {
        imageSelect.innerHTML = ''; // Clear previous options
        if (imageFiles.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'No images';
            imageSelect.appendChild(option);
            imageSelect.disabled = true;
            prevImageBtn.disabled = true;
            nextImageBtn.disabled = true;
        } else {
            imageFiles.forEach((file, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = path.basename(file); // Display just the filename
                imageSelect.appendChild(option);
            });
            imageSelect.disabled = false;
            prevImageBtn.disabled = false;
            nextImageBtn.disabled = false;
            imageSelect.value = currentImageIndex; // Set selected option
            loadImage(imageFiles[currentImageIndex]);
        }
    };

    openImageFolderBtn.addEventListener('click', async () => {
        try {
            const files = await window.electronAPI.openImageFolder();
            if (files && files.length > 0) {
                imageFiles = files;
                currentImageIndex = 0;
                updateImageSelect();
            } else {
                imageFiles = [];
                currentImageIndex = -1;
                currentImage = null;
                updateImageSelect();
                drawImage(); // Clear canvas if no images
            }
        } catch (error) {
            console.error('Error opening image folder:', error);
            // Optionally, show a user-friendly message
        }
    });

    imageSelect.addEventListener('change', (e) => {
        currentImageIndex = parseInt(e.target.value);
        loadImage(imageFiles[currentImageIndex]);
    });

    prevImageBtn.addEventListener('click', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            imageSelect.value = currentImageIndex;
            loadImage(imageFiles[currentImageIndex]);
        }
    });

    nextImageBtn.addEventListener('click', () => {
        if (currentImageIndex < imageFiles.length - 1) {
            currentImageIndex++;
            imageSelect.value = currentImageIndex;
            loadImage(imageFiles[currentImageIndex]);
        }
    });

    // --- Image Canvas Interaction ---
    const setActiveTool = (tool) => {
        activeTool = tool;
        // Update button styles to reflect active tool
        zoomInBtn.classList.remove('active-tool');
        zoomOutBtn.classList.remove('active-tool');
        panToolBtn.classList.remove('active-tool');
        defaultToolBtn.classList.remove('active-tool');

        if (tool === 'zoomIn') zoomInBtn.classList.add('active-tool');
        else if (tool === 'zoomOut') zoomOutBtn.classList.add('active-tool');
        else if (tool === 'pan') panToolBtn.classList.add('active-tool');
        else defaultToolBtn.classList.add('active-tool');

        // Adjust cursor based on active tool
        imageCanvas.style.cursor = tool === 'pan' ? 'grab' : 'default';
    };

    zoomInBtn.addEventListener('click', () => {
        scale *= 1.2; // Zoom in by 20%
        drawImage();
        setActiveTool('zoomIn');
    });

    zoomOutBtn.addEventListener('click', () => {
        scale /= 1.2; // Zoom out by 20%
        drawImage();
        setActiveTool('zoomOut');
    });

    panToolBtn.addEventListener('click', () => setActiveTool('pan'));
    defaultToolBtn.addEventListener('click', () => setActiveTool('default'));


    imageCanvas.addEventListener('mousedown', (e) => {
        if (activeTool === 'pan') {
            isPanning = true;
            startPan = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
            imageCanvas.style.cursor = 'grabbing';
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panOffset.x = e.clientX - startPan.x;
            panOffset.y = e.clientY - startPan.y;
            drawImage();
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        isPanning = false;
        if (activeTool === 'pan') {
            imageCanvas.style.cursor = 'grab';
        }
    });

    imageCanvas.addEventListener('mouseleave', () => {
        isPanning = false; // Stop panning if mouse leaves canvas
        if (activeTool === 'pan') {
            imageCanvas.style.cursor = 'grab';
        }
    });

    imageCanvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling
        const zoomFactor = 1.1; // Adjust this value for faster/slower zoom

        // Calculate mouse position relative to canvas
        const rect = imageCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate actual coordinates in the image before zooming
        const imgX = (mouseX - (imageCanvas.width / 2 + panOffset.x)) / scale;
        const imgY = (mouseY - (imageCanvas.height / 2 + panOffset.y)) / scale;

        if (e.deltaY < 0) {
            // Zoom in
            scale *= zoomFactor;
        } else {
            // Zoom out
            scale /= zoomFactor;
        }

        // Recalculate panOffset to keep the mouse point under the cursor
        panOffset.x = mouseX - (imageCanvas.width / 2 + imgX * scale);
        panOffset.y = mouseY - (imageCanvas.height / 2 + imgY * scale);

        drawImage();
    });


    // --- Procedure Editor Canvas (Middle Panel) ---
    const procedureCanvas = document.getElementById('procedureCanvas');
    const procedureCtx = procedureCanvas.getContext('2d');
    const overviewCanvas = document.getElementById('overviewCanvas');
    const overviewCtx = overviewCanvas.getContext('2d');
    const overviewWindow = document.querySelector('.overview-window');
    const toggleOverviewBtn = document.getElementById('toggle-overview-btn');
    const nodeContextMenu = document.getElementById('node-context-menu');
    const canvasContextMenu = document.getElementById('canvas-context-menu');
    const contextDeleteNode = document.getElementById('context-delete-node');
    const contextCopyNode = document.getElementById('context-copy-node');
    const contextPanMode = document.getElementById('context-pan-mode');
    const contextSelectMode = document.getElementById('context-select-mode');
    const contextClearSelection = document.getElementById('context-clear-selection');
    const contextDeleteAllConnections = document.getElementById('context-delete-all-connections');
    const contextDeleteSelectedConnection = document.getElementById('context-delete-selected-connection');


    let nodes = [];
    let connections = [];
    let scaleProcedure = 1.0;
    let offsetProcedure = { x: 0, y: 0 };
    let isDraggingCanvas = false;
    let dragStart = { x: 0, y: 0 };
    let dragOffset = { x: 0, y: 0 }; // Temporary offset during a drag
    let isDraggingNode = false;
    let selectedNode = null;
    let selectedConnection = null;
    let connectionStartNode = null;
    let connectionStartPort = null;

    let procedureMode = 'select'; // 'select' or 'pan'

    const NODE_WIDTH = 100;
    const NODE_HEIGHT = 40;
    const PORT_RADIUS = 5;

    // Simulate current selected node for double-click functionality
    // In a real app, this would be determined by user interaction.
    // For demonstration, let's pre-set a 'blur' type node.
    let simulatedSelectedNode = {
        id: 'node1',
        x: 50, y: 50,
        width: NODE_WIDTH, height: NODE_HEIGHT,
        name: 'Blur Image',
        type: 'blur', // Crucial for loading descriptor
        inputs: [{ id: 'in1', name: 'Input', connectedTo: null }],
        outputs: [{ id: 'out1', name: 'Output', connectedTo: null }]
    };
    nodes.push(simulatedSelectedNode); // Add this node to display


    // --- AI Insight Panel (Right Bottom) ---
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const generateInsightBtn = document.getElementById('generate-insight-btn');
    const aiLoadingIndicator = document.getElementById('ai-loading-indicator');
    const aiResponseOutput = document.getElementById('ai-response-output');

    generateInsightBtn.addEventListener('click', async () => {
        // Assume selectedNode is available from procedure editor interaction
        if (!selectedNode) {
            aiResponseOutput.textContent = 'Please select a node first.';
            return;
        }

        const prompt = aiPromptInput.value.trim();
        if (!prompt) {
            aiResponseOutput.textContent = 'Please enter a prompt.';
            return;
        }

        aiLoadingIndicator.classList.remove('hidden');
        aiResponseOutput.textContent = ''; // Clear previous response

        try {
            // Simulate API call for AI insight (replace with actual API call)
            const response = await simulateAIResponse(prompt, selectedNode);
            aiResponseOutput.textContent = response;
        } catch (error) {
            console.error('Error generating AI insight:', error);
            aiResponseOutput.textContent = 'Failed to generate insight. Please try again.';
        } finally {
            aiLoadingIndicator.classList.add('hidden');
        }
    });

    async function simulateAIResponse(prompt, node) {
        // In a real application, you'd make a fetch call to your AI model
        // For demonstration, a simple mock response based on node type
        return new Promise(resolve => {
            setTimeout(() => {
                let response = `AI Insight for node "${node.name}" (Type: ${node.type}):\n\n`;
                if (prompt.toLowerCase().includes('next steps')) {
                    response += `Next steps for the '${node.name}' node could involve:
                    1. Connecting its output to a 'display' or 'save' node.
                    2. Adjusting its parameters (e.g., blur intensity) in the properties panel.
                    3. Integrating it into a larger image processing pipeline.`;
                } else if (prompt.toLowerCase().includes('function')) {
                    response += `The '${node.name}' node, of type '${node.type}', typically performs a ${node.type} operation on an input image. For example, a 'blur' node applies a blurring filter to smooth an image.`;
                } else {
                    response += `Regarding your prompt "${prompt}", this '${node.name}' node is crucial for its ${node.type} functionality. Consider its role in the overall workflow.`;
                }
                resolve(response);
            }, 1500); // Simulate network delay
        });
    }


    // --- Procedure Canvas Drawing and Interaction ---

    const resizeProcedureCanvas = () => {
        const parent = procedureCanvas.parentElement;
        procedureCanvas.width = parent.clientWidth;
        procedureCanvas.height = parent.clientHeight;
        drawProcedureCanvas();
        drawOverview();
    };

    const drawProcedureCanvas = () => {
        procedureCtx.clearRect(0, 0, procedureCanvas.width, procedureCanvas.height);

        // Draw grid
        drawGrid();

        // Apply global transform for panning and zooming
        procedureCtx.save();
        procedureCtx.translate(offsetProcedure.x, offsetProcedure.y);
        procedureCtx.scale(scaleProcedure, scaleProcedure);

        // Draw connections first
        connections.forEach(conn => {
            drawConnection(conn);
        });

        // Draw nodes
        nodes.forEach(node => {
            drawNode(node);
        });

        // Restore context
        procedureCtx.restore();
    };

    const drawGrid = () => {
        const gridSize = 20 * scaleProcedure; // Grid scales with zoom
        procedureCtx.strokeStyle = '#3e4451'; // Darker grid lines
        procedureCtx.lineWidth = 0.5;

        const startX = offsetProcedure.x % gridSize;
        const startY = offsetProcedure.y % gridSize;

        for (let x = startX; x < procedureCanvas.width; x += gridSize) {
            procedureCtx.beginPath();
            procedureCtx.moveTo(x, 0);
            procedureCtx.lineTo(x, procedureCanvas.height);
            procedureCtx.stroke();
        }

        for (let y = startY; y < procedureCanvas.height; y += gridSize) {
            procedureCtx.beginPath();
            procedureCtx.moveTo(0, y);
            procedureCtx.lineTo(procedureCanvas.width, y);
            procedureCtx.stroke();
        }
    };

    const drawNode = (node) => {
        const x = node.x;
        const y = node.y;
        const width = node.width;
        const height = node.height;

        // Node background
        procedureCtx.fillStyle = node === selectedNode ? '#4B5361' : '#31363F'; // Darker background when selected
        procedureCtx.strokeStyle = '#61afef'; // Border color
        procedureCtx.lineWidth = node === selectedNode ? 2 : 1;
        roundRect(procedureCtx, x, y, width, height, 5); // Rounded rectangle
        procedureCtx.fill();
        procedureCtx.stroke();

        // Node name
        procedureCtx.fillStyle = '#abb2bf'; // Text color
        procedureCtx.font = '12px sans-serif';
        procedureCtx.textAlign = 'center';
        procedureCtx.textBaseline = 'middle';
        procedureCtx.fillText(node.name, x + width / 2, y + height / 2);

        // Input and Output Ports
        node.inputs.forEach((port, i) => {
            const portY = y + height / (node.inputs.length + 1) * (i + 1);
            drawPort(x, portY, 'input', port === connectionStartPort);
        });
        node.outputs.forEach((port, i) => {
            const portY = y + height / (node.outputs.length + 1) * (i + 1);
            drawPort(x + width, portY, 'output', port === connectionStartPort);
        });
    };

    const drawPort = (x, y, type, isConnecting = false) => {
        procedureCtx.beginPath();
        procedureCtx.arc(x, y, PORT_RADIUS, 0, Math.PI * 2);
        procedureCtx.fillStyle = isConnecting ? '#e6c07b' : '#c678dd'; // Highlight if starting connection
        procedureCtx.strokeStyle = '#282c34';
        procedureCtx.lineWidth = 1;
        procedureCtx.fill();
        procedureCtx.stroke();
    };

    const roundRect = (ctx, x, y, width, height, radius) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    const drawConnection = (conn) => {
        const startNode = nodes.find(n => n.id === conn.fromNodeId);
        const endNode = nodes.find(n => n.id === conn.toNodeId);

        if (!startNode || !endNode) return;

        const startPort = startNode.outputs.find(p => p.id === conn.fromPortId);
        const endPort = endNode.inputs.find(p => p.id === conn.toPortId);

        if (!startPort || !endPort) return;

        const startX = startNode.x + startNode.width;
        const startY = startNode.y + startNode.height / (startNode.outputs.length + 1) * (startNode.outputs.indexOf(startPort) + 1);
        const endX = endNode.x;
        const endY = endNode.y + endNode.height / (endNode.inputs.length + 1) * (endNode.inputs.indexOf(endPort) + 1);

        procedureCtx.strokeStyle = conn === selectedConnection ? '#e6c07b' : '#abb2bf'; // Highlight selected connection
        procedureCtx.lineWidth = conn === selectedConnection ? 2 : 1;
        procedureCtx.beginPath();
        procedureCtx.moveTo(startX, startY);
        const cp1x = startX + (endX - startX) * 0.5;
        const cp1y = startY;
        const cp2x = startX + (endX - startX) * 0.5;
        const cp2y = endY;
        procedureCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        procedureCtx.stroke();
    };


    const getTransformedPoint = (clientX, clientY) => {
        const rect = procedureCanvas.getBoundingClientRect();
        const x = (clientX - rect.left - offsetProcedure.x) / scaleProcedure;
        const y = (clientY - rect.top - offsetProcedure.y) / scaleProcedure;
        return { x, y };
    };

    const hitTestNode = (x, y) => {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
                return node;
            }
        }
        return null;
    };

    const hitTestPort = (x, y) => {
        for (const node of nodes) {
            // Input ports
            node.inputs.forEach((port, i) => {
                const portX = node.x;
                const portY = node.y + node.height / (node.inputs.length + 1) * (i + 1);
                const dist = Math.sqrt(Math.pow(x - portX, 2) + Math.pow(y - portY, 2));
                if (dist <= PORT_RADIUS) {
                    return { node: node, port: port, type: 'input' };
                }
            });
            // Output ports
            node.outputs.forEach((port, i) => {
                const portX = node.x + node.width;
                const portY = node.y + node.height / (node.outputs.length + 1) * (i + 1);
                const dist = Math.sqrt(Math.pow(x - portX, 2) + Math.pow(y - portY, 2));
                if (dist <= PORT_RADIUS) {
                    return { node: node, port: port, type: 'output' };
                }
            });
        }
        return null;
    };

    const hitTestConnection = (x, y) => {
        for (const conn of connections) {
            const startNode = nodes.find(n => n.id === conn.fromNodeId);
            const endNode = nodes.find(n => n.id === conn.toNodeId);
            if (!startNode || !endNode) continue;

            const startPort = startNode.outputs.find(p => p.id === conn.fromPortId);
            const endPort = endNode.inputs.find(p => p.id === conn.toPortId);
            if (!startPort || !endPort) continue;

            const startX = startNode.x + startNode.width;
            const startY = startNode.y + startNode.height / (startNode.outputs.length + 1) * (startNode.outputs.indexOf(startPort) + 1);
            const endX = endNode.x;
            const endY = endNode.y + endNode.height / (endNode.inputs.length + 1) * (endNode.inputs.indexOf(endPort) + 1);

            // Simple hit test for bezier curve: approximate with line segments or check distance to control points
            // For simplicity, check if the mouse is near the line segment connecting start and end points
            const dist = distToSegment({ x, y }, { x: startX, y: startY }, { x: endX, y: endY });
            if (dist < 10) { // Within 10 pixels of the connection
                return conn;
            }
        }
        return null;
    };

    // Helper function to calculate distance from point to line segment
    const distToSegment = (p, v, w) => {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.sqrt(Math.pow(p.x - projection.x, 2) + Math.pow(p.y - projection.y, 2));
    };


    const handleProcedureCanvasWheel = (e) => {
        e.preventDefault(); // Prevent page scrolling

        const zoomFactor = 1.1; // Adjust this value for faster/slower zoom
        const mousePoint = getTransformedPoint(e.clientX, e.clientY); // Mouse position in world coordinates

        if (e.deltaY < 0) { // Zoom in
            scaleProcedure *= zoomFactor;
        } else { // Zoom out
            scaleProcedure /= zoomFactor;
        }

        // Adjust offset to keep the mouse point fixed relative to the content
        offsetProcedure.x = e.clientX - (mousePoint.x * scaleProcedure);
        offsetProcedure.y = e.clientY - (mousePoint.y * scaleProcedure);

        drawProcedureCanvas();
        drawOverview();
    };


    const handleProcedureCanvasMouseDown = (e) => {
        if (e.button === 0) { // Left click
            const { x, y } = getTransformedPoint(e.clientX, e.clientY);

            selectedNode = hitTestNode(x, y);
            selectedConnection = null; // Clear connection selection on node/canvas click

            if (selectedNode) {
                isDraggingNode = true;
                dragStart = { x: e.clientX, y: e.clientY };
                dragOffset = { x: x - selectedNode.x, y: y - selectedNode.y }; // Offset from node origin
                procedureCanvas.style.cursor = 'grabbing';
            } else {
                const port = hitTestPort(x, y);
                if (port) {
                    connectionStartNode = port.node;
                    connectionStartPort = port.port;
                } else {
                    // Check if clicked on a connection
                    selectedConnection = hitTestConnection(x, y);
                    if (!selectedConnection) { // Only pan if not clicking on a node or connection
                        isDraggingCanvas = true;
                        dragStart = { x: e.clientX, y: e.clientY };
                        procedureCanvas.style.cursor = 'grabbing';
                    }
                }
            }
            drawProcedureCanvas(); // Redraw to highlight selection
        }
    };

    const handleProcedureCanvasMouseMove = (e) => {
        const { x, y } = getTransformedPoint(e.clientX, e.clientY);

        if (isDraggingNode && selectedNode) {
            selectedNode.x = x - dragOffset.x;
            selectedNode.y = y - dragOffset.y;
            drawProcedureCanvas();
            drawOverview();
        } else if (isDraggingCanvas) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            offsetProcedure.x += dx;
            offsetProcedure.y += dy;
            dragStart = { x: e.clientX, y: e.clientY }; // Update dragStart for continuous dragging
            drawProcedureCanvas();
            drawOverview();
        } else if (connectionStartNode) {
            // Draw a temporary connection line from the starting port to the current mouse position
            drawProcedureCanvas(); // Redraw canvas to clear previous temp line
            procedureCtx.save();
            procedureCtx.translate(offsetProcedure.x, offsetProcedure.y);
            procedureCtx.scale(scaleProcedure, scaleProcedure);

            const startX = connectionStartNode.x + connectionStartNode.width;
            const startY = connectionStartNode.y + connectionStartNode.height / (connectionStartNode.outputs.length + 1) * (connectionStartNode.outputs.indexOf(connectionStartPort) + 1);

            procedureCtx.strokeStyle = '#e6c07b';
            procedureCtx.lineWidth = 2;
            procedureCtx.beginPath();
            procedureCtx.moveTo(startX, startY);
            procedureCtx.lineTo(x, y);
            procedureCtx.stroke();

            procedureCtx.restore();
        } else {
            // Update cursor based on what's under the mouse
            updateProcedureCanvasCursor(x, y);
        }
    };

    const handleProcedureCanvasMouseUp = (e) => {
        isDraggingNode = false;
        isDraggingCanvas = false;
        procedureCanvas.style.cursor = 'default';

        if (connectionStartNode) {
            const { x, y } = getTransformedPoint(e.clientX, e.clientY);
            const targetPort = hitTestPort(x, y);

            if (targetPort && targetPort.type === 'input' && targetPort.node !== connectionStartNode) {
                // Check if this connection already exists
                const existingConnection = connections.find(c =>
                    c.fromNodeId === connectionStartNode.id &&
                    c.fromPortId === connectionStartPort.id &&
                    c.toNodeId === targetPort.node.id &&
                    c.toPortId === targetPort.port.id
                );

                if (!existingConnection) {
                    connections.push({
                        id: `conn-${Date.now()}`,
                        fromNodeId: connectionStartNode.id,
                        fromPortId: connectionStartPort.id,
                        toNodeId: targetPort.node.id,
                        toPortId: targetPort.port.id
                    });
                }
            }
            connectionStartNode = null;
            connectionStartPort = null;
        }
        drawProcedureCanvas(); // Redraw to finalize any connections
        drawOverview();
    };

    const updateProcedureCanvasCursor = (x, y) => {
        if (isDraggingCanvas || isDraggingNode || connectionStartNode) {
            // Cursor is already set by active drag/connection
            return;
        }

        const rect = procedureCanvas.getBoundingClientRect();
        const clientX = x * scaleProcedure + offsetProcedure.x + rect.left;
        const clientY = y * scaleProcedure + offsetProcedure.y + rect.top;

        if (hitTestNode(x, y) || hitTestPort(x, y)) {
            procedureCanvas.style.cursor = 'pointer';
        } else if (hitTestConnection(x, y)) {
            procedureCanvas.style.cursor = 'crosshair'; // Or a custom connection cursor
        }
        else {
            procedureCanvas.style.cursor = 'grab'; // Default for canvas
        }
    };

    const handleProcedureCanvasDragOver = (e) => {
        e.preventDefault(); // Allow drop
        e.dataTransfer.dropEffect = 'copy'; // Visual feedback
    };

    const handleProcedureCanvasDrop = (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        try {
            const droppedTool = JSON.parse(data);
            const { x, y } = getTransformedPoint(e.clientX, e.clientY);

            // Generate a unique ID for the new node
            const newNodeId = `node-${Date.now()}`;

            // Determine inputs/outputs based on tool type (simplified for example)
            let inputs = [{ id: `${newNodeId}-in1`, name: 'Input', connectedTo: null }];
            let outputs = [{ id: `${newNodeId}-out1`, name: 'Output', connectedTo: null }];

            if (droppedTool.category === 'Logic') {
                inputs = []; // Logic nodes might not have visual inputs/outputs
                outputs = [];
            } else if (droppedTool.name === 'folder' || droppedTool.name === 'camera') {
                inputs = []; // Capture nodes typically only have outputs
            } else if (droppedTool.name === 'blur' || droppedTool.name === 'resize' || droppedTool.name === 'threshold') {
                // Process nodes have input and output
            }


            const newNode = {
                id: newNodeId,
                x: x - NODE_WIDTH / 2, // Center node on drop point
                y: y - NODE_HEIGHT / 2,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                name: droppedTool.name.charAt(0).toUpperCase() + droppedTool.name.slice(1), // Capitalize name
                type: droppedTool.name, // Store original tool name as type
                inputs: inputs,
                outputs: outputs
            };
            nodes.push(newNode);
            drawProcedureCanvas();
            drawOverview();

            // Set the newly created node as selected for AI insight panel
            selectedNode = newNode;

        } catch (error) {
            console.error('Failed to parse dropped tool data:', error);
        }
    };

    const handleProcedureCanvasContextMenu = (e) => {
        e.preventDefault(); // Prevent default browser context menu

        const { x, y } = getTransformedPoint(e.clientX, e.clientY);
        const clickedNode = hitTestNode(x, y);
        const clickedConnection = hitTestConnection(x, y);

        hideContextMenus(); // Hide any active context menus

        if (clickedNode) {
            selectedNode = clickedNode; // Select the node under the cursor
            nodeContextMenu.style.left = `${e.clientX}px`;
            nodeContextMenu.style.top = `${e.clientY}px`;
            nodeContextMenu.classList.remove('hidden');
        } else if (clickedConnection) {
            selectedConnection = clickedConnection;
            // You'd ideally have a specific context menu for connections
            // For now, let's just make 'Delete Selected Connection' option visible/active
            canvasContextMenu.style.left = `${e.clientX}px`;
            canvasContextMenu.style.top = `${e.clientY}px`;
            canvasContextMenu.classList.remove('hidden');
            // Enable specific connection options
            document.getElementById('context-delete-selected-connection').style.display = 'block';
        } else {
            selectedNode = null; // Clear node selection
            selectedConnection = null; // Clear connection selection
            canvasContextMenu.style.left = `${e.clientX}px`;
            canvasContextMenu.style.top = `${e.clientY}px`;
            canvasContextMenu.classList.remove('hidden');
            // Hide specific connection options if no connection is selected
            document.getElementById('context-delete-selected-connection').style.display = 'none';
        }
        drawProcedureCanvas(); // Redraw to reflect selection if any
    };

    const hideContextMenus = () => {
        nodeContextMenu.classList.add('hidden');
        canvasContextMenu.classList.add('hidden');
    };

    // Hide context menus when clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!nodeContextMenu.contains(e.target) && !canvasContextMenu.contains(e.target)) {
            hideContextMenus();
        }
    });

    // Handle context menu actions
    contextDeleteNode.addEventListener('click', () => {
        if (selectedNode) {
            nodes = nodes.filter(n => n.id !== selectedNode.id);
            // Also remove any connections involving this node
            connections = connections.filter(c => c.fromNodeId !== selectedNode.id && c.toNodeId !== selectedNode.id);
            selectedNode = null;
            drawProcedureCanvas();
            drawOverview();
        }
        hideContextMenus();
    });

    contextCopyNode.addEventListener('click', () => {
        if (selectedNode) {
            // Simple copy: create a new node with offset
            const newNode = { ...selectedNode, id: `node-${Date.now()}`, x: selectedNode.x + 20, y: selectedNode.y + 20 };
            newNode.inputs = newNode.inputs.map(input => ({ ...input, id: `${newNode.id}-${input.id.split('-').pop()}` }));
            newNode.outputs = newNode.outputs.map(output => ({ ...output, id: `${newNode.id}-${output.id.split('-').pop()}` }));
            nodes.push(newNode);
            drawProcedureCanvas();
            drawOverview();
        }
        hideContextMenus();
    });

    contextPanMode.addEventListener('click', () => {
        procedureMode = 'pan';
        updateProcedureCanvasCursor();
        hideContextMenus();
    });

    contextSelectMode.addEventListener('click', () => {
        procedureMode = 'select';
        updateProcedureCanvasCursor();
        hideContextMenus();
    });

    contextClearSelection.addEventListener('click', () => {
        selectedNode = null;
        selectedConnection = null;
        drawProcedureCanvas();
        hideContextMenus();
    });

    contextDeleteAllConnections.addEventListener('click', () => {
        connections = [];
        drawProcedureCanvas();
        drawOverview();
        hideContextMenus();
    });

    contextDeleteSelectedConnection.addEventListener('click', () => {
        if (selectedConnection) {
            connections = connections.filter(c => c.id !== selectedConnection.id);
            selectedConnection = null;
            drawProcedureCanvas();
            drawOverview();
        }
        hideContextMenus();
    });


    // --- Overview Window ---
    const drawOverview = () => {
        overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
        overviewCtx.fillStyle = '#31363f'; // Background of overview
        overviewCtx.fillRect(0, 0, overviewCanvas.width, overviewCanvas.height);

        // Calculate content bounding box to fit in overview
        if (nodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(node => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        // Calculate scaling factor for the overview
        const padding = 10;
        const overviewScaleX = (overviewCanvas.width - padding * 2) / contentWidth;
        const overviewScaleY = (overviewCanvas.height - padding * 2) / contentHeight;
        const overviewScale = Math.min(overviewScaleX, overviewScaleY);

        // Center the content in the overview
        const offsetX = padding + (overviewCanvas.width - contentWidth * overviewScale) / 2 - minX * overviewScale;
        const offsetY = padding + (overviewCanvas.height - contentHeight * overviewScale) / 2 - minY * overviewScale;


        overviewCtx.save();
        overviewCtx.translate(offsetX, offsetY);
        overviewCtx.scale(overviewScale, overviewScale);

        // Draw nodes in overview
        nodes.forEach(node => {
            overviewCtx.fillStyle = node === selectedNode ? '#4B5361' : '#3e4451'; // Darker background when selected
            overviewCtx.strokeStyle = '#61afef';
            overviewCtx.lineWidth = 1 / overviewScale; // Scale line width
            overviewCtx.fillRect(node.x, node.y, node.width, node.height);
            overviewCtx.strokeRect(node.x, node.y, node.width, node.height);
        });

        // Draw connections in overview (simplified)
        connections.forEach(conn => {
            const startNode = nodes.find(n => n.id === conn.fromNodeId);
            const endNode = nodes.find(n => n.id === conn.toNodeId);
            if (!startNode || !endNode) return;

            const startX = startNode.x + startNode.width;
            const startY = startNode.y + startNode.height / 2;
            const endX = endNode.x;
            const endY = endNode.y + endNode.height / 2;

            overviewCtx.strokeStyle = '#abb2bf';
            overviewCtx.lineWidth = 0.5 / overviewScale;
            overviewCtx.beginPath();
            overviewCtx.moveTo(startX, startY);
            overviewCtx.lineTo(endX, endY);
            overviewCtx.stroke();
        });

        // Draw viewport rectangle in overview
        const viewportX = -offsetProcedure.x / scaleProcedure;
        const viewportY = -offsetProcedure.y / scaleProcedure;
        const viewportWidth = procedureCanvas.width / scaleProcedure;
        const viewportHeight = procedureCanvas.height / scaleProcedure;

        overviewCtx.strokeStyle = '#e6c07b'; // Highlight color for viewport
        overviewCtx.lineWidth = 2 / overviewScale;
        overviewCtx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

        overviewCtx.restore();
    };

    toggleOverviewBtn.addEventListener('click', () => {
        overviewWindow.classList.toggle('hidden');
        toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▲' : '▼';
        if (!overviewWindow.classList.contains('hidden')) {
            drawOverview(); // Redraw if shown
        }
    });

    // --- Dynamic Tool Loading (Left Panel) ---
    const loadToolsIntoLeftPanel = async () => {
        try {
            // In a real Electron app, you'd use ipcRenderer.invoke to get this from main process
            // For now, let's simulate loading from a JSON file path if we were in the main process
            const moduleJsonPath = path.join(__dirname, 'module.json');
            const moduleData = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));

            const toolList = document.createElement('div');
            toolList.classList.add('tool-list');

            moduleData.module.forEach(categoryObj => {
                const categoryName = Object.keys(categoryObj)[0];
                const tools = categoryObj[categoryName];

                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('tool-category');
                categoryDiv.innerHTML = `<h3>${categoryName}</h3>`;

                tools.forEach(toolName => {
                    const toolBtn = document.createElement('button');
                    toolBtn.classList.add('tool-button');
                    toolBtn.textContent = toolName.charAt(0).toUpperCase() + toolName.slice(1); // Capitalize first letter
                    toolBtn.draggable = true;
                    toolBtn.dataset.toolData = JSON.stringify({ category: categoryName, name: toolName });

                    toolBtn.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', toolBtn.dataset.toolData);
                        e.dataTransfer.effectAllowed = 'copy';
                    });
                    categoryDiv.appendChild(toolBtn);
                });
                toolList.appendChild(categoryDiv);
            });
            leftPanel.appendChild(toolList);
        } catch (error) {
            console.error('Failed to load tools:', error);
            leftPanel.innerHTML = '<p style="color: red;">Error loading tools.</p>';
        }
    };


    // --- Double-click Handler for Nodes (NEW) ---
    procedureCanvas.addEventListener('dblclick', (e) => {
        const { x, y } = getTransformedPoint(e.clientX, e.clientY);
        const doubleClickedNode = hitTestNode(x, y);

        if (doubleClickedNode) {
            selectedNode = doubleClickedNode; // Ensure the double-clicked node is selected
            console.log('Double-clicked node:', selectedNode.name, selectedNode.type);
            // Request main process to open the detail window
            if (window.electronAPI && window.electronAPI.openNodeDetail) {
                window.electronAPI.openNodeDetail(selectedNode.type);
            } else {
                console.error('electronAPI.openNodeDetail not available. Is preload.js configured correctly?');
            }
        }
    });


    // --- Initial Setup ---
    window.addEventListener('resize', () => {
        resizeImageCanvas();
        resizeProcedureCanvas();
    });
    // Set initial active tool for image viewer
    setActiveTool('default');
    // Ensure overview is initially hidden if you prefer that
    overviewWindow.classList.add('hidden'); // Ensure it starts hidden
    toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▲' : '▼';
    // initial procedure canvas draw
    resizeProcedureCanvas();

    // Call the function to load tools dynamically
    loadToolsIntoLeftPanel();

    // Attach all procedure canvas interaction listeners
    procedureCanvas.addEventListener('wheel', handleProcedureCanvasWheel);
    procedureCanvas.addEventListener('mousedown', handleProcedureCanvasMouseDown);
    procedureCanvas.addEventListener('mousemove', handleProcedureCanvasMouseMove);
    procedureCanvas.addEventListener('mouseup', handleProcedureCanvasMouseUp);
    procedureCanvas.addEventListener('dragover', handleProcedureCanvasDragOver);
    procedureCanvas.addEventListener('drop', handleProcedureCanvasDrop);
    procedureCanvas.addEventListener('contextmenu', handleProcedureCanvasContextMenu);

    // Initial cursor update
    updateProcedureCanvasCursor();

    // This is the end of the code
});

