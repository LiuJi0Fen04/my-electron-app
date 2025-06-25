document.getElementById('recordBtn').addEventListener('click', async () => {
    const input = document.getElementById('textInput');
    const content = input.value.trim();
  
    if (content) {
      await window.db.insert(content);
      const records = await window.db.getAll();
      console.clear();
      records.forEach((row, i) => {
        console.log(`[${i + 1}] ${row.content}`);
      });
      input.value = '';
    } else {
      console.warn("Input is empty");
    }
  });
  