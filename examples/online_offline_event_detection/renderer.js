const updateOnlineStatus = () => {
    // a browser API that returns true if the user is online, false if offline
    document.getElementById('status').innerHTML = navigator.onLine ? 'online' : 'offline'
  }
  

  // listen for the browser event online (fires when the network is back online), only when status changes, the information will be updated 
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  
  // calls the function once immediately set the initial status on the page load
  updateOnlineStatus()