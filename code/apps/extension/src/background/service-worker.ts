// QuickPlot Extension Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Clear any stale context menus first
  chrome.contextMenus.removeAll(() => {
    try {
      // 1. Text Selection Menu
      chrome.contextMenus.create({
        id: 'quickplot-plot-selection',
        title: 'Plot with QuickPlot: "%s"',
        contexts: ['selection'],
      });

      // 2. Visual Snip Area Menu
      chrome.contextMenus.create({
        id: 'quickplot-snip-area',
        title: 'Snip equation area for QuickPlot',
        contexts: ['page', 'image'],
      });
    } catch (err) {
      console.warn('Context menu creation warning:', err);
    }
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'quickplot-plot-selection' && info.selectionText) {
    // Store selected text so popup can pick it up immediately
    void (async () => {
      let text = info.selectionText!.trim();
      if (tab?.id !== undefined) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION' }, { frameId: info.frameId ?? 0 });
          if (response?.text) text = response.text;
        } catch { /* The browser selection remains available on restricted pages. */ }
      }
      await chrome.storage.local.set({ qp_pending_equation: text });
      tryOpenPopup();
    })();
  } else if (info.menuItemId === 'quickplot-snip-area' && tab?.id) {
    // Send message to start rectangular screen snip overlay
    chrome.tabs.sendMessage(tab.id, { type: 'QP_START_SELECTION' }, () => {
      if (chrome.runtime.lastError) {
        chrome.storage.local.set({
          qp_notice:
            'This page (e.g. chrome:// or restricted viewer) does not allow overlays. You can upload an equation screenshot or image directly in the QuickPlot popup.',
        });
        tryOpenPopup();
      }
    });
  }
});

// Helper to open extension popup programmatically if supported
function tryOpenPopup() {
  if (chrome.action && 'openPopup' in chrome.action) {
    try {
      (chrome.action as { openPopup?: () => Promise<void> }).openPopup?.().catch(() => {
        // Fallback: user opens extension icon manually
      });
    } catch {
      // ignore
    }
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Visual Snip Region Capture
  if (message?.type === 'QP_CAPTURE_REGION' && sender.tab?.windowId) {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: 'png' },
      (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          chrome.storage.local.set({
            qp_notice: 'Could not capture this page region. Try uploading a screenshot file instead.',
          });
          sendResponse?.({ success: false });
          return;
        }

        chrome.storage.local.set(
          {
            qp_captured_crop: dataUrl,
            qp_crop_rect: message.rect,
            qp_crop_dpr: message.dpr || 1,
            qp_captured_time: Date.now(),
          },
          () => {
            sendResponse?.({ success: true });
            tryOpenPopup();
          }
        );
      }
    );
    return true; // Keep message channel open for async response
  }

  // Request to launch snip tool from popup
  if (message?.type === 'LAUNCH_SNIP_TOOL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse?.({ success: false, error: 'No active tab found' });
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: 'QP_START_SELECTION' }, () => {
        if (chrome.runtime.lastError) {
          sendResponse?.({
            success: false,
            error:
              'Cannot snip this page (restricted chrome:// or extension page). Upload a screenshot instead!',
          });
        } else {
          sendResponse?.({ success: true });
        }
      });
    });
    return true;
  }

  return true;
});
