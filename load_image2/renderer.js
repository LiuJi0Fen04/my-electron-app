const mainImage = document.getElementById('main-image');
const thumbnailContainer = document.getElementById('thumbnail-container');
let imageFiles = [];
let folderPath = '';

// --- Create the Intersection Observer ---
// This observer will fire a callback function whenever one of the target elements
// (our thumbnails) intersects with the thumbnailContainer.
const observer = new IntersectionObserver((entries, observer) => {
  // entries is an array of IntersectionObserverEntry objects.
  // Each entry represents one of the elements being observed (in your case, a thumbnail image).
  // Each entry tells you whether that element is currently visible (intersecting) in the viewport (or container).
    entries.forEach(entry => {
        // If the thumbnail is intersecting the viewport (i.e., is visible). when roll the mouse the entry is true
        if (entry.isIntersecting) {
            const thumb = entry.target;
            const realSrc = thumb.dataset.src; // Get the real image path from data-src

            // Set the real image path to the src attribute
            thumb.src = realSrc;
            console.log('oberserved the image') 
            // Once loaded, we don't need to observe it anymore
            // observer is the IntersectionObserver instance itself.
            // You can use it to call methods like unobserve() or disconnect().
            observer.unobserve(thumb); // if i comment this line, the image will be loaded immediately
        }
    });
}, {
    // Use the thumbnailContainer as the area to track intersections(viewport)
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

        // You're using backticks (\``) because this syntax represents a **template literal** in JavaScript. Template literals allow you to embed variables directly inside a string using **${}`** syntax, making string concatenation more readable and efficient.
        const filePath = `file://${folderPath}/${file}`;
        
        // IMPORTANT: Don't set the 'src' attribute here.(directly assign the path to src, browser stars to load the image immediately)
        // Instead, store the path in a 'data-src' attribute.(stores the image path in a custom attribute 'data-src' which is only assigned to src once it enters the viewport)
        // the difference comes down to lazy loading versus immediate loading 
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
        

        // When you call observer.observe(thumb), you are telling the IntersectionObserver to start watching this specific element.
        // You can call observe() multiple times for different elements; the observer keeps track of all of them.
        observer.observe(thumb);

        // Display the first image by default
        if (index === 0) {
            // The first image can be loaded immediately
            console.log('display the first image')
            thumb.src = filePath; 
            updateMainImage(filePath);
            thumb.classList.add('active');
        }
    });
});

function updateMainImage(filePath) {
    mainImage.src = filePath;
    mainImage.alt = filePath.split('/').pop();  // get the image name 
}

// +----------------------+-----------------------------------------------+--------------------------------+
// | Step                 | Code Example                                  | Description                    |
// +----------------------+-----------------------------------------------+--------------------------------+
// | Define callback      | (entries, observer) => { ... }                | Handles intersection events    |
// | Set options          | { root, rootMargin, threshold }               | Controls observer behavior     |
// | Create observer      | new IntersectionObserver(callback, options)   | Instantiates the observer      |
// | Observe elements     | observer.observe(element)                     | Starts observing an element    |
// | Unobserve/disconnect | observer.unobserve(element) / .disconnect()   | Stops observing elements       |
// +----------------------+-----------------------------------------------+--------------------------------+


