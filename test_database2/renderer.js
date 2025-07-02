
const newProjectNameInput = document.getElementById('newProjectName');
const addProjectBtn = document.getElementById('addProjectBtn');
const projectListDiv = document.getElementById('projectList');

const subProjectForm = document.getElementById('subProjectForm');
const selectedProjectIdInput = document.getElementById('selectedProjectId');
const newSubProjectNameInput = document.getElementById('newSubProjectName');
const newSubProjectDescriptionInput = document.getElementById('newSubProjectDescription');
const newSubProjectStatusSelect = document.getElementById('newSubProjectStatus');
const addSubProjectBtn = document.getElementById('addSubProjectBtn');
const subProjectListDiv = document.getElementById('subProjectList');

let currentSelectedProjectId = null;

async function fetchAndDisplayProjects() {
    try {
        console.log('fetch display projects');
        const projects = await window.api.getProjects();
        projectListDiv.innerHTML = '';
        if (projects.length === 0) {
            projectListDiv.innerHTML = '<p>No projects yet.</p>';
        } else {
            projects.forEach(project => {
                const projectItem = document.createElement('div');
                projectItem.classList.add('project-item');
                projectItem.innerHTML = `
                    <span>${project.name}</span>
                    <button data-id="${project.id}" class="select-project-btn">View Sub-Projects</button>
                    <button data-id="${project.id}" class="delete-project-btn">Delete Project</button>
                `;
                projectListDiv.appendChild(projectItem);
            });

            document.querySelectorAll('.select-project-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const projectId = event.target.dataset.id;
                    currentSelectedProjectId = projectId;
                    selectedProjectIdInput.value = projectId;
                    subProjectForm.style.display = 'block';
                    fetchAndDisplaySubProjects(projectId);
                });
            });

            document.querySelectorAll('.delete-project-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const projectId = event.target.dataset.id;
                    if (confirm('Are you sure you want to delete this project and all its sub-projects?')) {
                        await window.api.deleteProject(projectId);
                        fetchAndDisplayProjects();
                        // Clear sub-project list if the deleted project was selected
                        if (currentSelectedProjectId === projectId) {
                            currentSelectedProjectId = null;
                            selectedProjectIdInput.value = '';
                            subProjectForm.style.display = 'none';
                            subProjectListDiv.innerHTML = '<p>Select a project to view its sub-projects.</p>';
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
        projectListDiv.innerHTML = `<p>Error loading projects: ${error.message}</p>`;
    }
}

async function fetchAndDisplaySubProjects(projectId) {
    try {
        const subProjects = await window.api.getSubProjects(projectId);
        subProjectListDiv.innerHTML = '';
        if (subProjects.length === 0) {
            subProjectListDiv.innerHTML = '<p>No sub-projects for this project yet.</p>';
        } else {
            subProjects.forEach(subProject => {
                const subProjectItem = document.createElement('div');
                subProjectItem.classList.add('sub-project-item');
                subProjectItem.innerHTML = `
                    <span>${subProject.name} (${subProject.status})</span>
                    <p>${subProject.description || 'No description'}</p>
                    <button data-id="${subProject.id}" class="delete-sub-project-btn">Delete</button>
                `;
                subProjectListDiv.appendChild(subProjectItem);
            });

            document.querySelectorAll('.delete-sub-project-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    // The event.target.dataset.id comes from a specific HTML attribute called a data attribute.
                    const subProjectId = event.target.dataset.id;
                    if (confirm('Are you sure you want to delete this sub-project?')) {
                        await window.api.deleteSubProject(subProjectId);
                        fetchAndDisplaySubProjects(currentSelectedProjectId); // Refresh the list
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error fetching sub-projects:', error);
        subProjectListDiv.innerHTML = `<p>Error loading sub-projects: ${error.message}</p>`;
    }
}

addProjectBtn.addEventListener('click', async () => {
    const projectName = newProjectNameInput.value.trim();
    if (projectName) {
        try {
            await window.api.addProject(projectName);
            newProjectNameInput.value = '';
            fetchAndDisplayProjects();
        } catch (error) {
            console.error('Error adding project:', error);
            alert(`Error adding project: ${error.message}. Project name might already exist.`);
        }
        const records = await window.api.getAll();
        console.clear();
        // records.forEach(record => {
        //     console.log('Project Name:', record.name);
        // });

        records.forEach((row, i) => {
          console.log(`[${i + 1}] ${row.name}`);
        });
    } else {
        alert('Project name cannot be empty.');
    }

});

addSubProjectBtn.addEventListener('click', async () => {
    const projectId = selectedProjectIdInput.value;
    const subProjectName = newSubProjectNameInput.value.trim();
    const subProjectDescription = newSubProjectDescriptionInput.value.trim();
    const subProjectStatus = newSubProjectStatusSelect.value;

    if (projectId && subProjectName) {
        try {
            await window.api.addSubProject({
                projectId: parseInt(projectId),
                name: subProjectName,
                description: subProjectDescription,
                status: subProjectStatus
            });
            newSubProjectNameInput.value = '';
            newSubProjectDescriptionInput.value = '';
            newSubProjectStatusSelect.value = 'To Do'; // Reset to default
            fetchAndDisplaySubProjects(projectId);
        } catch (error) {
            console.error('Error adding sub-project:', error);
            alert(`Error adding sub-project: ${error.message}`);
        }
    } else {
        alert('Sub-project name cannot be empty and a project must be selected.');
    }
});

// Initial load
fetchAndDisplayProjects();
