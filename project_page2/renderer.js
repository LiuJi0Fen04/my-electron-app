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
    let lastMousePos = {x: 0, y: 0}; // Initialize lastMousePos

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

    let isPanningProcedureCanvas = false; // For panning the canvas itself
    let lastPanMouseX = 0;
    let lastPanMouseY = 0;

    let isDraggingOverviewRect = false; // New: For dragging the viewport on the overview
    let overviewDragLastX = 0;
    let overviewDragLastY = 0;

    // New: Variables for selection mode
    let currentProcedureMode = 'pan'; // 'pan' or 'select'
    let isDrawingSelection = false;
    let selectionStart = { x: 0, y: 0 };
    let selectionCurrent = { x: 0, y: 0 };
    let selectedNodes = []; // Array of currently selected nodes

    // New: Variables for connections
    let connections = []; // Stores { id: unique, sourceNodeId: id, sourcePort: '...', targetNodeId: id, targetPort: '...' }
    let isDrawingNewConnection = false;
    let startConnectionInfo = null; // { node: node_obj, port: 'top'|'bottom'|'left'|'right', x: worldX, y: worldY }
    let tempConnectionEndCoords = { x: 0, y: 0 }; // World coordinates for the end of the temporary connection line
    
    // Updated connection point radii
    const CONNECTION_POINT_VISUAL_RADIUS = 5; // How large the dot appears
    const CONNECTION_POINT_HIT_RADIUS = 15; // Larger radius for mouse interaction

    let selectedConnection = null; // Currently selected connection
    let hoveredPortInfo = null; // Tracks which port is currently hovered { node: node_obj, port: '...' }

    // const tools = document.querySelectorAll('.tool'); // This will be dynamic now
    // const addNodeButtons = document.querySelectorAll('.add-nodes-button') // This variable is not used anywhere and can be removed
    const clearNodeBtn = document.getElementById('clear-nodes-btn') // This variable is not used anywhere and can be removed
    const nodeContextMenu = document.getElementById('node-context-menu');
    const contextDeleteNodeBtn = document.getElementById('context-delete-node');
    const contextCopyNodeBtn = document.getElementById('context-copy-node');

    // New: Canvas Context Menu Elements
    const canvasContextMenu = document.getElementById('canvas-context-menu');
    const contextPanModeBtn = document.getElementById('context-pan-mode');
    const contextSelectModeBtn = document.getElementById('context-select-mode');
    const contextClearSelectionBtn = document.getElementById('context-clear-selection');
    const contextDeleteAllConnectionsBtn = document.getElementById('context-delete-all-connections');
    const contextDeleteSelectedConnectionBtn = document.getElementById('context-delete-selected-connection');

    // AI Assistant Elements
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const generateInsightBtn = document.getElementById('generate-insight-btn');
    const aiLoadingIndicator = document.getElementById('ai-loading-indicator');
    const aiResponseOutput = document.getElementById('ai-response-output');


    let procedureNodes = []; // Stores {id, type, text, x, y, width, height}
    let isDraggingNode = false; // For dragging existing nodes on canvas
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let selectedNode = null; // Currently selected node for single dragging/context menu (will be extended for multi-select)
    let clipboardNode = null; // For copy/paste functionality
    const NODE_WIDTH = 120;
    const NODE_HEIGHT = 40;
    const procedure_canvas_len = 1500; // Conceptual world size (e.g., 1500x1500)
    
    // Helper function to clamp procedurePan within valid boundaries
    function clampProcedurePan() {
        // Calculate the minimum allowed pan values. This ensures the entire conceptual world
        // (procedure_canvas_len x procedure_canvas_len) remains visible if zoomed out,
        // or that you can't pan endlessly into empty space when zoomed in.
        const minAllowedPanX = procedureCanvas.width - procedure_canvas_len * procedureZoom;
        const minAllowedPanY = procedureCanvas.height - procedure_canvas_len * procedureZoom;

        // Clamp procedurePan.x: It should be between `minAllowedPanX` (when world origin is far right)
        // and `0` (when world origin is at canvas left edge).
        procedurePan.x = Math.max(minAllowedPanX, procedurePan.x);
        procedurePan.x = Math.min(0, procedurePan.x);

        // Clamp procedurePan.y similarly.
        procedurePan.y = Math.max(minAllowedPanY, procedurePan.y);
        procedurePan.y = Math.min(0, procedurePan.y);
    }


    // Toggle overview window
    toggleOverviewBtn.addEventListener('click', () => {
        overviewWindow.classList.toggle('hidden');
        toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▲' : '▼';

        // Redraw overview if it becomes visible
        if (!overviewWindow.classList.contains('hidden')) {
            resizeProcedureCanvas(); // This will redraw overview
        }
    });

    function resizeProcedureCanvas(initial = false) {
        const container = procedureCanvas.parentElement;
        procedureCanvas.width = container.clientWidth;
        procedureCanvas.height = container.clientHeight;
        overviewCanvas.width = overviewWindow.clientWidth;
        overviewCanvas.height = overviewWindow.clientHeight;
        
        clampProcedurePan(); // Re-clamp pan values after resize
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
    
    // Helper function to get world coordinates of a node's connection point
    function getNodePortCoords(node, portName) {
        const halfWidth = node.width / 2;
        const halfHeight = node.height / 2;
        switch (portName) {
            case 'top': return { x: node.x + halfWidth, y: node.y };
            case 'bottom': return { x: node.x + halfWidth, y: node.y + node.height };
            case 'left': return { x: node.x, y: node.y + halfHeight };
            case 'right': return { x: node.x + node.width, y: node.y + halfHeight };
            default: return { x: node.x, y: node.y }; // Should not happen
        }
    }

    // Helper to draw an arrowhead
    function drawArrowhead(ctx, toX, toY, fromX, fromY, size = 10) {
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle; // Match arrowhead color to line color
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.translate(toX, toY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, size / 2);
        ctx.lineTo(-size, -size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Helper to calculate Bezier control points for curved arrows
    function getBezierControlPoints(p1, p2, port1, port2) {
        const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const minOffset = 50; // Minimum offset for curvature
        const maxOffset = Math.max(minOffset, dist / 4); // Scale offset with distance

        let cp1 = { x: p1.x, y: p1.y };
        let cp2 = { x: p2.x, y: p2.y };

        // Determine direction of "shoot out" from p1
        if (port1 === 'top') cp1.y -= maxOffset;
        else if (port1 === 'bottom') cp1.y += maxOffset;
        else if (port1 === 'left') cp1.x -= maxOffset;
        else if (port1 === 'right') cp1.x += maxOffset;

        // Determine direction of "shoot in" towards p2
        if (port2 === 'top') cp2.y -= maxOffset;
        else if (port2 === 'bottom') cp2.y += maxOffset;
        else if (port2 === 'left') cp2.x -= maxOffset;
        else if (port2 === 'right') cp2.x += maxOffset;

        // Adjust if control points are too collinear with start/end
        // If they are mostly vertical and source/target are horizontal
        if (Math.abs(p1.x - p2.x) > Math.abs(p1.y - p2.y)) { // More horizontal overall
            if (port1 === 'top' || port1 === 'bottom') cp1.x = p1.x + (p2.x - p1.x) / 2;
            if (port2 === 'top' || port2 === 'bottom') cp2.x = p1.x + (p2.x - p1.x) / 2;
        } else { // More vertical overall
            if (port1 === 'left' || port1 === 'right') cp1.y = p1.y + (p2.y - p1.y) / 2;
            if (port2 === 'left' || port2 === 'right') cp2.y = p1.y + (p2.y - p1.y) / 2;
        }

        return { cp1, cp2 };
    }

    // Function to get a point on a cubic Bezier curve (for hit-testing)
    function getPointOnBezier(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;
        const x = mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t * t2 * p3.x;
        const y = mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t * t2 * p3.y;
        return { x, y };
    }

    // Function to calculate squared distance between two points (for hit-testing)
    function distSq(p1, p2) {
        return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
    }


    function drawConnection(ctx, connection, isTemporary = false, isSelected = false) {
        const sourceNode = procedureNodes.find(n => n.id === connection.sourceNodeId);
        const targetNode = isTemporary ? null : procedureNodes.find(n => n.id === connection.targetNodeId);

        if (!sourceNode) return;

        const startP = getNodePortCoords(sourceNode, connection.sourcePort);
        const endP = isTemporary ? connection.endCoords : getNodePortCoords(targetNode, connection.targetPort);

        if (!endP) return;

        const { cp1, cp2 } = getBezierControlPoints(startP, endP, connection.sourcePort, connection.targetPort);

        ctx.strokeStyle = isTemporary ? '#FFD700' : (isSelected ? '#FF00FF' : '#dcdcdc'); // Gold for temp, Magenta for selected, light grey for permanent
        ctx.lineWidth = isTemporary ? 2 : (isSelected ? 3 : 1.5);
        ctx.fillStyle = ctx.strokeStyle; // Arrowhead color matches line

        ctx.beginPath();
        ctx.moveTo(startP.x, startP.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endP.x, endP.y);
        ctx.stroke();

        // Draw arrowhead for permanent connections
        if (!isTemporary) {
            // To get a point near the end for the arrowhead, evaluate the bezier curve
            // at a point slightly before the actual end point.
            const t_arrow = 0.99; // A value very close to 1
            const pointBeforeEnd = getPointOnBezier(startP, cp1, cp2, endP, t_arrow);
            drawArrowhead(ctx, endP.x, endP.y, pointBeforeEnd.x, pointBeforeEnd.y);
        }
    }


    function drawProcedureCanvas() {
        procedureCtx.clearRect(0, 0, procedureCanvas.width, procedureCanvas.height);
        procedureCtx.save();
        procedureCtx.translate(procedurePan.x, procedurePan.y);
        procedureCtx.scale(procedureZoom, procedureZoom);
        drawGrid(procedureCtx, procedureCanvas.width, procedureCanvas.height, procedureZoom, procedurePan.x, procedurePan.y);

        // Draw existing connections first
        connections.forEach(conn => {
            drawConnection(procedureCtx, conn, false, conn === selectedConnection); // Pass isSelected flag
        });

        procedureNodes.forEach(node => {
            // Draw connection points (ports) - fill first, potentially under node
            ['top', 'bottom', 'left', 'right'].forEach(portName => {
                const portCoords = getNodePortCoords(node, portName);
                const actualVisualRadius = CONNECTION_POINT_VISUAL_RADIUS / procedureZoom;

                // Draw the transparent fill first (partially under the node)
                procedureCtx.beginPath();
                procedureCtx.arc(portCoords.x, portCoords.y, actualVisualRadius, 0, Math.PI * 2);
                procedureCtx.fillStyle = 'rgba(192, 192, 192, 0.4)'; // Semi-transparent fill
                procedureCtx.fill();
            });

            // Draw node body, stroke, and text (will draw over the inner part of ports)
            const { x, y } = node;
            const width = node.width;
            const height = node.height;

            procedureCtx.fillStyle = getNodeColor(node.type);
            
            // Highlight selected nodes
            const isNodeSelected = selectedNodes.includes(node);
            procedureCtx.strokeStyle = isNodeSelected || selectedNode === node ? '#61afef' : '#5c6370';
            procedureCtx.lineWidth = isNodeSelected || selectedNode === node ? 3 : 1;
            
            drawRoundedRect(procedureCtx, x, y, width, height, 8);
            procedureCtx.fill();
            procedureCtx.stroke();

            procedureCtx.fillStyle = '#ffffff';
            procedureCtx.font = `${14}px Arial`;
            procedureCtx.textAlign = 'center';
            procedureCtx.textBaseline = 'middle';
            procedureCtx.fillText(node.text, x + width / 2, y + height / 2);

            // Draw connection points (ports) - stroke last, on top for visibility and hover effect
            ['top', 'bottom', 'left', 'right'].forEach(portName => {
                const portCoords = getNodePortCoords(node, portName);
                const actualVisualRadius = CONNECTION_POINT_VISUAL_RADIUS / procedureZoom;

                // Draw highlight if hovered
                if (hoveredPortInfo && hoveredPortInfo.node === node && hoveredPortInfo.port === portName) {
                    procedureCtx.beginPath();
                    procedureCtx.arc(portCoords.x, portCoords.y, actualVisualRadius + 3 / procedureZoom, 0, Math.PI * 2); // Slightly larger
                    procedureCtx.strokeStyle = '#61afef'; // Blueish highlight
                    procedureCtx.lineWidth = 2 / procedureZoom;
                    procedureCtx.stroke();
                }

                // Draw the stroke (outer ring)
                procedureCtx.beginPath();
                procedureCtx.arc(portCoords.x, portCoords.y, actualVisualRadius, 0, Math.PI * 2);
                procedureCtx.strokeStyle = '#333333';
                procedureCtx.lineWidth = 1 / procedureZoom;
                procedureCtx.stroke();
            });
        });

        // Draw selection rectangle if currently drawing
        if (isDrawingSelection && currentProcedureMode === 'select') {
            procedureCtx.strokeStyle = '#61afef';
            procedureCtx.lineWidth = 1 / procedureZoom;
            procedureCtx.setLineDash([5 / procedureZoom, 5 / procedureZoom]); // Dashed line
            const rectX = Math.min(selectionStart.x, selectionCurrent.x);
            const rectY = Math.min(selectionStart.y, selectionCurrent.y);
            const rectWidth = Math.abs(selectionStart.x - selectionCurrent.x);
            const rectHeight = Math.abs(selectionStart.y - selectionCurrent.y);
            procedureCtx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            procedureCtx.setLineDash([]); // Reset line dash
        }

        // Draw temporary connection if creating one
        if (isDrawingNewConnection && startConnectionInfo) {
            drawConnection(procedureCtx, {
                sourceNodeId: startConnectionInfo.node.id,
                sourcePort: startConnectionInfo.port,
                endCoords: tempConnectionEndCoords // Use temporary end coords
            }, true); // Pass true for isTemporary
        }

        procedureCtx.restore();
    }

    function getNodeColor(type) {
        // Normalize type name for color mapping
        const normalizedType = type.toLowerCase().replace(/\s/g, '_');
        switch (normalizedType) {
            case 'camera': return '#98c379';
            case 'folder': return '#98c379';
            case 'sharpness': return '#e6c07b';
            case 'blur': return '#e6c07b';
            case 'resize': return '#e6c07b';
            case 'threshold': return '#e6c07b';
            case 'line_detection': return '#61afef';
            case 'circle_detection': return '#61afef';
            case 'if': return '#e06c75';
            case 'while': return '#e06c75';
            case 'for': return '#e06c75';
            default: return '#abb2bf';
        }
    }

    function drawGrid(ctx, canvasWidth, canvasHeight, zoom, panX, panY, gridSize = 20) {
        ctx.strokeStyle = '#4b5263';
        ctx.lineWidth = 0.5;

        // Calculate visible world area
        const worldViewLeft = -panX / zoom;
        const worldViewTop = -panY / zoom;
        const worldViewRight = worldViewLeft + canvasWidth / zoom;
        const worldViewBottom = worldViewTop + canvasHeight / zoom;

        // Draw vertical lines
        for (let x = Math.floor(worldViewLeft / gridSize) * gridSize; x < worldViewRight; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, worldViewTop);
            ctx.lineTo(x, worldViewBottom);
            ctx.stroke();
        }
        // Draw horizontal lines
        for (let y = Math.floor(worldViewTop / gridSize) * gridSize; y < worldViewBottom; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(worldViewLeft, y);
            ctx.lineTo(worldViewRight, y);
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

    function procedureCanvasToWorldCoords(canvasX, canvasY) {
        const worldX = (canvasX - procedurePan.x) / procedureZoom;
        const worldY = (canvasY - procedurePan.y) / procedureZoom;
        return { x: worldX, y: worldY };
    }
    // --- FINISH: utility functions for procedure canvas corrdinates ---

    // New: Hit test for connection points
    function hitTestConnectionPoint(worldMouseX, worldMouseY) {
        for (const node of procedureNodes) {
            for (const portName of ['top', 'bottom', 'left', 'right']) {
                const portCoords = getNodePortCoords(node, portName);
                const distance = Math.sqrt(
                    Math.pow(worldMouseX - portCoords.x, 2) +
                    Math.pow(worldMouseY - portCoords.y, 2)
                );
                // Use the larger HIT_TEST_CONNECTION_POINT_RADIUS for interaction
                if (distance * procedureZoom <= CONNECTION_POINT_HIT_RADIUS) {
                    return { node, port: portName };
                }
            }
        }
        return null;
    }

    // Hit test for connections
    function hitTestConnection(worldMouseX, worldMouseY) {
        const tolerance = 10 / procedureZoom; // Tolerance in world coordinates, scales with zoom
        const toleranceSq = tolerance * tolerance;
        const numSamples = 30; // Number of points to sample along the curve

        for (const conn of connections) {
            const sourceNode = procedureNodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = procedureNodes.find(n => n.id === conn.targetNodeId);

            if (!sourceNode || !targetNode) continue;

            const startP = getNodePortCoords(sourceNode, conn.sourcePort);
            const endP = getNodePortCoords(targetNode, conn.targetPort);
            const { cp1, cp2 } = getBezierControlPoints(startP, endP, conn.sourcePort, conn.targetPort);

            for (let i = 0; i <= numSamples; i++) {
                const t = i / numSamples;
                const pointOnCurve = getPointOnBezier(startP, cp1, cp2, endP, t);
                if (distSq({ x: worldMouseX, y: worldMouseY }, pointOnCurve) < toleranceSq) {
                    return conn; // Return the hit connection
                }
            }
        }
        return null;
    }


    function handleProcedureCanvasWheel(e) {
        e.preventDefault();

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePosBeforeZoom = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        const zoomFactor = 1.1;
        const scale = (e.deltaY < 0) ? zoomFactor : 1 / zoomFactor; // Zoom in/out based on scroll direction
        
        procedureZoom = Math.min(Math.max(0.5, procedureZoom * scale), 4); // Keep zoom between 0.5 and 4

        procedurePan.x = mousePos.x - (worldMousePosBeforeZoom.x * procedureZoom);
        procedurePan.y = mousePos.y - (worldMousePosBeforeZoom.y * procedureZoom);

        clampProcedurePan(); // Apply clamping after zoom and pan update
        
        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function handleProcedureCanvasMouseDown(e) {
        nodeContextMenu.classList.add('hidden');
        canvasContextMenu.classList.add('hidden'); // Hide canvas context menu

        // Prevent showing default context menu on right click for main canvas
        if (e.button === 2) {
            return;
        }

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        // Determine if a connection point, connection, or node was hit
        const hitPort = hitTestConnectionPoint(worldMousePos.x, worldMousePos.y);
        const hitConn = currentProcedureMode === 'select' ? hitTestConnection(worldMousePos.x, worldMousePos.y) : null;
        const clickedNode = procedureNodes.find(node =>
            worldMousePos.x >= node.x && worldMousePos.x <= node.x + node.width &&
            worldMousePos.y >= node.y && worldMousePos.y <= node.y + node.height
        );

        // --- Handle Connection Point Click (Start New Connection) ---
        if (hitPort && e.button === 0) { // Left-click on a connection point
            isDrawingNewConnection = true;
            startConnectionInfo = hitPort;
            tempConnectionEndCoords = { x: worldMousePos.x, y: worldMousePos.y };
            procedureCanvas.style.cursor = 'crosshair';
            // Clear all selections when starting a new connection
            selectedNodes = [];
            selectedNode = null;
            selectedConnection = null;
            hoveredPortInfo = null; // Clear hovered state
            drawProcedureCanvas();
            return; // Exit to prevent other mouse down logic
        }

        // --- Handle Connection Click (Select Connection) ---
        if (hitConn && e.button === 0 && currentProcedureMode === 'select') { // Left-click a connection in select mode
            selectedConnection = hitConn;
            selectedNodes = []; // Clear node selection when selecting a connection
            selectedNode = null;
            drawProcedureCanvas();
            return; // Only select connection, don't proceed to node/pan logic
        }

        // --- Handle Node Click (Select/Drag Nodes) ---
        if (clickedNode) {
            // If Ctrl/Cmd is held, toggle selection
            if (e.ctrlKey || e.metaKey) {
                if (selectedNodes.includes(clickedNode)) {
                    selectedNodes = selectedNodes.filter(node => node !== clickedNode); // Deselect
                } else {
                    selectedNodes.push(clickedNode); // Add to selection
                }
            } else { // Ctrl/Cmd NOT held
                if (!selectedNodes.includes(clickedNode)) {
                    selectedNodes = [clickedNode]; // Select only this node, clear others
                }
                // If it's already selected and Ctrl/Cmd not held, it remains selected, allow dragging all selected
            }
            selectedNode = clickedNode; // Set the clicked node as the primary for dragging calculation
            selectedConnection = null; // Clear connection selection

            isDraggingNode = true;
            dragOffsetX = worldMousePos.x - selectedNode.x;
            dragOffsetY = worldMousePos.y - selectedNode.y;
            procedureCanvas.style.cursor = 'grabbing';
            drawProcedureCanvas(); // Redraw to show selection changes
            return; // Exit to prevent other mouse down logic
        }

        // --- Handle Click on Empty Canvas Space ---
        // If nothing else was clicked, clear all selections and proceed with pan/selection box
        selectedNodes = [];
        selectedNode = null;
        selectedConnection = null;

        if (currentProcedureMode === 'pan') {
            isPanningProcedureCanvas = true;
            lastPanMouseX = e.clientX;
            lastPanMouseY = e.clientY;
            procedureCanvas.style.cursor = 'grabbing';
        } else if (currentProcedureMode === 'select') {
            isDrawingSelection = true;
            selectionStart = { x: worldMousePos.x, y: worldMousePos.y };
            selectionCurrent = { x: worldMousePos.x, y: worldMousePos.y };
            procedureCanvas.style.cursor = 'crosshair';
        }
        drawProcedureCanvas(); // Redraw to show selection changes (e.g., cleared selection)
    }

    function handleProcedureCanvasMouseMove(e) {
        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);
        let redrawNeeded = false; // Flag to indicate if redraw is needed

        if (isDrawingNewConnection) {
            tempConnectionEndCoords = { x: worldMousePos.x, y: worldMousePos.y };
            redrawNeeded = true;
        } else if (isDraggingNode && selectedNode) {
            const dx = worldMousePos.x - (selectedNode.x + dragOffsetX);
            const dy = worldMousePos.y - (selectedNode.y + dragOffsetY);
            
            // Move all selected nodes by the same delta
            selectedNodes.forEach(node => {
                node.x += dx;
                node.y += dy;
            });
            redrawNeeded = true;
            drawOverviewCanvas(); // Overview needs to be redrawn if nodes move
        } 
        else if (isPanningProcedureCanvas && e.buttons === 1) { // Check for left mouse button held down
            const deltaX = e.clientX - lastPanMouseX;
            const deltaY = e.clientY - lastPanMouseY;
            procedurePan.x += deltaX;
            procedurePan.y += deltaY;
            lastPanMouseX = e.clientX;
            lastPanMouseY = e.clientY;

            clampProcedurePan(); // Apply clamping
            
            redrawNeeded = true;
            drawOverviewCanvas();
        } else if (isDrawingSelection && currentProcedureMode === 'select') {
            selectionCurrent = { x: worldMousePos.x, y: worldMousePos.y };
            redrawNeeded = true;
        } else {
            // Update hoveredPortInfo and cursor if no active operation
            const newHoveredPortInfo = hitTestConnectionPoint(worldMousePos.x, worldMousePos.y);
            const newHoveredConnection = hitTestConnection(worldMousePos.x, worldMousePos.y);

            // Determine cursor based on what's under the mouse, in order of priority
            if (newHoveredPortInfo) {
                procedureCanvas.style.cursor = 'pointer';
            } else if (newHoveredConnection && currentProcedureMode === 'select') {
                procedureCanvas.style.cursor = 'pointer';
            }
            else {
                updateProcedureCanvasCursor(); // Revert to mode-specific cursor
            }

            // Only redraw if hover state of ports changes
            const hasHoveredPortChanged = (!hoveredPortInfo && newHoveredPortInfo) ||
                                           (hoveredPortInfo && !newHoveredPortInfo) ||
                                           (hoveredPortInfo && newHoveredPortInfo && 
                                            (hoveredPortInfo.node !== newHoveredPortInfo.node || hoveredPortInfo.port !== newHoveredPortInfo.port));
            
            if (hasHoveredPortChanged) {
                hoveredPortInfo = newHoveredPortInfo;
                redrawNeeded = true;
            }
        }
        
        if (redrawNeeded) {
            drawProcedureCanvas();
        }
    }

    function handleProcedureCanvasMouseUp(e) {
        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        if (isDrawingNewConnection) {
            const endPortInfo = hitTestConnectionPoint(worldMousePos.x, worldMousePos.y);
            if (endPortInfo && endPortInfo.node.id !== startConnectionInfo.node.id) { // Ensure not connecting to itself
                // Check if connection already exists (order-agnostic)
                const existingConnection = connections.some(conn =>
                    (conn.sourceNodeId === startConnectionInfo.node.id && conn.sourcePort === startConnectionInfo.port &&
                     conn.targetNodeId === endPortInfo.node.id && conn.targetPort === endPortInfo.port) ||
                    (conn.sourceNodeId === endPortInfo.node.id && conn.sourcePort === endPortInfo.port && // Check reverse
                     conn.targetNodeId === startConnectionInfo.node.id && conn.targetPort === startConnectionInfo.port)
                );

                if (!existingConnection) {
                    // Create a new connection
                    connections.push({
                        id: Date.now(),
                        sourceNodeId: startConnectionInfo.node.id,
                        sourcePort: startConnectionInfo.port,
                        targetNodeId: endPortInfo.node.id,
                        targetPort: endPortInfo.port
                    });
                    console.log('New connection:', connections[connections.length - 1]);
                } else {
                    console.log('Connection already exists or is a duplicate (reversed).');
                }
            }
            isDrawingNewConnection = false;
            startConnectionInfo = null;
            tempConnectionEndCoords = { x: 0, y: 0 };
            drawProcedureCanvas();
            updateProcedureCanvasCursor(); // Reset cursor
            return; // Exit to prevent other mouse up logic
        }

        isDraggingNode = false;
        isPanningProcedureCanvas = false;
        isDrawingSelection = false;

        // Update cursor based on current mode
        updateProcedureCanvasCursor();

        if (currentProcedureMode === 'select') {
            const rectX = Math.min(selectionStart.x, selectionCurrent.x);
            const rectY = Math.min(selectionStart.y, selectionCurrent.y);
            const rectWidth = Math.abs(selectionStart.x - selectionCurrent.x);
            const rectHeight = Math.abs(selectionStart.y - selectionCurrent.y);

            // Select nodes that intersect with the selection rectangle IF a selection rectangle was drawn (not a click)
            if (rectWidth > 0 || rectHeight > 0) { // Check if a significant drag occurred
                const newlySelectedNodes = procedureNodes.filter(node => {
                    return node.x < rectX + rectWidth &&
                           node.x + node.width > rectX &&
                           node.y < rectY + rectHeight &&
                           node.y + node.height > rectY;
                });

                // If Ctrl/Cmd is held, toggle selection for intersecting nodes
                if (e.ctrlKey || e.metaKey) {
                    newlySelectedNodes.forEach(node => {
                        if (selectedNodes.includes(node)) {
                            selectedNodes = selectedNodes.filter(n => n !== node);
                        } else {
                            selectedNodes.push(node);
                        }
                    });
                } else {
                    selectedNodes = newlySelectedNodes; // Replace selection
                }
                selectedConnection = null; // Clear connection selection after drawing selection box
            }
        }
        drawProcedureCanvas(); // Redraw to show final selection
    }

    function updateProcedureCanvasCursor() {
        if (currentProcedureMode === 'pan') {
            procedureCanvas.style.cursor = 'grab';
        } else if (currentProcedureMode === 'select') {
            procedureCanvas.style.cursor = 'crosshair';
        }
    }

    function drawOverviewCanvas() {
        overviewCtx.clearRect(0, 0, overviewCanvas.width, overviewCanvas.height);
        
        // Calculate scale to fit the entire procedure_canvas_len world into the overviewCanvas
        const overviewScaleX = overviewCanvas.width / procedure_canvas_len;
        const overviewScaleY = overviewCanvas.height / procedure_canvas_len;
        const actualOverviewScale = Math.min(overviewScaleX, overviewScaleY);

        overviewCtx.save();
        overviewCtx.scale(actualOverviewScale, actualOverviewScale);

        // Calculate offset to center the scaled world content within the overview canvas
        const offsetX = (overviewCanvas.width / actualOverviewScale - procedure_canvas_len) / 2;
        const offsetY = (overviewCanvas.height / actualOverviewScale - procedure_canvas_len) / 2;
        overviewCtx.translate(offsetX, offsetY);

        // Draw nodes on overview
        procedureNodes.forEach(node => {
            overviewCtx.strokeStyle = '#5c0070';      
            overviewCtx.fillStyle = getNodeColor(node.type);
            overviewCtx.fillRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
            overviewCtx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
        });

        // Draw current viewport rectangle on overview
        overviewCtx.strokeStyle = '#e6c07b';
        overviewCtx.lineWidth = 18; // Fixed line width of 18 pixels
        overviewCtx.strokeRect(
            (-procedurePan.x / procedureZoom), // X-coordinate of visible area in world coords
            (-procedurePan.y / procedureZoom), // Y-coordinate of visible area in world coords
            (procedureCanvas.width / procedureZoom), // Width of visible area in world coords
            (procedureCanvas.height / procedureZoom) // Height of visible area in world coords
        );
        overviewCtx.restore();
    }

    // --- Overview Canvas Interaction for dragging viewport ---
    overviewCanvas.addEventListener('mousedown', handleOverviewMouseDown);
    overviewCanvas.addEventListener('mousemove', handleOverviewMouseMove);
    overviewCanvas.addEventListener('mouseup', handleOverviewMouseUp);
    overviewCanvas.addEventListener('mouseleave', handleOverviewMouseUp); // Release drag if mouse leaves overview canvas

    function handleOverviewMouseDown(e) {
        const rect = overviewCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const overviewScaleX = overviewCanvas.width / procedure_canvas_len;
        const overviewScaleY = overviewCanvas.height / procedure_canvas_len;
        const actualOverviewScale = Math.min(overviewScaleX, overviewScaleY);

        // Calculate offset used in drawOverviewCanvas to map mouse position correctly
        const offsetX = (overviewCanvas.width / actualOverviewScale - procedure_canvas_len) / 2;
        const offsetY = (overviewCanvas.height / actualOverviewScale - procedure_canvas_len) / 2;

        // Convert mouse position on overview canvas to scaled world coordinates
        const scaledWorldMouseX = (mouseX / actualOverviewScale) - offsetX;
        const scaledWorldMouseY = (mouseY / actualOverviewScale) - offsetY;

        // Calculate the actual position of the slip rect on the overview's *scaled world*
        const slipRectWorldX = -procedurePan.x / procedureZoom;
        const slipRectWorldY = -procedurePan.y / procedureZoom;
        const slipRectWorldWidth = procedureCanvas.width / procedureZoom;
        const slipRectWorldHeight = procedureCanvas.height / procedureZoom;

        // Check if mouse is within the slip rect in the scaled world coordinates
        if (scaledWorldMouseX >= slipRectWorldX && scaledWorldMouseX <= slipRectWorldX + slipRectWorldWidth &&
            scaledWorldMouseY >= slipRectWorldY && scaledWorldMouseY <= slipRectWorldY + slipRectWorldHeight) {
            isDraggingOverviewRect = true;
            overviewDragLastX = mouseX; // Store raw mouse coordinates
            overviewDragLastY = mouseY;
            overviewCanvas.style.cursor = 'grabbing';
        }
    }

    function handleOverviewMouseMove(e) {
        if (!isDraggingOverviewRect) return;

        const rect = overviewCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const dx = mouseX - overviewDragLastX;
        const dy = mouseY - overviewDragLastY;

        const overviewScaleX = overviewCanvas.width / procedure_canvas_len;
        const overviewScaleY = overviewCanvas.height / procedure_canvas_len;
        const actualOverviewScale = Math.min(overviewScaleX, overviewScaleY);

        // Convert movement on overview canvas back to procedure canvas world coordinates
        // If the slip rect moves right on the overview (dx > 0), it means the *view* in the procedure canvas
        // moves right. To achieve this, the `procedurePan.x` (which shifts the world relative to the canvas)
        // needs to become more negative.
        procedurePan.x -= (dx / actualOverviewScale) * procedureZoom;
        procedurePan.y -= (dy / actualOverviewScale) * procedureZoom;

        clampProcedurePan(); // Apply clamping to keep pan within limits
        
        overviewDragLastX = mouseX;
        overviewDragLastY = mouseY;

        drawProcedureCanvas();
        drawOverviewCanvas();
    }

    function handleOverviewMouseUp() {
        isDraggingOverviewRect = false;
        overviewCanvas.style.cursor = 'default'; // Reset cursor
    }

    // --- Dynamic Tool Loading and Interaction Logic ---
    let hideTimeout = null; // To manage delayed hiding of the popup
    let activePopup = null; // To keep track of the currently displayed popup

    // Function to set up event listeners for dynamically created tools
    function setupToolEventListeners() {
        const tools = document.querySelectorAll('.tool'); // Select all dynamically created tools

        tools.forEach(tool => {
            // When mouse enters a main tool
            tool.addEventListener('mouseenter', (event) => {
                // Clear any pending hide timeouts to prevent immediate disappearance
                if (hideTimeout) {
                    clearTimeout(hideTimeout);
                    hideTimeout = null;
                }

                // If there's an active popup from a *different* tool, remove it
                if (activePopup && activePopup.parentElement && activePopup.dataset.parentToolId !== tool.id) {
                    activePopup.remove();
                    activePopup = null;
                }

                const subToolsContainer = tool.querySelector('.sub-tools-container');
                if (subToolsContainer && !activePopup) { // Only create if no active popup or it's a new parent tool
                    const popup = document.createElement('div');
                    popup.classList.add('sub-tool-popup');
                    popup.dataset.parentToolId = tool.id; // Store parent tool ID for differentiation

                    // Clone each sub-tool from the hidden template and append to the popup
                    Array.from(subToolsContainer.children).forEach(subTool => {
                        const clonedSubTool = subTool.cloneNode(true); // Deep clone the element

                        // IMPORTANT: Re-attach drag listeners to the cloned elements
                        clonedSubTool.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('text/plain', e.target.textContent); // Use text content as tool type
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

                    // Apply the calculated position to the popup
                    popup.style.top = `${topPosition}px`;
                    // popup.style.left = `${middlepanelRect.left}px`; // This makes it appear over middle panel
                    popup.style.left = `${leftPanel.offsetWidth + leftMiddleResizer.offsetWidth}px`; // Position right of left panel

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
    }

    // Function to dynamically load tools from module.json
    async function loadToolsIntoLeftPanel() {
        try {
            const response = await fetch('module.json');
            const data = await response.json();
            const moduleData = data.module;

            moduleData.forEach(toolCategory => {
                for (const categoryName in toolCategory) {
                    const toolsArray = toolCategory[categoryName];

                    // Create the main tool div
                    const toolDiv = document.createElement('div');
                    toolDiv.classList.add('tool');
                    // Normalize the ID for consistency (e.g., "image_capture" becomes "image-capture-tool")
                    toolDiv.id = `${categoryName.replace(/_/g, '-')}-tool`;

                    // Create the h3 for the category title (e.g., "Image Capture")
                    const h3 = document.createElement('h3');
                    h3.textContent = categoryName.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitalize each word

                    // Create the sub-tools container (initially hidden)
                    const subToolsContainer = document.createElement('div');
                    subToolsContainer.classList.add('sub-tools-container');

                    // Populate sub-tools
                    toolsArray.forEach(subToolName => {
                        const subToolDiv = document.createElement('div');
                        subToolDiv.classList.add('sub-tool');
                        subToolDiv.setAttribute('draggable', 'true');
                        // Use original subToolName for data-tool for consistency with getNodeColor
                        subToolDiv.setAttribute('data-tool', subToolName); 
                        subToolDiv.textContent = subToolName.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); // Capitalize each word

                        subToolsContainer.appendChild(subToolDiv);
                    });

                    toolDiv.appendChild(h3);
                    toolDiv.appendChild(subToolsContainer);
                    leftPanel.appendChild(toolDiv);
                }
            });
            setupToolEventListeners(); // Attach event listeners after tools are created
        } catch (error) {
            console.error('Error loading tools from module.json:', error);
            // Fallback: If loading fails, ensure the panel is not empty or show an error message
            leftPanel.innerHTML += '<p style="color: red;">Failed to load tools. Please check module.json.</p>';
        }
    }

    // middlePanel event listeners for dropping (remains the same)
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
                type: nodeType, // Use the raw nodeType for internal logic
                text: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1).replace(/_/g, ' ')}`, // Capitalize first letter and replace underscores for display
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

    // --- Node Context Menu Actions ---
    contextDeleteNodeBtn.addEventListener('click', () => {
        if (selectedNode) { // If a single node was selected by right-click
            procedureNodes = procedureNodes.filter(node => node !== selectedNode);
            // Also remove connections associated with this node
            connections = connections.filter(conn => conn.sourceNodeId !== selectedNode.id && conn.targetNodeId !== selectedNode.id);
            selectedNode = null;
            selectedNodes = []; // Clear any multi-selection as well
            selectedConnection = null; // Clear connection selection
            drawProcedureCanvas();
            drawOverviewCanvas();
            nodeContextMenu.classList.add('hidden');
        } else if (selectedNodes.length > 0) { // If multiple nodes are selected
            const selectedNodeIds = new Set(selectedNodes.map(node => node.id));
            procedureNodes = procedureNodes.filter(node => !selectedNodeIds.has(node.id));
            // Also remove connections associated with any of the deleted nodes
            connections = connections.filter(conn => !selectedNodeIds.has(conn.sourceNodeId) && !selectedNodeIds.has(conn.targetNodeId));
            selectedNodes = []; // Clear selection
            selectedConnection = null; // Clear connection selection
            drawProcedureCanvas();
            drawOverviewCanvas();
            nodeContextMenu.classList.add('hidden');
        }
    });

    contextCopyNodeBtn.addEventListener('click', () => {
        if (selectedNode) { // If a single node was selected by right-click
            clipboardNode = { ...selectedNode };
            clipboardNode.id = Date.now();
            clipboardNode.x += 20;
            clipboardNode.y += 20;
            console.log('Node copied to clipboard:', clipboardNode);
            nodeContextMenu.classList.add('hidden');
        } else if (selectedNodes.length > 0) { // If multiple nodes are selected
            // For simplicity, copy only the first selected node for now
            // To copy all, you'd iterate and store an array of cloned nodes in clipboardNode
            clipboardNode = { ...selectedNodes[0] };
            clipboardNode.id = Date.now();
            clipboardNode.x += 20;
            clipboardNode.y += 20;
            console.log('First selected node copied to clipboard:', clipboardNode);
            nodeContextMenu.classList.add('hidden');
        }
    });

    function handleProcedureCanvasContextMenu(e) {
        e.preventDefault();

        // Hide any other context menus
        nodeContextMenu.classList.add('hidden');
        canvasContextMenu.classList.add('hidden');
        hoveredPortInfo = null; // Clear hovered state when context menu appears
        drawProcedureCanvas(); // Redraw to reflect no hover state

        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);

        selectedNode = procedureNodes.find(node =>
            worldMousePos.x >= node.x && worldMousePos.x <= node.x + node.width &&
            worldMousePos.y >= node.y && worldMousePos.y <= node.y + node.height
        );

        if (selectedNode) {
            // If right-clicked on a node, set it as the *single* selected node for context menu operations
            // This might override a multi-selection if you right-click a node that wasn't part of it,
            // or if you right-click a node that *is* part of it, it ensures `selectedNode` is set correctly.
            // Consider if you want right-clicking an already selected node in a group to act on the group.
            if (!selectedNodes.includes(selectedNode)) {
                selectedNodes = [selectedNode]; // Clear multi-selection and select just this one
            }
            selectedConnection = null; // Clear connection selection if right-clicking a node
            drawProcedureCanvas(); // To highlight the clicked node

            nodeContextMenu.style.left = `${e.clientX}px`;
            nodeContextMenu.style.top = `${e.clientY}px`;
            nodeContextMenu.classList.remove('hidden');
        } else {
            // If right-clicked on empty canvas, show canvas-specific context menu
            canvasContextMenu.style.left = `${e.clientX}px`;
            canvasContextMenu.style.top = `${e.clientY}px`;
            canvasContextMenu.classList.remove('hidden');
        }
    }

    // Hide context menus if clicking anywhere else
    document.addEventListener('click', (e) => {
        let redrawNeeded = false;
        if (!nodeContextMenu.contains(e.target)) {
            if (!nodeContextMenu.classList.contains('hidden')) {
                nodeContextMenu.classList.add('hidden');
                redrawNeeded = true;
            }
        }
        if (!canvasContextMenu.contains(e.target)) {
            if (!canvasContextMenu.classList.contains('hidden')) {
                canvasContextMenu.classList.add('hidden');
                redrawNeeded = true;
            }
        }
        // If click was outside both menus, and not part of an active operation, clear hover
        if (!isDrawingNewConnection && !isDraggingNode && !isPanningProcedureCanvas && !isDrawingSelection) {
            if (hoveredPortInfo) {
                hoveredPortInfo = null;
                redrawNeeded = true;
            }
        }
        if (redrawNeeded) {
            drawProcedureCanvas(); // Redraw to remove menus and clear hover effects
        }
    });

    // --- Canvas Context Menu Actions ---
    contextPanModeBtn.addEventListener('click', () => {
        currentProcedureMode = 'pan';
        updateProcedureCanvasCursor();
        canvasContextMenu.classList.add('hidden');
        selectedNodes = []; // Clear selection when switching modes
        selectedConnection = null;
        drawProcedureCanvas();
    });

    contextSelectModeBtn.addEventListener('click', () => {
        currentProcedureMode = 'select';
        updateProcedureCanvasCursor();
        canvasContextMenu.classList.add('hidden');
        selectedNodes = []; // Clear selection when switching modes
        selectedConnection = null;
        drawProcedureCanvas();
    });

    contextClearSelectionBtn.addEventListener('click', () => {
        selectedNodes = [];
        selectedConnection = null;
        drawProcedureCanvas();
        canvasContextMenu.classList.add('hidden');
    });

    contextDeleteAllConnectionsBtn.addEventListener('click', () => {
        connections = []; // Clear all connections
        selectedConnection = null; // Ensure no connection is selected
        drawProcedureCanvas();
        canvasContextMenu.classList.add('hidden');
    });

    contextDeleteSelectedConnectionBtn.addEventListener('click', () => {
        if (selectedConnection) {
            connections = connections.filter(conn => conn !== selectedConnection);
            selectedConnection = null;
            drawProcedureCanvas();
            canvasContextMenu.classList.add('hidden');
        }
    });

    let init_copy_offset = 30;
    let copy_offset = init_copy_offset;
    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Prevent shortcuts if typing in input/textarea
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        if (e.key === 'Delete') {
            e.preventDefault();
            let deletedSomething = false;

            if (selectedNodes.length > 0) {
                const nodeIdsToDelete = new Set(selectedNodes.map(node => node.id));
                procedureNodes = procedureNodes.filter(node => !nodeIdsToDelete.has(node.id));
                connections = connections.filter(conn => !nodeIdsToDelete.has(conn.sourceNodeId) && !nodeIdsToDelete.has(conn.targetNodeId));
                selectedNodes = [];
                selectedNode = null;
                deletedSomething = true;
            } else if (selectedConnection) { // New: Delete selected connection
                connections = connections.filter(conn => conn !== selectedConnection);
                selectedConnection = null;
                deletedSomething = true;
            }

            if (deletedSomething) {
                drawProcedureCanvas();
                drawOverviewCanvas();
                nodeContextMenu.classList.add('hidden'); // Close any open node menu
                canvasContextMenu.classList.add('hidden'); // Close any open canvas menu
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNodes.length > 0) {
            e.preventDefault();
            copy_offset = init_copy_offset;
            clipboardNode = selectedNodes.map(node => ({ ...node, id: Date.now() + Math.random() })); // Give new unique IDs
            console.log('Nodes copied via keyboard:', clipboardNode);
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardNode && clipboardNode.length > 0) {
            e.preventDefault();
            const newNodes = clipboardNode.map(node => ({
                ...node,
                id: Date.now() + Math.random(), // Ensure unique ID for pasted node
                x: node.x + copy_offset,
                y: node.y + copy_offset
            }));
            
            // Add new nodes to procedureNodes
            newNodes.forEach(newNode => procedureNodes.push(newNode));
            
            // Select the newly pasted nodes
            selectedNodes = newNodes;
            selectedNode = newNodes[0]; // Set first pasted node as primary selected (optional)
            selectedConnection = null; // Clear connection selection when pasting nodes
            
            copy_offset += init_copy_offset;
            drawProcedureCanvas();
            drawOverviewCanvas();
            console.log('Nodes pasted via keyboard:', newNodes);
        }

        // Keyboard shortcuts to switch modes (Optional but helpful)
        if (e.key === 'p' || e.key === 'P') { // 'p' for Pan mode
            currentProcedureMode = 'pan';
            updateProcedureCanvasCursor();
            selectedNodes = [];
            selectedConnection = null;
            drawProcedureCanvas();
            e.preventDefault();
        }
        if (e.key === 's' || e.key === 'S') { // 's' for Select mode
            currentProcedureMode = 'select';
            updateProcedureCanvasCursor();
            selectedNodes = [];
            selectedConnection = null;
            drawProcedureCanvas();
            e.preventDefault();
        }

        // New: Shortcut for overview toggle
        if (e.key === 'o' || e.key === 'O') {
            e.preventDefault();
            overviewWindow.classList.toggle('hidden');
            toggleOverviewBtn.textContent = overviewWindow.classList.contains('hidden') ? '▲' : '▼';
            if (!overviewWindow.classList.contains('hidden')) {
                resizeProcedureCanvas();
            }
        }
    });

    // --- AI Assistant Logic ---
    generateInsightBtn.addEventListener('click', askAI);

    async function askAI() {
        if (!selectedNode) {
            aiResponseOutput.textContent = "Please select a node first to ask the AI.";
            return;
        }

        const userPrompt = aiPromptInput.value.trim();
        if (!userPrompt) {
            aiResponseOutput.textContent = "Please enter a question for the AI.";
            return;
        }

        aiLoadingIndicator.classList.remove('hidden');
        aiResponseOutput.textContent = ''; // Clear previous response

        const nodeInfo = `Selected Node: Type=${selectedNode.type}, Text=${selectedNode.text}.`;
        const fullPrompt = `Based on the following node information: "${nodeInfo}" and the user's question: "${userPrompt}". Provide a concise and helpful insight or suggestion.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: fullPrompt }] });
        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas will automatically provide this at runtime
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let retries = 0;
        const maxRetries = 5;
        const baseDelay = 1000; // 1 second

        while (retries < maxRetries) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.candidates && result.candidates.length > 0 &&
                        result.candidates[0].content && result.candidates[0].content.parts &&
                        result.candidates[0].content.parts.length > 0) {
                        aiResponseOutput.textContent = result.candidates[0].content.parts[0].text;
                    } else {
                        aiResponseOutput.textContent = "AI response format unexpected.";
                        console.error("AI response format unexpected:", result);
                    }
                    break; // Exit loop on success
                } else if (response.status === 429) { // Too Many Requests
                    retries++;
                    const delay = baseDelay * Math.pow(2, retries - 1); // Exponential backoff
                    console.warn(`Rate limit hit, retrying in ${delay / 1000}s... (Attempt ${retries}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    aiResponseOutput.textContent = `Error: ${response.status} ${response.statusText}`;
                    console.error("API error:", response);
                    break; // Exit loop on other errors
                }
            } catch (error) {
                aiResponseOutput.textContent = `Network Error: ${error.message}`;
                console.error("Fetch error:", error);
                break; // Exit loop on network errors
            }
        }

        if (retries === maxRetries) {
            aiResponseOutput.textContent = "Failed to get AI response after multiple retries due to rate limiting or network issues. Please try again later.";
        }

        aiLoadingIndicator.classList.add('hidden');
    }




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
    // --- Double-click Handler for Nodes (NEW) ---
    procedureCanvas.addEventListener('dblclick', (e) => {
        const mousePos = getProcedureMousePos(procedureCanvas, e);
        const worldMousePos = procedureCanvasToWorldCoords(mousePos.x, mousePos.y);
        const clickedNode = procedureNodes.find(node =>
            worldMousePos.x >= node.x && worldMousePos.x <= node.x + node.width &&
            worldMousePos.y >= node.y && worldMousePos.y <= node.y + node.height
        );


        if (clickedNode) {
            selectedNode = clickedNode; // Ensure the double-clicked node is selected
            console.log('Double-clicked node:', selectedNode.name, selectedNode.type);
            // Request main process to open the detail window
            if (window.electronAPI && window.electronAPI.openNodeDetail) {
                window.electronAPI.openNodeDetail(selectedNode.type);
            } else {
                console.error('electronAPI.openNodeDetail not available. Is preload.js configured correctly?');
            }
        }
    });
    // Initial cursor update
    updateProcedureCanvasCursor();

    // This is the end of the code 
});
