// ondragstart is a built-in event handler property in the DOM (Document Object Model). It's part of the HTML Drag and Drop API and is triggered when the user starts dragging an element.
document.getElementById('drag1').ondragstart = (event) => {
  // Prevents the browser’s default drag behavior. This is necessary to take full control of the drag operation in Electron.
    event.preventDefault()
    window.electron.startDrag('drag-and-drop-1.md')
  }
  
  document.getElementById('drag2').ondragstart = (event) => {
    event.preventDefault()
    window.electron.startDrag('drag-and-drop-2.md')
  }