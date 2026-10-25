(() => {
  if (window.__quickPlotOcrInjected) return;
  window.__quickPlotOcrInjected = true;

  let overlay, box, startX = 0, startY = 0, dragging = false;

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "QP_START_SELECTION") startSelection();
  });

  function startSelection() {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", zIndex: "2147483647",
      cursor: "crosshair", background: "rgba(20, 30, 50, 0.10)"
    });
    const hint = document.createElement("div");
    hint.textContent = "Drag around the equation · Esc to cancel";
    Object.assign(hint.style, {
      position: "fixed", top: "12px", left: "50%", transform: "translateX(-50%)",
      padding: "9px 14px", borderRadius: "8px", background: "#172033",
      color: "white", font: "14px sans-serif", boxShadow: "0 3px 12px #0005"
    });
    overlay.appendChild(hint);
    box = document.createElement("div");
    Object.assign(box.style, {
      position: "fixed", border: "2px solid #2563eb",
      background: "rgba(37,99,235,.12)", display: "none"
    });
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);

    overlay.addEventListener("mousedown", onDown);
    overlay.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseup", onUp);
    window.addEventListener("keydown", onKey, true);
  }

  function onDown(e) {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    Object.assign(box.style, { display: "block", left: `${startX}px`, top: `${startY}px`, width: "0", height: "0" });
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const left = Math.min(startX, e.clientX), top = Math.min(startY, e.clientY);
    Object.assign(box.style, {
      left: `${left}px`, top: `${top}px`,
      width: `${Math.abs(e.clientX - startX)}px`,
      height: `${Math.abs(e.clientY - startY)}px`
    });
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    const rect = {
      x: Math.min(startX, e.clientX), y: Math.min(startY, e.clientY),
      width: Math.abs(e.clientX - startX), height: Math.abs(e.clientY - startY)
    };
    cleanup();
    if (rect.width < 8 || rect.height < 8) return;
    chrome.runtime.sendMessage({ type: "QP_CAPTURE_REGION", rect, dpr: window.devicePixelRatio || 1 });
  }
  function onKey(e) { if (e.key === "Escape") cleanup(); }
  function cleanup() {
    overlay?.remove(); overlay = null; box = null;
    window.removeEventListener("keydown", onKey, true);
  }
})();