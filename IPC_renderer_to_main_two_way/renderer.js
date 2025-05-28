const btn = document.getElementById('btn')
const filePathElement = document.getElementById('filePath')

btn.addEventListener('click', async () => {
  // await can only be use in a async function
  const filePath = await window.electronAPI.openFile()
  filePathElement.innerText = filePath
})

// // using then to t
// btn.addEventListener('click', async () => {
//   window.electronAPI.openFile().then((filePath) => {
//     filePathElement.innerText = filePath
//   })
//   filePathElement.textContent = filePath || 'No file selected'
// })


// Summary Table
// | Function Declaration | Is Async? | Can use await inside? |
// |-----------------------------|-----------|------------------------|
// | async function foo() {} | Yes | Yes |
// | function foo() {} | No | No |
// | const foo = async () => {}| Yes | Yes |
// | const foo = () => {} | No | No |


// Summary Table
// | Property | Includes hidden text? | Aware of CSS? | Faster? | Preserves formatting? |
// |---------------|----------------------|--------------|---------|----------------------|
// | textContent | Yes | No | Yes | No |
// | innerText | No | Yes | No | Yes |
// In short:
// Use textContent if you want all the text, regardless of visibility or formatting.
// Use innerText if you want only the visible, rendered text as seen by the user.