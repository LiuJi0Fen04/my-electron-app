const backBtn = document.getElementById('backBtn')
const forwardBtn = document.getElementById('forwardBtn')
const backHistoryBtn = document.getElementById('backHistoryBtn')
const forwardHistoryBtn = document.getElementById('forwardHistoryBtn')
const urlInput = document.getElementById('urlInput')
const goBtn = document.getElementById('goBtn')
const historyPanel = document.getElementById('historyPanel')


// update button status of the html
async function updateButtons () {
  console.log(" function updateBtn")

  const canGoBack = await window.electronAPI.canGoBack()
  const canGoForward = await window.electronAPI.canGoForward()
  backBtn.disabled = !canGoBack
  backHistoryBtn.disabled = !canGoBack

  forwardBtn.disabled = !canGoForward
  forwardHistoryBtn.disabled = !canGoForward
}

// update urlInput value of html
async function updateURL () {
  console.log(" function updateURL", urlInput.value)
  urlInput.value = await window.electronAPI.getCurrentURL()
}


// add https:// to the url if it has no protocol
function transformURL (url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const updatedUrl = 'https://' + url
    return updatedUrl
  }
  return url
}

// transform and electronAPI loadURL
async function navigate (url) {
  const urlInput = transformURL(url)
  await window.electronAPI.loadURL(urlInput)
  console.log("function navigate")
}

async function showHistory (forward = false) {
  const history = await window.electronAPI.getHistory()
  const currentIndex = history.findIndex(entry => entry.url === transformURL(urlInput.value))

  if (!currentIndex) {
    return
  }

  const relevantHistory = forward
    ? history.slice(currentIndex + 1)
    : history.slice(0, currentIndex).reverse() // back history should reverse


  // removes all existing child elements from historyPannel
  historyPanel.innerHTML = ''
  relevantHistory.forEach(entry => {
    const div = document.createElement('div')
    div.textContent = `Title: ${entry.title}, URL: ${entry.url}`
    div.onclick = () => navigate(entry.url)
    historyPanel.appendChild(div) // add div to history pannel
    // const div1 = document.createElement('div')
    // div1.textContent = `Title: test, URL: test`
    // historyPanel.appendChild(div1) // add div to history pannel

  })

  historyPanel.style.display = 'block'
}

backBtn.addEventListener('click', () => window.electronAPI.goBack())
forwardBtn.addEventListener('click', () => window.electronAPI.goForward())
backHistoryBtn.addEventListener('click', () => showHistory(false))
forwardHistoryBtn.addEventListener('click', () => showHistory(true))
goBtn.addEventListener('click', () => {console.log("goBtn clicked");navigate(urlInput.value)})

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    console.log("enter key pressed")
    // 由于是异步执行的，navigate中的console.log会和其他事件的console.log混在一起
    navigate(urlInput.value)
  }
})


// listener for click event if not on button, then hide history pannel
// mouse should focus on the main window to trigger this event
document.addEventListener('click', (e) => {
  if (e.target !== historyPanel && !historyPanel.contains(e.target) &&
    e.target !== backHistoryBtn && e.target !== forwardHistoryBtn) {
    historyPanel.style.display = 'none'
    console.log(" click history pannel non-history")
  }
})


// 应该是每次都要执行 更新按钮
// window.electronAPI.onNavigationUpdate is not a function that you call directly to perform an action immediately.
// Instead, it registers a callback function (your arrow function) to be executed when the 'nav:updated' event is received from the main process.
// This is a classic example of event-driven programming: you set up (register) a listener, and the function you provide is called later, whenever the event occurs.
window.electronAPI.onNavigationUpdate(() => {
  console.log("electronAPI onNavigationUpdate")
  updateButtons()
  updateURL()
})

updateButtons()