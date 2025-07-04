(() => {
    // Select the form elements from the DOM
    const createBtn = document.getElementById('create-btn');
    const backBtn = document.getElementById('back-btn');
    const projectNameInput = document.getElementById('projectName');
    const productNameInput = document.getElementById('productName');
    const stationNumberInput = document.getElementById('stationNumber');
    const browseBtn = document.getElementById('browseBtn');
    const folderPathInput = document.getElementById('folderPath');

    // Add input event listener to the Project Name field for real-time validation
    if (projectNameInput) {
        projectNameInput.addEventListener('input', () => {
            // Get the current value from the input field
            const currentValue = projectNameInput.value;
            
            // Use a regular expression to remove any characters that are not letters (A-Z, a-z)
            const sanitizedValue = currentValue.replace(/[^a-zA-Z0-9]/g, '');
            
            // Update the input field's value with the sanitized version
            projectNameInput.value = sanitizedValue;
        });
    }

    // Add input event listener to the Project Name field for real-time validation
    if (productNameInput) {
        productNameInput.addEventListener('input', () => {
            // Get the current value from the input field
            const currentValue = productNameInput.value;
            
            // Use a regular expression to remove any characters that are not letters (A-Z, a-z)
            const sanitizedValue = currentValue.replace(/[^a-zA-Z0-9]/g, '');
            
            // Update the input field's value with the sanitized version
            productNameInput.value = sanitizedValue;
        });
    }

    if (backBtn){
        backBtn.addEventListener('click', async () => {
            loadMainContent('./project_config/config.html');
        });
    }

    // Check if the create button exists to avoid errors
    if (createBtn) {
        // Add a click event listener to the "Create" button
        createBtn.addEventListener('click', async () => {
            // Retrieve the current values from the input fields
            const projectName = projectNameInput.value.trim();
            const productName = productNameInput.value.trim();
            const stationNumber = stationNumberInput.value;

            // // Check if all fields are filled
            // if (!projectName || !productName || !stationNumber) {
            //     alert('Please fill out all fields before creating the project.');
            //     return; // Stop the function if validation fails
            // }
            if (!projectName) {
                alert('Please fill Project Name');
                return; // Stop the function if validation fails
            }
            
            // 🔍 Check if it already exists
            // const exists = await window.db.has(projectName);
            // if (exists) {
            let proj_id = await window.db.getProjectId(projectName);
            if (proj_id !== null) {
                alert('This projectName has already been recorded.');
                console.log("Project ID:", proj_id);
                // return;
                // function to return the existing project id 
            }else{
                await window.db.insert(projectName);
                proj_id = await window.db.getProjectId(projectName);
                console.log("new Project ID:", proj_id);
                if (productName){
                    await window.db.addSubProject({
                        projectId: parseInt(proj_id),
                        productName: productName,
                        stationNumber: parseInt(stationNumber)
                    });

                }
                const records = await window.db.getAll();
                records.forEach((row, i) => {
                    console.log(`[${i + 1}] ${row.content}`);
                });


                // Format the message with the collected project details
                const message = `Project successfully created with the following details:\n
                                - Project Name: ${projectName}
                                - Product Name: ${productName}
                                - Station Number: ${stationNumber}`;

                // Display the success message
                alert(message);                
            }
        });
    }

    if(browseBtn){
        browseBtn.addEventListener('click', async () => {
            const folderPath = await window.electronAPI.selectFolder();
            if(folderPath){
                folderPathInput.value = folderPath;
            }
        })

    }
    // Add input event listener for station number validation
    if (stationNumberInput) {
        stationNumberInput.addEventListener('input', () => {
            // Ensure the value is an integer and at least 1
            let value = Math.floor(Number(stationNumberInput.value) || 0);
            if (value < 1) {
                value = 1;
            }
            stationNumberInput.value = value;
        });
    }
})();