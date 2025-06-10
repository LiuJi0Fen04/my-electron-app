const mainImage = document.getElementById('main-image');
const thumbnailContainer = document.getElementById('thumbnail-container');
let imageFiles = [];
let folderPath = '';

// --- Create the Intersection Observer ---
// This observer will fire a callback function whenever one of the target elements
// (our thumbnails) intersects with the thumbnailContainer.
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        // If the thumbnail is intersecting the viewport (i.e., is visible)
        if (entry.isIntersecting) {
            const thumb = entry.target;
            const realSrc = thumb.dataset.src; // Get the real image path from data-src

            // Set the real image path to the src attribute
            thumb.src = realSrc;

            // Once loaded, we don't need to observe it anymore
            observer.unobserve(thumb);
        }
    });
}, {
    // Use the thumbnailContainer as the area to track intersections
    root: thumbnailContainer,
    // Add a margin to start loading images just before they become visible
    rootMargin: '0px 100px 0px 100px'
});


// Listen for the image list sent from the main process
window.electronAPI.onLoadImages((fp, files) => {
    folderPath = fp;
    imageFiles = files;
    
    // Clear old thumbnails and state
    thumbnailContainer.innerHTML = '';

    if (imageFiles.length === 0) {
        mainImage.src = '';
        mainImage.alt = 'No supported image formats found in this folder.';
        return;
    }

    // --- Create thumbnails WITHOUT loading the image data immediately ---
    imageFiles.forEach((file, index) => {
        const thumb = document.createElement('img');
        const filePath = `file://${folderPath}/${file}`;
        
        // IMPORTANT: Don't set the 'src' attribute here.
        // Instead, store the path in a 'data-src' attribute.
        thumb.dataset.src = filePath; 
        
        thumb.alt = file;
        thumb.classList.add('thumbnail');

        // Add click event listener
        thumb.addEventListener('click', () => {
            updateMainImage(filePath);
            
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });

        thumbnailContainer.appendChild(thumb);
        
        // Tell the Intersection Observer to start watching this thumbnail
        observer.observe(thumb);

        // Display the first image by default
        if (index === 0) {
            // The first image can be loaded immediately
            thumb.src = filePath; 
            updateMainImage(filePath);
            thumb.classList.add('active');
        }
    });
});

function updateMainImage(filePath) {
    mainImage.src = filePath;
    mainImage.alt = filePath.split('/').pop();
}