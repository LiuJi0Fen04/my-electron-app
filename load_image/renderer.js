
const btn = document.getElementById('select-folder-btn');
const container = document.getElementById('image-container');

const preview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const closeBtn = document.getElementById('close-preview');



btn.addEventListener('click', async () => {
  const imagePaths = await window.electronAPI.selectFolder();
  container.innerHTML = ''; // 清空旧内容

  if (imagePaths.length === 0) {
    container.innerHTML = '<p>未找到图像文件。</p>';
    return;
  }

  imagePaths.forEach(src => {
    // 'img' tells the browser what types of HTML element to create
    const img = document.createElement('img');
    img.src = src;
    // a built-in property that gives you access to the list of CSS classes atteched to the element; then you can style the image usign 
    img.classList.add('thumb');

    // 🖱️ When thumbnail is clicked → show large image
    img.addEventListener('click', () => {
        previewImg.src = src;         // Set the big image source
        console.log(previewImg.src)
        preview.classList.remove('hidden'); // Show the preview box
      });

    container.appendChild(img);
  });
});

// ❌ When user clicks close (×)
closeBtn.addEventListener('click', () => {
preview.classList.add('hidden');
previewImg.src = ''; // Optional: clear image
});