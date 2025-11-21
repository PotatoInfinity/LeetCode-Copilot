let currentCode = "";
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: "panelReady" }, (response) => {
    if (response) {
      updateUI(response);
    }
  });
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "streamStatus") {
    updateUI(msg);
  }
});

function updateUI(msg) {
  const views = document.querySelectorAll('.state-view');
  views.forEach(v => v.classList.remove('active'));
  
  const badge = document.getElementById('lang-badge');

  if (msg.status === "loading") {
    document.getElementById('loading-state').classList.add('active');
    badge.innerText = "THINKING...";
    badge.style.background = "#b45309";
  } 
  else if (msg.status === "error") {
    document.getElementById('error-state').classList.add('active');
    document.getElementById('error-msg').innerText = msg.error || "Unknown error";
    badge.innerText = "ERROR";
    badge.style.background = "#ef4444";
  } 
  else if (msg.status === "success" && msg.data) {
    document.getElementById('success-state').classList.add('active');
    
    currentCode = msg.data.code;
    document.getElementById('code-display').innerHTML = highlight(currentCode);

    badge.innerText = (msg.language || "CODE").toUpperCase();
    badge.style.background = "#22c55e";
  }
  else {
    document.getElementById('placeholder-state').classList.add('active');
  }
}
document.getElementById('copy-btn').addEventListener('click', () => {
  if(currentCode) {
    navigator.clipboard.writeText(currentCode).then(() => {
      const btn = document.getElementById('copy-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = "✅";
      btn.style.color = "#4ade80";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.color = "#fff";
      }, 2000);
    });
  }
});

// --- Syntax Highlighter ---
function highlight(code) {
  if (!code) return "";
  let html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  const tokens = [];
  const save = (m) => { tokens.push(m); return `___T${tokens.length-1}___`; };

  html = html.replace(/(".*?"|'.*?')/g, m => `<span class="token-str">${save(m)}</span>`);
  html = html.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, m => `<span class="token-cmt">${save(m)}</span>`);

  const kw = "class|public|private|return|if|else|for|while|int|void|float|bool|def|import|from";
  html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="token-kw">$1</span>');
  html = html.replace(/\b([a-z_]\w*)(?=\()/gi, '<span class="token-fn">$1</span>');

  tokens.forEach((t, i) => html = html.replace(`___T${i}___`, t));
  return html;
}