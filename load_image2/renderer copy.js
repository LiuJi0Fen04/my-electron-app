const mainImage = document.getElementById('main-image');
const thumbnailContainer = document.getElementById('thumbnail-container');

// 监听从主进程发送的图片列表
window.electronAPI.onLoadImages((folderPath, imageFiles) => {
    console.log('收到的图片列表:', imageFiles);
    
    // 清空旧的缩略图
    thumbnailContainer.innerHTML = '';

    if (imageFiles.length === 0) {
        mainImage.src = '';
        mainImage.alt = '此文件夹中没有找到支持的图片格式。';
        return;
    }

    // 创建并显示缩略图
    imageFiles.forEach((file, index) => {
        const thumb = document.createElement('img');
        // 注意：在HTML中加载本地文件，需要使用 'file://' 协议
        const filePath = `file://${folderPath}/${file}`; 
        thumb.src = filePath;
        thumb.alt = file;
        thumb.classList.add('thumbnail');

        // 为缩略图添加点击事件
        thumb.addEventListener('click', () => {
            updateMainImage(filePath);
            
            // 更新活动缩略图的样式
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });

        thumbnailContainer.appendChild(thumb);

        // 默认显示第一张图片
        if (index === 0) {
            updateMainImage(filePath);
            thumb.classList.add('active');
        }
    });
});

function updateMainImage(filePath) {
    mainImage.src = filePath;
    mainImage.alt = filePath.split('/').pop();
}