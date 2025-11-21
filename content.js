let modalInjected = false;
function init() {
  if (document.getElementById('gemini-glass-container')) return;
  injectUI();
}

// --- UI Construction ---
function injectUI() {
  const container = document.createElement('div');
  container.id = 'gemini-glass-container';
  
  const btn = document.createElement('button');
  btn.id = 'gemini-glass-btn';
  btn.innerHTML = `<span class="gemini-logo">⚡</span> <span>Solve</span>`;
  
  container.appendChild(btn);
  
  const modal = document.createElement('div');
  modal.id = 'gemini-lang-modal';
  modal.className = 'gemini-modal-overlay';
  modal.innerHTML = `
    <div class="gemini-modal-box">
      <div class="modal-title">Select Target Language</div>
      <div class="lang-grid">
        <button class="lang-btn" data-lang="Python 3">Python</button>
        <button class="lang-btn" data-lang="Java">Java</button>
        <button class="lang-btn" data-lang="C++">C++</button>
        <button class="lang-btn" data-lang="JavaScript">JavaScript</button>
      </div>
      <button class="modal-cancel">Cancel</button>
    </div>
  `;

  document.body.appendChild(container);
  document.body.appendChild(modal);

  // --- Event Listeners ---
  let isDragging = false;
  makeDraggable(container, (draggingState) => {
    isDragging = draggingState;
  });
  btn.addEventListener('click', (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    modal.classList.add('active');
  });

  modal.querySelector('.modal-cancel').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', (e) => {
      const lang = e.target.getAttribute('data-lang');
      modal.classList.remove('active');
      triggerGeneration(lang);
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}
function makeDraggable(element, onDragChange) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  let startX = 0, startY = 0;
  
  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    const movedX = Math.abs(e.clientX - startX);
    const movedY = Math.abs(e.clientY - startY);

    if (movedX > 5 || movedY > 5) {
        onDragChange(true); 
    }
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    setTimeout(() => onDragChange(false), 50);
  }
}

function getProblemContext() {
  const descriptionEl = document.querySelector('[data-track-load="description_content"]');
  if (descriptionEl) return descriptionEl.innerText;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) return metaDesc.content;
  return document.body.innerText.substring(0, 3000);
}

function triggerGeneration(language) {
  const context = getProblemContext();
  
  try {
    if (!chrome.runtime?.id) {
      throw new Error("Extension context invalidated");
    }

    // Send message
    chrome.runtime.sendMessage({
      action: "generateSolution",
      context: context,
      language: language
    });
  } catch (error) {
    console.warn("Extension connection lost:", error);
    alert("The extension has been updated. Please refresh the page to use AI Solve.");
    const btnContainer = document.getElementById('gemini-glass-container');
    if (btnContainer) btnContainer.remove();
    const modal = document.getElementById('gemini-lang-modal');
    if (modal) modal.remove();
  }
}

let lastUrl = location.href; 
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(init, 1000);
  }
}).observe(document, {subtree: true, childList: true});

setTimeout(init, 1500);