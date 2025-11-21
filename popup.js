document.getElementById('saveBtn').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value.trim();
  if (key) {
    chrome.storage.local.set({ 'geminiApiKey': key }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Saved successfully!';
      setTimeout(() => status.textContent = '', 2000);
    });
  }
});