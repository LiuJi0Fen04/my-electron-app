document.addEventListener('DOMContentLoaded', () => {
    const sidePanel = document.getElementById('sidePanel');
    const panelItems = document.querySelectorAll('.panel-item');
    const pinToggleButton = document.getElementById('pinToggleButton'); // Now targets the <a> tag
    const mainContent = document.getElementById('mainContent');

    let isPinned = false; // New state variable to track if the panel is pinned
    // let isConfigOn = false;
    pinToggleButton.addEventListener('click', () => {
        isPinned = !isPinned; // Toggle the pinned state
        updatePanelState(); // Update the panel's appearance
    });

    // Add event listeners for hover (mouseenter and mouseleave)
    sidePanel.addEventListener('mouseenter', () => {
        if (!isPinned) {
            sidePanel.classList.add('open');
        }
    });

    sidePanel.addEventListener('mouseleave', () => {
        if (!isPinned) {
            sidePanel.classList.remove('open');
        }
    });

    window.addEventListener('keydown', (event) => {
        const isKeyPin = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b';
        if(isKeyPin){
            isPinned = !isPinned;
            updatePanelState();

        }
    })



    // Add click event listeners to each panel item
    panelItems.forEach(item => {
        item.addEventListener('click', (event) => {
            // item.classList.add('active');
            event.preventDefault(); // Prevent default link behavior
            const action = item.getAttribute('data-action');
            // // Show the target action
            // const targetAction = document.getElementById('config');
            // if (targetAction){
            //     targetAction.classList.add('active'); // Add 'active' class (useful for styling or other JS logic)
            // }
            // else{
            //     console.log('don\' find ', action);
            // }
            if (action) {
                if (action === 'config'){
                    // isConfigOn = true;
                    console.log('config clicked')
                    // window.electronAPI.send('navigate', 'config.html')
                    loadMainContent('./project_config/config.html');
                    // loadStyleOnce('config.css');
                }
                else if (action === 'settings'){
                    console.log('config clicked')
                    window.electronAPI.openNewWindow('./settings/settings.html', false);
                    // loadMainContent('./settings/settings.html');
                }
                else if (action === 'home'){
                    mainContent.innerHTML = `
                        <h1 class="main-title">Welcome to the Main Application</h1>
                        <p class="main-text">
                            This is the main content area of your Electron application. The side panel on the left will expand
                            when you hover over it, revealing the names of the navigation items. You can click on any
                            icon or text to trigger an action (check the browser's console for output).
                            This layout is fully responsive and adapts to different screen sizes.
                        </p>
                        <div class="info-box">
                            <h2 class="info-box-title">使用方法:</h2>
                            <ul class="info-box-list">
                                <li>选择根据图像和模型创建新项目（或者直接创建）</li>
                                <li>使用鼠标对各个类进行命名，右键编辑该类的算法（直接创建可以依据工具组合）</li>
                                <li>选择插入自定义代码段（可选）</li>
                                <li>运行debug</li>
                                <li>安装到软件</li>
                            </ul>
                        </div>
                    `;
                }
                else{
                    console.log(`Action clicked: ${action}`);
                    // You can add your Electron IPC (Inter-Process Communication)
                    // calls here to interact with the main process.
                    // For this demo, we'll just log to the console.

                    showMessageBox(`You clicked: ${action.charAt(0).toUpperCase() + action.slice(1)}`);                    
                }
            }
        });
    });
    function updatePanelState() {
        if (isPinned) {
            sidePanel.classList.add('open', 'pinned'); // Add 'pinned' class when pinned(does the class pinned not used)
            mainContent.classList.add('pushed');
            pinToggleButton.classList.add('active'); // Activate pin icon visual
        } else {
            sidePanel.classList.remove('open', 'pinned'); // Remove 'pinned' class
            mainContent.classList.remove('pushed');
            pinToggleButton.classList.remove('active'); // Deactivate pin icon visual
        }
    }
    /**
     * Cleans up dynamically added styles and scripts.
     * This prevents styles from one page affecting another.
     */
    function cleanupDynamicContent() {
        document.querySelectorAll('.dynamic-style').forEach(style => style.remove());
        document.querySelectorAll('.dynamic-script').forEach(script => script.remove());
    }
    
    /**
     * Displays a custom message box instead of using alert().
     * @param {string} message The message to display.
     */
    function showMessageBox(message) {
        let messageBox = document.getElementById('messageBox');
        if (!messageBox) {
            messageBox = document.createElement('div');
            messageBox.id = 'messageBox';
            // Apply styles directly or via classes matching style.css
            messageBox.className = 'message-box-overlay';
            messageBox.innerHTML = `
                <div class="message-box-content">
                    <p class="message-box-text">${message}</p>
                    <button id="messageBoxClose" class="message-box-button">
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(messageBox);

            document.getElementById('messageBoxClose').addEventListener('click', () => {
                messageBox.classList.remove('message-box-active');
                // is As
                setTimeout(() => messageBox.remove(), 300); // Remove after transition
            });
        }
        // Show the message box
        messageBox.classList.add('message-box-active');
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
    
    function loadStyleOnce(href) {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        }
      }


    // Load the initial home content when the app starts
    document.querySelector('[data-action="home"]').click();
});