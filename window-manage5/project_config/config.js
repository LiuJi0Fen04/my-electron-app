// This is an IIFE. The entire code is wrapped in a function that
// runs immediately, creating a private scope.
(async () => {
    // Because 'clickableAreas' is now inside a function, it is not global.
    // It will be created and destroyed each time the script is loaded.
    const clickableAreas = document.querySelectorAll('.clickable-area');
    const contextMenu = document.getElementById('contextMenu');

    let selectedContent = null;
    // let selectContent = null;


    clickableAreas.forEach(area => {
        area.addEventListener('click', () => {
            // This logic remains the same.
            // if (typeof showMessageBox === 'function') {
            if (area.id === 'config_method1') {
                loadMainContent('./project_config/config_create.html')
            } 
            else if (area.id === 'config_method2') {
                loadMainContent('./project_config/config_create2.html')
            }
        });
    });

    const records = await window.db.getAll();
    updateRecentList(records);
    // Hide the menu on click elsewhere
    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });
    // Menu actions
    document.getElementById('menu-delete').addEventListener('click', async () => {
        console.log('selectedContent: ',selectedContent);
        if (!selectedContent) return;

        await window.db.delete(selectedContent);
        const records = await window.db.getAll();
        updateRecentList(records);
        contextMenu.style.display = 'none';
    });

    document.getElementById('menu-rename').addEventListener('click', async () => {
        console.log('selectedContent: ',selectedContent);
        if (!selectedContent) return;
        showRenameModal(selectedContent, async (newName) => {
            if (newName && newName !== selectedContent) {
              await window.db.rename(selectedContent, newName);
              const records = await window.db.getAll();
              updateRecentList(records);
            }
        });
        contextMenu.style.display = 'none';
    });
      
    document.getElementById('menu-open').addEventListener('click', () => {
        if (!selectedContent) return;
        // Example: open in console
        console.log(`Opening in code: ${selectedContent}`);
        alert(`Simulating "open in code" for:\n${selectedContent}`);
        contextMenu.style.display = 'none';
    });

        



    function updateRecentList(records) {
        const recentList = document.getElementById('recentList');
        if (!recentList) return;
    
        // Clear existing list
        recentList.innerHTML = '';
    
        // Get the last 5 records (most recent last)
        const lastFive = records.slice(-5).reverse(); // show newest first
    
        // Add to HTML
        lastFive.forEach(row => {
        const li = document.createElement('li');
        li.textContent = row.content;

        li.classList.add('clickable-item'); // add class for styling

        // add click behavior
        li.addEventListener('click', () => {
            alert(`You clicked: ${row.content}`);
        })

        li.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.pageX, e.pageY, row.content)
        })

        recentList.appendChild(li);
        });
    }
    
    function showContextMenu(x, y, content) {
        selectedContent = content;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.display = 'block';
    }




})(); // The final () invokes the function immediately.

/**
 * Cleans up dynamically added styles and scripts.
 * This prevents styles from one page affecting another.
 */
function cleanupDynamicContent() {
    document.querySelectorAll('.dynamic-style').forEach(style => style.remove());
    document.querySelectorAll('.dynamic-script').forEach(script => script.remove());
}

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


function showRenameModal(oldContent, callback) {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    const confirmBtn = document.getElementById('renameConfirm');
    const cancelBtn = document.getElementById('renameCancel');
  
    input.value = oldContent;
    modal.style.display = 'block';
  
    confirmBtn.onclick = () => {
      modal.style.display = 'none';
      callback(input.value.trim());
    };
  
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  