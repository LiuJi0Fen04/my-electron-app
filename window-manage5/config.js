
// old1
// document.addEventListener('DOMContentLoaded', () => {
    // console.log('loaded config.js')
    // // this loops over each element in the Nodelist 
    // const clickableAreas = document.querySelectorAll('.clickable-area');

    // clickableAreas.forEach(area => {
    //     area.addEventListener('click', () => {
    //         // shows a browser alert with the message 
    //         alert(`You clicked on ${area.textContent}`);
    //     });
    // });
// });

// old2 twice click config cause error 'Identifier 'clickableAreas' has already been declared'
// console.log('loaded config.js')
// // this loops over each element in the Nodelist 
// const clickableAreas = document.querySelectorAll('.clickable-area');

// clickableAreas.forEach(area => {
//     area.addEventListener('click', () => {
//         // shows a browser alert with the message 
//         alert(`You clicked on ${area.textContent}`);
//     });
// });

// The Solution: Encapsulate Your Script with an IIFE
// The best practice for making external scripts self-contained and re-runnable is to wrap their code in an IIFE (Immediately Invoked Function Expression).
// An IIFE is a function that is defined and executed immediately. The key benefit is that it creates a private, temporary scope for your variables.


// This is an IIFE. The entire code is wrapped in a function that
// runs immediately, creating a private scope.
(() => {
    // Because 'clickableAreas' is now inside a function, it is not global.
    // It will be created and destroyed each time the script is loaded.
    const clickableAreas = document.querySelectorAll('.clickable-area');

    clickableAreas.forEach(area => {
        area.addEventListener('click', () => {
            // This logic remains the same.
            if (typeof showMessageBox === 'function') {
                loadMainContent('config_create.html')
                // showMessageBox(`You clicked on ${area.textContent}`);
            } else {
                alert(`You clicked on ${area.textContent}`);
            }
        });
    });
})(); // The final () invokes the function immediately.



   /**
     * CORRECTED FUNCTION: Fetches and loads HTML, CSS, and JS into the main area.
     * @param {string} page The HTML file to load (e.g., 'config.html')
     */
   async function loadMainContent(page) {
    // 1. Clean up content from the previously loaded page
    cleanupDynamicContent();

    try {
        const response = await fetch(page);
        if (!response.ok) {
            throw new Error(`Failed to load page: ${response.statusText}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 2. Find and add stylesheets from the loaded document's <head>
        doc.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = link.getAttribute('href');
            newLink.classList.add('dynamic-style'); // Add class for cleanup
            document.head.appendChild(newLink);
        });

        // 3. Inject the HTML from the <body> of the loaded document
        mainContent.innerHTML = doc.body.innerHTML;

        // 4. Find, create, and append scripts to make them execute
        doc.body.querySelectorAll('script').forEach(script => {
            const newScript = document.createElement('script');
            newScript.classList.add('dynamic-script'); // Add class for cleanup
            if (script.src) {
                // For external scripts, copy the src.
                // We must use a unique URL component to force re-execution if needed,
                // but for this case, simple attachment works.
                newScript.src = script.getAttribute('src');
            } else {
                // For inline scripts, copy the content
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript);
        });

    } catch (error) {
        console.error('Error loading content:', error);
        mainContent.innerHTML = `<p style="color: red; text-align: center;">Sorry, could not load content for ${page}.</p>`;
    }
}