const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getProjects: () => ipcRenderer.invoke('db-get-projects'),
    addProject: (projectName) => ipcRenderer.invoke('db-add-project', projectName),
    getSubProjects: (projectId) => ipcRenderer.invoke('db-get-sub-projects', projectId),
    addSubProject: (subProject) => ipcRenderer.invoke('db-add-sub-project', subProject),
    deleteProject: (projectId) => ipcRenderer.invoke('db-delete-project', projectId),
    deleteSubProject: (subProjectId) => ipcRenderer.invoke('db-delete-sub-project', subProjectId),
    getAll: () => ipcRenderer.invoke('get-records')

});