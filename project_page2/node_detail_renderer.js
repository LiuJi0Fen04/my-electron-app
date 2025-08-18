document.addEventListener('DOMContentLoaded', () => {
    const nodeTitleElement = document.getElementById('node-title');
    const tabsContainer = document.getElementById('tabs-container'); // New element
    const tabContentDisplay = document.getElementById('tab-content-display'); // New element
    const closeButton = document.getElementById('close-detail-window');

    // Close button functionality
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            // Send a message to the main process to close this window
            if (window.nodeDetailAPI && window.nodeDetailAPI.closeWindow) {
                window.nodeDetailAPI.closeWindow();
            } else {
                console.error('nodeDetailAPI.closeWindow not available.');
            }
        });
    }

    // Function to show a specific tab
    const showTab = (tabIdToShow) => {
        // Deactivate all tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Hide all tab content panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Activate the clicked tab button
        const activeButton = document.querySelector(`.tab-button[data-tab-id="${tabIdToShow}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Show the corresponding tab content panel
        const activePanel = document.getElementById(tabIdToShow);
        if (activePanel) {
            activePanel.classList.add('active');
        }
    };

    // Listen for module data sent from the main process
    if (window.nodeDetailAPI && window.nodeDetailAPI.onModuleData) {
        window.nodeDetailAPI.onModuleData((moduleData) => {
            console.log('Received module data:', moduleData);
            if (!moduleData) {
                nodeTitleElement.textContent = 'No data available.';
                return;
            }

            // The moduleData will be an object like { "blur": [...] }
            const nodeTypeName = Object.keys(moduleData)[0];
            const tables = moduleData[nodeTypeName];

            nodeTitleElement.textContent = `${nodeTypeName.charAt(0).toUpperCase() + nodeTypeName.slice(1)} Node Details`;

            // Clear previous tabs and content
            tabsContainer.innerHTML = '';
            tabContentDisplay.innerHTML = '';

            if (!tables || tables.length === 0) {
                tabContentDisplay.textContent = 'No detailed descriptor found for this node type.';
                return;
            }

            let firstTabId = ''; // To activate the first tab by default

            tables.forEach((tableConfig, index) => {
                // Find the table key (e.g., 'table1', 'table2') and its display name
                const tableKey = Object.keys(tableConfig).find(key => key.startsWith('table'));
                const tableName = tableConfig[tableKey]; // e.g., 'input&output', 'parameter adjustment'
                const tabId = `tab-panel-${nodeTypeName}-${index}`; // Unique ID for tab panel

                if (index === 0) {
                    firstTabId = tabId; // Store the ID of the first tab
                }

                // Create Tab Button
                const tabButton = document.createElement('button');
                tabButton.classList.add('tab-button');
                tabButton.textContent = tableName;
                tabButton.dataset.tabId = tabId; // Store tabId for easy lookup
                tabButton.addEventListener('click', () => showTab(tabId));
                tabsContainer.appendChild(tabButton);

                // Create Tab Content Panel
                const tabPanel = document.createElement('div');
                tabPanel.classList.add('tab-panel');
                tabPanel.id = tabId; // Assign the unique ID

                const tableSection = document.createElement('div');
                tableSection.classList.add('table-section');
                // The table section heading can be derived from the tab name, or omitted if the tab itself serves as the heading
                // tableSection.innerHTML = `<h3>${tableName}</h3>`; // Optional: if you want heading inside tab content

                // Iterate over properties within the tableConfig (e.g., 'src', 'dst', 'blur_ksize', 'condition')
                for (const propKey in tableConfig) {
                    if (propKey !== tableKey) { // Skip the table identifier itself
                        const items = tableConfig[propKey]; // This will be an array of objects
                        if (Array.isArray(items)) {
                            items.forEach(item => {
                                const inputContainer = document.createElement('div');
                                inputContainer.classList.add('input-container');

                                const label = document.createElement('label');
                                // Use item.value as the label text, assuming it's descriptive
                                // label.textContent = `${item.value}:`;
                                label.textContent = `${propKey}:`;

                                let inputElement;
                                switch (item.widget) {
                                    case 'text':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'text';
                                        inputElement.value = item.value || ''; // Set initial value from JSON
                                        inputElement.placeholder = `Enter ${item.value}`;
                                        break;
                                    case 'number':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'number';
                                        inputElement.value = item.value || 0;
                                        inputElement.placeholder = `Enter ${item.value}`;
                                        break;
                                    case 'textarea':
                                        inputElement = document.createElement('textarea');
                                        inputElement.value = item.value || '';
                                        inputElement.rows = 3;
                                        inputElement.placeholder = `Enter ${item.value}`;
                                        break;
                                    case 'checkbox':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'checkbox';
                                        inputElement.checked = item.value === 'true'; // Assuming boolean as string
                                        label.textContent = item.value; // Label might be the checkbox description
                                        inputContainer.classList.add('checkbox-radio'); // Add class for flex styling
                                        break;
                                    case 'radio':
                                        // For radio buttons, you'd typically need more context about options
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'radio';
                                        inputElement.name = propKey; // Group radio buttons by property key
                                        inputElement.value = item.value;
                                        inputContainer.classList.add('checkbox-radio');
                                        break;
                                    case 'select':
                                        inputElement = document.createElement('select');
                                        if (item.options && Array.isArray(item.options)) {
                                            item.options.forEach(opt => {
                                                const option = document.createElement('option');
                                                // Check if opt is an object or just a value (string/number)
                                                if (typeof opt === 'object' && opt !== null && 'value' in opt) {
                                                    option.value = opt.value;
                                                    option.textContent = opt.label || opt.value;
                                                } else { // Assume it's a simple value
                                                    option.value = opt;
                                                    option.textContent = opt;
                                                }
                                                inputElement.appendChild(option);
                                            });
                                        } else {
                                            const defaultOption = document.createElement('option');
                                            defaultOption.textContent = "No options";
                                            inputElement.appendChild(defaultOption);
                                        }
                                        inputElement.value = item.value; // Set selected value
                                        break;
                                    case 'file':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'file';
                                        break;
                                    case 'date':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'date';
                                        inputElement.value = item.value;
                                        break;
                                    case 'range':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'range';
                                        inputElement.min = item.min || 0;
                                        inputElement.max = item.max || 100;
                                        inputElement.step = item.step || 1;
                                        inputElement.value = item.value;
                                        break;
                                    case 'color':
                                        inputElement = document.createElement('input');
                                        inputElement.type = 'color';
                                        inputElement.value = item.value;
                                        break;
                                    default:
                                        inputElement = document.createElement('span');
                                        inputElement.textContent = `Unsupported widget: ${item.widget} (Value: ${item.value})`;
                                        inputElement.style.color = 'red';
                                        break;
                                }

                                if (item.widget === 'checkbox' || item.widget === 'radio') {
                                    inputContainer.appendChild(inputElement);
                                    inputContainer.appendChild(label);
                                } else {
                                    inputContainer.appendChild(label);
                                    if (inputElement) {
                                        inputContainer.appendChild(inputElement);
                                    }
                                }
                                tableSection.appendChild(inputContainer);
                            });
                        }
                    }
                }
                tabPanel.appendChild(tableSection);
                tabContentDisplay.appendChild(tabPanel);
            });

            // Show the first tab by default
            if (firstTabId) {
                showTab(firstTabId);
            }
        });
    } else {
        console.error('nodeDetailAPI not available. Is node_detail_preload.js configured correctly?');
    }
});
