chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quickplot-select-equation",
    title: "Select equation area for QuickPlot",
    contexts: ["page", "image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "quickplot-select-equation" || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "QP_START_SELECTION" }, () => {
    if (chrome.runtime.lastError) {
      chrome.storage.local.set({
        qpNotice: "This page does not allow the selection overlay. Take a screenshot/crop of the equation and upload it in the extension popup."
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "QP_CAPTURE_REGION" || !sender.tab?.windowId) return;
  chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError || !dataUrl) {
      chrome.storage.local.set({ qpNotice: "Could not capture this tab. Try uploading a screenshot/crop instead." });
      return;
    }
    chrome.storage.local.set({
      qpCapturedScreenshot: dataUrl,
      qpCapturedRect: message.rect,
      qpCapturedDpr: message.dpr || 1
    });
  });
});