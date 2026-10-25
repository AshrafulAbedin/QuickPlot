const imageInput = document.getElementById("image");
const equation = document.getElementById("equation");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("preview");
let currentImage = null;

function status(message) { statusEl.textContent = message; }

document.getElementById("select").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "QP_START_SELECTION" }, () => {
    if (chrome.runtime.lastError) {
      status("Selection isn't supported on this page (including Chrome's built-in PDF viewer). Upload a screenshot/crop instead.");
    } else {
      status("Drag around the equation on the page, then reopen this popup.");
    }
  });
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    canvas.hidden = false;
    currentImage = canvas;
    status(`Image loaded (${img.naturalWidth} × ${img.naturalHeight}). Click Run local OCR.`);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => status("Could not load this image.");
  img.src = url;
});

document.getElementById("recognize").addEventListener("click", async () => {
  if (!currentImage) { status("Select an area on a supported webpage or upload an image first."); return; }
  if (!window.Tesseract) { status("OCR library did not load. Check internet once, then reopen the popup."); return; }
  try {
    status("Running OCR locally…");
    const result = await Tesseract.recognize(currentImage, "eng", {
      logger: m => { if (m.status) status(`${m.status}${m.progress ? ` (${Math.round(m.progress * 100)}%)` : ""}`); }
    });
    equation.value = (result.data.text || "").trim();
    status("OCR complete. Check/correct the equation before opening QuickPlot.");
  } catch (err) {
    status(`OCR failed: ${err?.message || err}`);
  }
});

document.getElementById("open").addEventListener("click", async () => {
  const expr = equation.value.trim();
  if (!expr) { status("Enter or recognize an equation first."); return; }
  // Replace this URL with your actual QuickPlot app URL / existing extension handoff.
  const quickPlotUrl = `http://localhost:5173/?expression=${encodeURIComponent(expr)}`;
  await chrome.tabs.create({ url: quickPlotUrl });
  status("Opened QuickPlot URL. Update the URL in popup.js to match your app.");
});

async function loadCapturedRegion() {
  const saved = await chrome.storage.local.get(["qpCapturedScreenshot", "qpCapturedRect", "qpCapturedDpr", "qpNotice"]);
  if (saved.qpNotice) {
    status(saved.qpNotice);
    chrome.storage.local.remove("qpNotice");
  }
  if (!saved.qpCapturedScreenshot || !saved.qpCapturedRect) return;
  const img = new Image();
  img.onload = () => {
    const rect = saved.qpCapturedRect;
    const dpr = saved.qpCapturedDpr || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.getContext("2d").drawImage(
      img,
      Math.round(rect.x * dpr), Math.round(rect.y * dpr),
      canvas.width, canvas.height,
      0, 0, canvas.width, canvas.height
    );
    canvas.hidden = false;
    currentImage = canvas;
    status("Captured equation region loaded. Click Run local OCR.");
    chrome.storage.local.remove(["qpCapturedScreenshot", "qpCapturedRect", "qpCapturedDpr"]);
  };
  img.src = saved.qpCapturedScreenshot;
}
loadCapturedRegion();