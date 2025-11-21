let tabStates = {}; 

//Panel Visibility Logic
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) updateSidePanelState(tabId, changeInfo.url);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) updateSidePanelState(activeInfo.tabId, tab.url);
});

async function updateSidePanelState(tabId, urlStr) {
  try {
    if (!urlStr) return;
    const url = new URL(urlStr);
    const isLeetCode = url.origin === 'https://leetcode.com' && url.pathname.includes('/problems/');
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: isLeetCode
    });
  } catch (e) { console.error(e); }
}

//Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateSolution") {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      handleGeneration(request, tabId);
    }
  }
  if (request.action === "panelReady") {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && tabStates[tabId]) {
      sendResponse(tabStates[tabId]);
    } else {
      sendResponse({ status: "idle" });
    }
  }
  return true;
});
//AI Logic
async function handleGeneration(request, tabId) {
  try {
    tabStates[tabId] = { status: "loading", language: request.language };
    await chrome.sidePanel.open({ tabId: tabId });
    chrome.runtime.sendMessage({ action: "streamStatus", status: "loading", language: request.language, tabId });

    //API Logic
    const result = await chrome.storage.local.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;
    if (!apiKey) throw new Error("API Key missing. Check extension settings.");

    const modelName = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemPrompt = `
      You are a competitive programming expert.
      Task: Solve the LeetCode problem below in ${request.language}.

      Constraints:
      1. **Output Format**: Return ONLY valid JSON.
      2. **JSON Structure**: { "code": "YOUR_CODE_HERE" }
      3. **Code Style**: 
         - DO NOT write comments.
         - DO NOT include complexity analysis.
         - DO NOT include explanations.
         - Just raw, compilable code.
      
      Problem Context:
      ${request.context}
    `;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    let generatedText = data.candidates[0].content.parts[0].text;
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedContent = JSON.parse(generatedText);
    const successState = {
      status: "success",
      data: parsedContent,
      language: request.language,
      tabId
    };
    tabStates[tabId] = successState;
    chrome.runtime.sendMessage({ action: "streamStatus", ...successState });

  } catch (err) {
    const errorState = {
      status: "error",
      error: err.message || "An unknown error occurred.",
      tabId
    };
    tabStates[tabId] = errorState;
    chrome.runtime.sendMessage({ action: "streamStatus", ...errorState });
  }
}