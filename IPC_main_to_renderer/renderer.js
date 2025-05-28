const counter = document.getElementById('counter')

function handleUpdateCounter(value) {
  const oldValue = Number(counter.innerText)
  const newValue = oldValue + value
  counter.innerText = newValue.toString()
  window.electronAPI.counterValue(newValue)
  console.log(newValue)
}
// Usage:
window.electronAPI.onUpdateCounter(handleUpdateCounter)


// // So, when you call onUpdateCounter, you must pass a function as an argument. 
// // That function will be called later when the event happens.
// window.electronAPI.onUpdateCounter((value) => {
//   const oldValue = Number(counter.innerText)
//   const newValue = oldValue + value
//   counter.innerText = newValue.toString()
//   window.electronAPI.counterValue(newValue)
//   console.log(newValue)
// })