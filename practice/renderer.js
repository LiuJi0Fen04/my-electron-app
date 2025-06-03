document.getElementById('toggle-dark-mode').addEventListener('click', async () => {
    const isDarkMode = await window.darkmode.toggle() // preload defined
    console.log(isDarkMode)
    document.getElementById('theme-source').innerHTML = isDarkMode ? 'Dark' : 'Light'

})

document.getElementById('reset-to-system').addEventListener('click', async () => {
    await window.darkMode.system()
    document.getElementById('theme-source').innerHTML = 'System'
})