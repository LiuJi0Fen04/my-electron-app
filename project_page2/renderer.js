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

    // --- 1. resizer ---  ---------------------------------------------------------------------------------------
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
            resizeProcedureCanvas();

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
            resizeProcedureCanvas();

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
        if (!isResizing) {
            return;
        }
        isResizing = false;
        if (activeResizer) {
            activeResizer.classList.remove('active');
            activeResizer = null;
        }
        document.body.style.userSelect = ''; // Re-enable text selection
        document.body.style.cursor = ''; // Reset cursor
        resizeImageCanvas(true);
    }

    // --- 2. Image Viewer Canvas ---  ---------------------------------------------------------------------------------------
    const imageCanvas = document.getElementById('imageCanvas');
    const imageCtx = imageCanvas.getContext('2d');
    const openFolderBtn = document.getElementById('open-folder-btn');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    // show image 
    let currentImage = new Image();
    let imageFiles = [];
    let folderPath = '';
    let imagePan = { x: 0, y: 0 };
    let imageZoom = 1.0;
    let drawingShape = null; // { type: 'rectangle'/'circle', startX, startY, endX, endY }
    let drawnShapes = []; // Array to store completed shapes
    let thumbnail_width = 0; // for record the width of thumbnail 
    let scrollbar_width = 0; // for record the width of scrollbar
    let activeImageIndex = -1; // Keep track of the currently active image index

    // Virtual scrolling flag: set to 1 to enable virtual scrolling, 0 for Intersection Observer
    const virtual_scroll_flag = 1;

    if (virtual_scroll_flag){
        let totalCount = 0;
        const buffer = 5; // render 5 extra images above and below view
        const imageHeight = 64; // thumbnail item height (60px) + vertical gap (10px) = 70px. Adjust this if your CSS gap changes!

        // Create spacer elements once at initialization
        const topSpacer = document.createElement('div');
        topSpacer.id = 'top-spacer';
        thumbnailGallery.prepend(topSpacer); // Add to the beginning

        const bottomSpacer = document.createElement('div');
        bottomSpacer.id = 'bottom-spacer';
        thumbnailGallery.appendChild(bottomSpacer); // Add to the end

        /**
         * create resized thumbnail image
         * @param {*} filePath 
         * @param {*} maxWidth 
         * @param {*} maxHeight 
         * @returns 
         */
        function createThumbnail(filePath, maxWidth = 200, maxHeight = 200) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
        
                    // Calculate new dimensions while preserving aspect ratio
                    let ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                    let width = img.width * ratio;
                    let height = img.height * ratio;
        
                    canvas.width = width;
                    canvas.height = height;
        
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
        
                    // Get the resized image as a Data URL
                    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 0.7 = quality
        
                    resolve(thumbnailDataUrl);
                };
                img.onerror = reject;
        
                img.src = filePath;
            });
        }


        /**
         * Renders the visible thumbnails based on scroll position.
         * This function uses absolute positioning and spacers for virtual scrolling.
         */
        function renderVisibleThumbnails() {
            const scrollTop = thumbnailGallery.scrollTop;
            const containerHeight = thumbnailGallery.clientHeight;
            // Calculate start and end index for visible items, including buffer
            const startIdx = Math.max(0, Math.floor(scrollTop / imageHeight) - buffer);
            const endIdx = Math.min(totalCount, Math.ceil((scrollTop + containerHeight) / imageHeight) + buffer);

            // Get currently rendered items to determine what to remove and what to add
            const currentRenderedItems = thumbnailGallery.querySelectorAll('.thumbnail-item');
            const currentRenderedIndexes = new Set(Array.from(currentRenderedItems).map(item => parseInt(item.dataset.index)));

            const itemsToAdd = new Set();
            const itemsToKeep = new Set();

            // Populate itemsToAdd and itemsToKeep based on the new visible range
            for (let i = startIdx; i < endIdx; i++) {
                if (!currentRenderedIndexes.has(i)) {
                    itemsToAdd.add(i);
                } else {
                    itemsToKeep.add(i);
                }
            }

            // Remove items that are no longer visible
            currentRenderedIndexes.forEach(index => {
                if (!itemsToKeep.has(index)) {
                    const item = thumbnailGallery.querySelector(`.thumbnail-item[data-index="${index}"]`);
                    if (item) {
                        item.remove();
                    }
                }
            });

            // Add new items
            itemsToAdd.forEach(i => {
                const thumbDiv = document.createElement('div');
                thumbDiv.classList.add('thumbnail-item');
                thumbDiv.dataset.index = i;
                thumbDiv.style.position = 'absolute'; // Crucial for absolute positioning
                thumbDiv.style.top = `${i * imageHeight}px`; // Position based on calculated index height

                const file = imageFiles[i];
                const filePath = `file://${folderPath}/${file}`;

                const img = document.createElement('img');
                const memory_save = 0;
                if(memory_save){
                    createThumbnail(filePath).then(thumbnailUrl => {
                        img.src = thumbnailUrl;
                        img.alt = `Thumbnail ${i + 1}`;
                        thumbDiv.appendChild(img);
                    });                    
                }
                else{
                    img.src = filePath;
                    img.alt = `Thumbnail ${i + 1}`;
                    img.title = file;
                    thumbDiv.appendChild(img);                    
                }



                // Add active class if this is the currently displayed image
                if (i === activeImageIndex) {
                    thumbDiv.classList.add('active');
                }

                thumbDiv.addEventListener('click', () => {
                    displayImage(i);
                    // No need to remove/add active class here, displayImage handles it
                });

                // Insert the new thumbnail in the correct sorted position to maintain order
                let inserted = false;
                const existingThumbnails = thumbnailGallery.querySelectorAll('.thumbnail-item');
                for (let j = 0; j < existingThumbnails.length; j++) {
                    if (parseInt(existingThumbnails[j].dataset.index) > i) {
                        thumbnailGallery.insertBefore(thumbDiv, existingThumbnails[j]);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    thumbnailGallery.insertBefore(thumbDiv, bottomSpacer); // Insert before the bottom spacer if it's the last
                }
            });

            // Adjust spacer heights to simulate the total scrollable height
            topSpacer.style.height = `${startIdx * imageHeight}px`;
            bottomSpacer.style.height = `${(totalCount - endIdx) * imageHeight}px`;
        }

        openFolderBtn.addEventListener('click', async () => {
            if (typeof window.electronAPI !== 'undefined') {
                const result = await window.electronAPI.openImageFolder();
                if (result.success && result.images.length > 0) {
                    totalCount = result.images.length;
                    folderPath = result.folderPath;
                    imageFiles = result.images;
                    
                    // Clear existing thumbnails (but keep the spacers)
                    Array.from(thumbnailGallery.children).forEach(child => {
                        if (child.classList.contains('thumbnail-item')) {
                            child.remove();
                        }
                    });

                    if (imageFiles.length === 0) {
                        currentImage.src = '';
                        currentImage.alt = 'No supported image formats found in this folder.';
                        // Also reset totalCount and spacer heights if no images
                        totalCount = 0;
                        topSpacer.style.height = '0px';
                        bottomSpacer.style.height = '0px';
                        return;
                    }
                    
                    // Initial render of visible thumbnails
                    renderVisibleThumbnails();
                    
                    let lastScrollTop = 0;
                    let lastTimestamp = performance.now();
                    let scrollTimeout = null;
                    let speedExcedRecord = 0;
                    let scrollStopTimer;
                    // Add scroll event listener for continuous rendering
                    thumbnailGallery.addEventListener('scroll', () => {
                        speedExcedRecord = 0;
                        const now = performance.now();
                        const currentScrollTop = thumbnailGallery.scrollTop;
                        
                        const deltaY = Math.abs(currentScrollTop - lastScrollTop);
                        const deltaTime = now - lastTimestamp;
                        const scrollSpeed = deltaY / deltaTime; // px per ms
                        console.log('scrollSpeed, deltaTime: ', scrollSpeed, deltaTime);
                        if(scrollSpeed < 0.4){
                            if (!scrollTimeout){
                                scrollTimeout = setTimeout(() => {
                                    renderVisibleThumbnails();
                                    scrollTimeout = null;
                                    speedExcedRecord = 0;
                                    // console.log('low speed stop and loading image');
                                }, 0);
                            }
                        }
                        else{
                            speedExcedRecord = 1;
                        }
                        lastScrollTop = currentScrollTop;
                        lastTimestamp = now;

                        // prevent stopping at high speed scrolling
                        clearTimeout(scrollStopTimer);
                        scrollStopTimer = setTimeout(() => {
                            if(speedExcedRecord == 1){
                                console.log('high speed stop and loading image');
                                renderVisibleThumbnails();                        
                            }
                        }, 20);
                    });    
                    
                    // Calculate thumbnail width and scrollbar width
                    // Assuming .thumbnail-item has a fixed width of 80px + 2*2px border = 84px for calculation
                    // Or, dynamically measure one if it's rendered
                    const tempThumb = document.createElement('div');
                    tempThumb.classList.add('thumbnail-item');
                    // Temporarily append to body to get computed style if not already in DOM
                    document.body.appendChild(tempThumb);
                    thumbnail_width = tempThumb.getBoundingClientRect().width;
                    tempThumb.remove(); // Clean up

                    scrollbar_width = thumbnailGallery.offsetWidth - thumbnailGallery.clientWidth;
                    
                    // Display the first image by default
                    displayImage(0);
                    // The displayImage function will now handle adding the 'active' class
                } else if (result.error) {
                    // Using a custom message box instead of alert() as per instructions
                    dialog.showMessageBox(mainWindow, {
                        type: 'error',
                        title: 'Error',
                        message: `Error opening folder: ${result.error}`
                    });
                } else if (result.canceled) {
                    console.log('Folder selection canceled.');
                }
            }
        });
    } // End of virtual scrolling block
    else{
        // create the intersection observer
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting){
                    const thumb = entry.target.querySelector('img');
                    const realSrc = thumb.dataset.src; // get the real image path from the data-src

                    // set the real image path to the src attribute
                    thumb.src = realSrc;
                    // once loaded, we don't need to observe it any more
                    observer.unobserve(entry.target); // Observe the div, not the img
                }
            });
        }, {
            // use thumbnailGallery as the area to track intersection (viewPort)
            root: thumbnailGallery,
            // add a margin to load images just before they become visible
            rootMargin: '500px 0px 500px 0px'   // top right bottom left
        });

        openFolderBtn.addEventListener('click', async () => {
            if (typeof window.electronAPI !== 'undefined') {
                const result = await window.electronAPI.openImageFolder();
                if (result.success && result.images.length > 0) {
                    folderPath = result.folderPath;
                    imageFiles = result.images;
                    thumbnailGallery.innerHTML = ''; // Clear existing thumbnails
    
                    if (imageFiles.length === 0) {
                        currentImage.src = '';
                        currentImage.alt = 'No supported image formats found in this folder.';
                        return;
                    }
    
                    imageFiles.forEach((file, index) => {
                        const thumbDiv = document.createElement('div');
                        thumbDiv.classList.add('thumbnail-item');
                        thumbDiv.dataset.index = index;
    
                        const filePath = `file://${folderPath}/${file}`;
    
                        const img = document.createElement('img');
                        img.dataset.src = filePath; // Store real path in data-src
                        img.alt = `Thumbnail ${index + 1}`;
                        thumbDiv.appendChild(img);
    
                        thumbDiv.addEventListener('click', () => {
                            displayImage(index);
                            // displayImage now handles active class removal/addition
                        });
                        thumbnailGallery.appendChild(thumbDiv);
                        observer.observe(thumbDiv); // Observe the thumbnail div
                    });
                    
                    // Calculate thumbnail width and scrollbar width after thumbnails are added
                    if (imageFiles.length > 0) {
                        // Assuming .thumbnail-item has a fixed width of 80px + 2*2px border = 84px for calculation
                        const firstThumb = document.querySelector('.thumbnail-item');
                        if (firstThumb) {
                            thumbnail_width = firstThumb.getBoundingClientRect().width;
                        } else {
                            // Fallback if no thumbnails are immediately available (e.g., if gallery is empty)
                            thumbnail_width = 84; // Default based on CSS
                        }
                    }
                    scrollbar_width = thumbnailGallery.offsetWidth - thumbnailGallery.clientWidth;

                    // Display the first image by default
                    displayImage(0);
                } else if (result.error) {
                    // Using a custom message box instead of alert() as per instructions
                    dialog.showMessageBox(mainWindow, {
                        type: 'error',
                        title: 'Error',
                        message: `Error opening folder: ${result.error}`
                    });
                } else if (result.canceled) {
                    console.log('Folder selection canceled.');
                }
            }
        });
    } // End of intersection observer block

    /**
     * Displays the image at the given index on the main canvas.
     * Also updates the 'active' class on the corresponding thumbnail.
     * @param {number} index - The index of the image to display.
     */
    function displayImage(index) {
        if (index >= 0 && index < imageFiles.length) {
            activeImageIndex = index; // Update the active index
            currentImage.src = `file://${folderPath}/${imageFiles[index]}`;
            currentImage.onload = () => {
                resizeImageCanvas(true); // Recalculate pan/zoom for new image
            };
            drawnShapes = []; // Clear shapes when new image is displayed

            // Remove 'active' class from all thumbnails
            document.querySelectorAll('.thumbnail-item').forEach(item => item.classList.remove('active'));
            
            // Add 'active' class to the newly selected thumbnail
            const activeThumb = thumbnailGallery.querySelector(`.thumbnail-item[data-index="${index}"]`);
            if (activeThumb) {
                activeThumb.classList.add('active');
            }
            // If using virtual scrolling, the active thumbnail might not be rendered yet.
            // When it gets rendered, renderVisibleThumbnails will apply the active class.
        }
    }

    /**
     * Resizes the image canvas and redraws the image and shapes.
     * @param {boolean} initial - If true, recalculates initial pan and zoom to fit the image.
     */
    function resizeImageCanvas(initial = false) {
        const container = imageCanvas.parentElement;

        // Adjust canvas width based on container width and thumbnail gallery width
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

    /**
     * Draws the current image and any drawn shapes on the canvas.
     */
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
                // Scale shape coordinates based on current zoom and pan
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

            // Draw current drawing shape (if any)
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

    // # 3. image canvas event -------------------------------------------------------------------------------------------------------------------------------

    let activeTool = 'default'; // 'default', 'rectangle', 'circle', 'pan'
    let isPanningImage = false;

    imageCanvas.addEventListener('mousedown', handleImageCanvasMouseDown);
    imageCanvas.addEventListener('mousemove', handleImageCanvasMouseMove);
    imageCanvas.addEventListener('mouseup', handleImageCanvasMouseUp);
    imageCanvas.addEventListener('mouseleave', handleImageCanvasMouseLeave);
    imageCanvas.addEventListener('wheel', handleImageCanvasWheel);

    function setActiveTool(tool) {
        // document.querySelectorAll('.tool-area').forEach(btn => btn.classList.remove('active'));
        // const toolBtn = document.getElementById(`${tool}-tool`);
        // if (toolBtn) {
        //     toolBtn.classList.add('active');
        // }
        activeTool = tool;
        imageCanvas.style.cursor = (tool === 'pan') ? 'grab' : 'crosshair';
        if (tool === 'default') {
            imageCanvas.style.cursor = 'default';
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

    /**
     * when mouse up in imageCanvas area sets the curse as default
     * @param mouse_event e 
     */
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

    // --- Procedure Editor Canvas --- -----------------------------------------------------------------------------
    const procedureCanvas = document.getElementById('procedureCanvas');
    const procedureCtx = procedureCanvas.getContext('2d');
    const overviewCanvas = document.getElementById('overviewCanvas');
    const overviewCtx = overviewCanvas.getContext('2d');
    const toggleOverviewBtn = document.getElementById('toggle-overview-btn');
    const overviewWindow = document.querySelector('.overview-window');

    let procedurePan = { x: 0, y: 0 };
    let procedureZoom = 1.0;
    const PROCEDURE_CANVAS_ZOOM_FACTOR = 0.1;

    let over_rect = overviewCanvas.getBoundingClientRect();

    let isPanningProcedureCanvas = false; // For panning the canvas itself
    let lastPanMouseX = 0;
    let lastPanMouseY = 0;

    const tools = document.querySelectorAll('.tool');
    const addNodeButtons = document.querySelectorAll('.add-nodes-button');
    const clearNodeBtn = document.getElementById('clear-nodes-btn')
    const nodeContextMenu = document.getElementById('node-context-menu');
    const contextDeleteNodeBtn = document.getElementById('context-delete-node');
    const contextCopyNodeBtn = document.getElementById('context-copy-node');
    let procedureNodes = []; // Stores {id, type, text, x, y, width, height}
    let isDraggingNode = false; // For dragging existing nodes on canvas
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let selectedNode = null; // Currently selected node for dragging/context menu
    const NODE_WIDTH = 120;
    const NODE_HEIGHT = 40;

    // Toggle overview window
    toggleOverviewBtn.addEventListener('click', () => {

        overviewWindow.classList.toggle('hidden');
        toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▲' : '▼';

        // Redraw overview if it becomes visible
        if (!overviewWindow.classList.contains('hidden')) {
            over_rect = overviewCanvas.getBoundingClientRect();
            console.log('show overview height: ', over_rect.height);    
            resizeProcedureCanvas(); // This will redraw overview
        }
        else{
            over_rect = overviewCanvas.getBoundingClientRect();
            console.log('hidden overview height: ', over_rect.height);            
        }
    });

    function resizeProcedureCanvas(initial = false) {
        const container = procedureCanvas.parentElement;
        procedureCanvas.width = container.clientWidth;
        procedureCanvas.height = container.clientHeight;   // 会导致overview在拖拽的时候超出最低界限，高度变高，实际上应该是procedureCanvas的parent无定义？
        // console.log('container.clientHeight: ', procedureCanvas.height);
        overviewCanvas.width = overviewWindow.clientWidth;
        overviewCanvas.height = overviewWindow.clientHeight;
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
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
    }
    

    function drawProcedureCanvas() {
        procedureCtx.clearRect(0, 0, procedureCanvas.width, procedureCanvas.height);
        procedureCtx.save();
        procedureCtx.translate(procedurePan.x, procedurePan.y);
        procedureCtx.scale(procedureZoom, procedureZoom);
        drawGrid(procedureCtx, procedureCanvas.width, procedureCanvas.height, procedureZoom, procedurePan.x, procedurePan.y);

        procedureNodes.forEach(node => {
            const { x, y } = node;
            const width = node.width;
            const height = node.height;

            procedureCtx.fillStyle = getNodeColor(node.type);
            procedureCtx.strokeStyle = selectedNode === node ? '#61afef' : '#5c6370';
            procedureCtx.lineWidth = selectedNode === node ? 3 : 1;
            drawRoundedRect(procedureCtx, x, y, width, height, 8);
            procedureCtx.fill();
            procedureCtx.stroke();
            // procedureCtx.fillRect(x, y, width, height);
            // procedureCtx.strokeRect(x, y, width, height);

            procedureCtx.fillStyle = '#ffffff';
            procedureCtx.font = `${14}px Arial`;
            procedureCtx.textAlign = 'center';
            procedureCtx.textBaseline = 'middle';
            procedureCtx.fillText(node.text, x + width / 2, y + height / 2);
        });
        procedureCtx.restore();
    }

    function getNodeColor(type) {
        switch (type) {
            case 'Camera': return '#98c379';
            case 'Folder': return '#98c379';
            case 'Sharpness': return '#e6c07b';
            case 'Blur': return '#e6c07b';
            case 'Threshold': return '#e6c07b';
            case 'Line Detection': return '#61afef';
            case 'Circle Detection': return '#61afef';
            case 'If': return '#e06c75';
            case 'While': return '#e06c75';
            case 'For': return '#e06c75';
            default: return '#abb2bf';
        }
    }

    function drawGrid(ctx, canvasWidth, canvasHeight, zoom, panX, panY, gridSize = 20) {
        ctx.strokeStyle = '#4b5263';
        ctx.lineWidth = 0.5;
        // console.log('grid zoom: ', zoom);
        const scaledGridSize = gridSize;
        const px_d_zoom = panX / zoom;
        const py_d_zoom = panY / zoom;
        const start_x = px_d_zoom - (px_d_zoom) % scaledGridSize
        const start_y = py_d_zoom - (py_d_zoom) % scaledGridSize
        // console.log('gird x shift num, gird y shift num: ', start_x / zoom, start_y / zoom);
        // console.log('(px_d_zoom) % scaledGridSize: ', (px_d_zoom) % scaledGridSize);
        for (let x = -start_x; x < (canvasWidth - panX) / zoom; x += scaledGridSize) {
            ctx.beginPath();
            ctx.moveTo(x, - py_d_zoom);
            ctx.lineTo(x, (canvasHeight - panY) / zoom);
            ctx.stroke();
        }
        for (let y = -start_y; y < (canvasHeight - panY) / zoom; y += scaledGridSize) {
            ctx.beginPath();
            ctx.moveTo(-px_d_zoom, y);
            ctx.lineTo((canvasWidth - panX) / zoom, y);
            ctx.stroke();
        }
    }

    // --- utility functions for procedure canvas corrdinates ---
    function getProcedureMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    // new added
    function worldToProcedureCanvasCoords(worldX, worldY) {
        const canvasX = (worldX) * procedureZoom + procedurePan.x;
        const canvasY = (worldY) * procedureZoom + procedurePan.y;
        return { x: canvasX, y: canvasY };
    }

    function procedureCanvasToWorldCoords(canvasX, canvasY) {
        const worldX = (canvasX - procedurePan.x) / procedureZoom;
        const worldY = (canvasY - procedurePan.y) / procedureZoom;
        return { x: worldX, y: worldY };
    }
    // --- FINISH: utility functions for procedure canvas corrdinates ---
    function handleProcedureCanvasWheel(e) {
        e.preventDefault();

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePosBeforeZoom = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        const scale = Math.exp(-e.deltaY * 0.001 * PROCEDURE_CANVAS_ZOOM_FACTOR);
        const oldZoom = procedureZoom;
        procedureZoom = Math.min(Math.max(0.5, procedureZoom * scale), 4);

        procedurePan.x = mousePos.x - (worldMousePosBeforeZoom.x * procedureZoom);
        procedurePan.y = mousePos.y - (worldMousePosBeforeZoom.y * procedureZoom);
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

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
            procedureCanvas.style.cursor = 'grabbing';
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
        } 
        else if (isPanningProcedureCanvas && e.buttons === 1) {
            const deltaX = e.clientX - lastPanMouseX;
            const deltaY = e.clientY - lastPanMouseY;
            procedurePan.x += deltaX;
            procedurePan.y += deltaY;
            lastPanMouseX = e.clientX;
            lastPanMouseY = e.clientY;
            // procedurePan.x = Math.min(Math.max(procedurePan.x, -500 * procedureZoom), 500 * procedureZoom);
            // procedurePan.y = Math.min(Math.max(procedurePan.y, -500 * procedureZoom), 500 * procedureZoom);
            drawProcedureCanvas();
            drawOverviewCanvas();
        }
    }

    function handleProcedureCanvasMouseUp() {
        isDraggingNode = false;
        isPanningProcedureCanvas = false;
        procedureCanvas.style.cursor = 'grab';
        // drawProcedureCanvas();
    }

    function drawOverviewCanvas() {
        overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
        // if (procedureNodes.length === 0) return;

        // Calculate bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        // procedureNodes.forEach(node => {
        //     minX = Math.min(minX, node.x);
        //     minY = Math.min(minY, node.y);
        //     maxX = Math.max(maxX, node.x + 100); // Assuming node width 100
        //     maxY = Math.max(maxY, node.y + 50);  // Assuming node height 50
        // });

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

        // // Draw nodes on overview
        // overviewCtx.fillStyle = '#4b5263';
        // overviewCtx.strokeStyle = '#5c6370';
        // procedureNodes.forEach(node => {
        //     overviewCtx.fillRect(node.x, node.y, 100, 50);
        //     overviewCtx.strokeRect(node.x, node.y, 100, 50);
        // });

        // // Draw connections on overview (simplified)
        // overviewCtx.strokeStyle = '#abb2bf';
        // procedureNodes.forEach(node => {
        //     node.connections = node.connections || [];
        //     node.connections.forEach(targetNodeId => {
        //         const targetNode = procedureNodes.find(n => n.id === targetNodeId);
        //         if (targetNode) {
        //             overviewCtx.beginPath();
        //             overviewCtx.moveTo(node.x + 50, node.y + 25);
        //             overviewCtx.lineTo(targetNode.x + 50, targetNode.y + 25);
        //             overviewCtx.stroke();
        //         }
        //     });
        // });

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



    // --- logic for display tools on hover in the middle panel --- -----------------------------------------------------------------------------
    let hideTimeout = null; // To manage delayed hiding of the popup
    let activePopup = null; // To keep track of the currently displayed popup

    // middlePanel event listeners for dropping
    middlePanel.addEventListener('dragover', (event) => {
        event.preventDefault(); // Essential to allow a drop
        event.dataTransfer.dropEffect = 'copy'; // Visual feedback for 'copy' operation
        middlePanel.classList.add('drop-highlight'); // Add visual highlight to middlePanel
    });
    middlePanel.addEventListener('dragleave', () => {
        middlePanel.classList.remove('drop-highlight'); // Remove highlight when drag leaves
    });
    middlePanel.addEventListener('drop', (event) => {
        event.preventDefault(); // Prevent default drop behavior (e.g., opening file)
        middlePanel.classList.remove('drop-highlight'); // Remove highlight

        // const toolName = event.dataTransfer.getData('text/plain'); // Get the data (tool name)

        // // Create a new element to represent the dropped tool in the middlePanel
        // const newToolElement = document.createElement('div');
        // newToolElement.textContent = toolName;
        // newToolElement.classList.add('dropped-tool');

        // middlePanel.appendChild(newToolElement); // Add the new tool to the middlePanel
    });

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

                // Calculate vertical position of the popup relative to the middlepanel
                const toolRect = tool.getBoundingClientRect(); // Position of the hovered tool
                const middlepanelRect = middlePanel.getBoundingClientRect(); // Position of the middlepanel

                // Align the top of the popup with the top of the hovered tool
                // Adjust for middlepanel's own top offset
                let topPosition = toolRect.top - middlepanelRect.top;
                let leftPosition = middlepanelRect.left;

                // Optional: Add a small vertical offset for visual spacing
                topPosition += 0;

                // Apply the calculated position to the popup
                popup.style.top = `${topPosition}px`;
                popup.style.left = `${leftPosition}px`; // Fixed left offset from the middlepanel's left edge

                middlePanel.appendChild(popup); // Add the popup to the middlepanel
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
            console.log('procedure node: ', procedureNodes);
            drawProcedureCanvas();
            drawOverviewCanvas();
        }
    }

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

    // Hide context menu if clicking anywhere else
    document.addEventListener('click', (e) => {
        if (!nodeContextMenu.contains(e.target)) {
            nodeContextMenu.classList.add('hidden');
            selectedNode = null;
            drawProcedureCanvas();
        }
    });






    // --- Initial Setup ---
    window.addEventListener('resize', () => {
        resizeImageCanvas();
        resizeProcedureCanvas();
    });
    // Set initial active tool for image viewer
    setActiveTool('default');
    // initial procedure canvas draw
    resizeProcedureCanvas();

    // Attach all procedure canvas interaction listeners
    procedureCanvas.addEventListener('wheel', handleProcedureCanvasWheel);
    procedureCanvas.addEventListener('mousedown', handleProcedureCanvasMouseDown);
    procedureCanvas.addEventListener('mousemove', handleProcedureCanvasMouseMove);
    procedureCanvas.addEventListener('mouseup', handleProcedureCanvasMouseUp);
    procedureCanvas.addEventListener('dragover', handleProcedureCanvasDragOver); 
    procedureCanvas.addEventListener('drop', handleProcedureCanvasDrop);      
    procedureCanvas.addEventListener('contextmenu', handleProcedureCanvasContextMenu);



    // This is the end of the code 
});

