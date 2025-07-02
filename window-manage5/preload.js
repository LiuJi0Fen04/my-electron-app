const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
    openNewWindow: (filePath, frame) => ipcRenderer.send('open-new-window', filePath, frame),
    selectFolder: () => ipcRenderer.invoke('select-folder')
});

contextBridge.exposeInMainWorld('db', {
    // for project
    insert: (content) => ipcRenderer.invoke('insert-project', content), // add project
    getAll: () => ipcRenderer.invoke('get-records'),
    has: (content) => ipcRenderer.invoke('has-record', content),
    delete: (content) => ipcRenderer.invoke('delete-record', content),
    rename: (oldContent, newContent) => ipcRenderer.invoke('rename-record', oldContent, newContent),
    getProjectId: (projectName) => ipcRenderer.invoke('get-project-id', projectName),

    // for sub project
    addSubProject: (subProject) => ipcRenderer.invoke('add-sub-project', subProject), // add sub-project
    getSubProjects: (projectId) => ipcRenderer.invoke('db-get-sub-projects', projectId),
    deleteSubProject: (subProjectId) => ipcRenderer.invoke('db-delete-sub-project', subProjectId)

});
