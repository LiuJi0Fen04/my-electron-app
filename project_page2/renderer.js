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
    const resizerHeight = getCssProperty(rightTopBottomResizer, 'height'); // Assuming vertical resizer has same height

    leftMiddleResizer.addEventListener('mousedown', (e) => startResizing(e, leftMiddleResizer));
    middleRightResizer.addEventListener('mousedown', (e) => startResizing(e, middleRightResizer));
    rightTopBottomResizer.addEventListener('mousedown', (e) => startResizing(e, rightTopBottomResizer));
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResizing);

    function startResizing(e, resizer) {
        isResizing = true;
        activeResizer = resizer;
        activeResizer.classList.add('active');
        document.body.style.userSelect = 'none'; // Prevent text selection during resize
        document.body.style.cursor = resizer.style.cursor; // Set cursor for the body
        

    }

    function doResize(e) {
        if (!isResizing) {
            return;
        }

        const containerRect = container.getBoundingClientRect();

        if (activeResizer === leftMiddleResizer) {
            // Calculate new width for left panel
            let newLeftWidth = e.clientX - containerRect.left;

            // Ensure middle and right panels have enough space
            const remainingWidth = containerRect.width - newLeftWidth - resizerWidth - minMiddleWidth - minRightWidth - resizerWidth;
            
            // Calculate max width for left panel based on minimums of other panels
            const maxLeftWidth = containerRect.width - minMiddleWidth - minRightWidth - (2 * resizerWidth);

            // Apply constraints
            newLeftWidth = Math.max(newLeftWidth, minLeftWidth);
            newLeftWidth = Math.min(newLeftWidth, maxLeftWidth);

            leftPanel.style.width = `${newLeftWidth}px`;

        } else if (activeResizer === middleRightResizer) {
            // Calculate new width for right panels container
            let newRightWidth = containerRect.right - e.clientX;

            const left_panel_width = getCssProperty(leftPanel, 'width');
            // Calculate max width for right panel based on minimums of other panels
            const maxRightWidth = containerRect.width - left_panel_width - minMiddleWidth - (2 * resizerWidth);
            
            // Apply constraints
            newRightWidth = Math.max(newRightWidth, minRightWidth);
            newRightWidth = Math.min(newRightWidth, maxRightWidth);

            rightPanelsContainer.style.width = `${newRightWidth}px`;

        } else if (activeResizer === rightTopBottomResizer) {
            const rightPanelsContainerRect = rightPanelsContainer.getBoundingClientRect();
            let newTopHeight = e.clientY - rightPanelsContainerRect.top;

            // Calculate max height for top panel based on minimums of bottom panel
            const maxTopHeight = rightPanelsContainerRect.height - minBottomHeight - resizerHeight;

            // Apply constraints
            newTopHeight = Math.max(newTopHeight, minTopHeight);
            newTopHeight = Math.min(newTopHeight, maxTopHeight);
            rightTopPanel.style.height = `${newTopHeight}px`;
            // The bottom panel will automatically adjust due to flex-grow: 1
        }
        // Redraw canvases on resize to ensure content scales correctly
        // resizeImageCanvas();
    }

    function stopResizing() {
        isResizing = false;
        if (activeResizer) {
            activeResizer.classList.remove('active');
            activeResizer = null;
        }
        document.body.style.userSelect = ''; // Re-enable text selection
        document.body.style.cursor = ''; // Reset cursor
        resizeImageCanvas(true);
    }

    // --- Image Viewer Canvas ---
    const imageCanvas = document.getElementById('imageCanvas');
    const imageCtx = imageCanvas.getContext('2d');
    const openFolderBtn = document.getElementById('open-folder-btn');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    // show image -------------------------------------------------------------------------------------------------------------------
    let currentImage = new Image();
    let loadedImages = []; // Array of { src: base64, path: originalPath }
    let imagePan = { x: 0, y: 0 };
    let imageZoom = 1.0;
    let drawingShape = null; // { type: 'rectangle'/'circle', startX, startY, endX, endY }
    let drawnShapes = []; // Array to store completed shapes
    let thumbnail_width = 0;
    let scrollbar_width = 0;

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
                thumbnail_width = document.querySelector('.thumbnail-item').getBoundingClientRect().width;
                scrollbar_width = thumbnailGallery.offsetWidth - thumbnailGallery.clientWidth;
                // Display the first image by default
                displayImage(0);
                if (loadedImages.length > 0) {
                    thumbnailGallery.querySelector('.thumbnail-item').classList.add('active');
                }
            } else if (result.error) {
                alert(`Error opening folder: ${result.error}`);
            };
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


    function resizeImageCanvas(initial = false) {
        const container = imageCanvas.parentElement;

        imageCanvas.width = container.clientWidth - thumbnail_width - scrollbar_width - 5;
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


    // this is the end of the code 
});
