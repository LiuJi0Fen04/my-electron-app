const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  // arrow function implicit return 
  openFile: () => ipcRenderer.invoke('dialog:openFile')   // return the promise(uisng ipcMain.handle)
  // openFile: () => { ipcRenderer.invoke('dialog:openFile'); } // undefined
})



// equivalent function 
function openFile() {
  return ipcRenderer.invoke('dialog:openFile');
}
