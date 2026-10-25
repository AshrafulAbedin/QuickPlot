import { extractSelectedEquation, equationFromElement } from './equationExtraction';
// QuickPlot Content Script - Equation Text Selection & Interactive Screen Region Snip Tool

(() => {
  // Prevent multiple injections
  if ((window as unknown as { __quickPlotInjected?: boolean }).__quickPlotInjected) {
    return;
  }
  (window as unknown as { __quickPlotInjected?: boolean }).__quickPlotInjected = true;

  // ── 1. Smart Equation Text & Image Alt Extraction ──────────────────────
  // ── 2. Interactive Equation Area Snip Tool ─────────────────────────────
  let overlayEl: HTMLDivElement | null = null;
  let boxEl: HTMLDivElement | null = null;
  let dimBadgeEl: HTMLDivElement | null = null;
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function cleanupSnipOverlay() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
      boxEl = null;
      dimBadgeEl = null;
    }
    isDragging = false;
    window.removeEventListener('keydown', onKeyDown, true);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanupSnipOverlay();
    }
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    if (boxEl) {
      Object.assign(boxEl.style, {
        display: 'block',
        left: `${startX}px`,
        top: `${startY}px`,
        width: '0px',
        height: '0px',
      });
    }
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging || !boxEl) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    Object.assign(boxEl.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    if (dimBadgeEl) {
      dimBadgeEl.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!isDragging) return;
    isDragging = false;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const rect = {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };

    cleanupSnipOverlay();

    // Ignore tiny accidental clicks (< 10px)
    if (rect.width < 10 || rect.height < 10) return;

    // Send capture region to background service worker
    requestAnimationFrame(() => requestAnimationFrame(() => {
      void chrome.runtime.sendMessage({
        type: 'QP_CAPTURE_REGION', rect, dpr: window.devicePixelRatio || 1,
      }).catch(() => { /* Extension may have been reloaded. */ });
    }));
  }

  function startSnipTool() {
    cleanupSnipOverlay();

    // Main overlay backdrop
    const overlay = document.createElement('div');
    overlay.id = 'quickplot-snip-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      cursor: 'crosshair',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(1px)',
      userSelect: 'none',
    });

    // Instruction pill HUD
    const hud = document.createElement('div');
    Object.assign(hud.style, {
      position: 'fixed',
      top: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 18px',
      borderRadius: '9999px',
      backgroundColor: '#161412',
      border: '1px solid rgba(245, 158, 11, 0.5)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: '#f5f5f4',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      pointerEvents: 'none',
      letterSpacing: '0.02em',
    });

    hud.innerHTML = `
      <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:4px; background:rgba(245,158,11,0.15); color:#fbbf24; font-weight:700; font-size:10px; font-family:monospace; border:1px solid rgba(245,158,11,0.3);">QP</span>
      <span>Select equation area</span>
      <span style="font-size:11px; opacity:0.6; padding-left:8px; border-left:1px solid #44403c;">Esc to cancel</span>
    `;
    overlay.appendChild(hud);

    // Draggable selection box
    const box = document.createElement('div');
    Object.assign(box.style, {
      position: 'fixed',
      border: '2px solid #f59e0b',
      boxShadow: '0 0 16px rgba(245, 158, 11, 0.4), inset 0 0 12px rgba(245, 158, 11, 0.08)',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      display: 'none',
      pointerEvents: 'none',
      borderRadius: '2px',
    });

    // Size badge
    const badge = document.createElement('div');
    Object.assign(badge.style, {
      position: 'absolute',
      right: '4px',
      bottom: '-22px',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: '#1c1917',
      border: '1px solid #78716c',
      color: '#fef3c7',
      fontFamily: 'monospace',
      fontSize: '10px',
      whiteSpace: 'nowrap',
    });
    box.appendChild(badge);
    overlay.appendChild(box);

    overlayEl = overlay;
    boxEl = box;
    dimBadgeEl = badge;

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);

    document.documentElement.appendChild(overlay);
  }

  let contextEquation = '';

  // ── 3. Runtime Message Listeners ────────────────────────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.type === 'QP_START_SELECTION' || request?.action === 'START_SNIP') {
      startSnipTool();
      sendResponse?.({ status: 'started' });
    } else if (request?.action === 'GET_SELECTION') {
      const selection = extractSelectedEquation() || contextEquation;
      sendResponse?.({ text: selection });
    }
    return true;
  });

  // Track selection changes on page
  document.addEventListener('selectionchange', () => {
    const selected = extractSelectedEquation();
    if (selected && selected.length > 0 && selected.length < 10000) {
      try {
        chrome.storage?.local?.set({ qp_last_selection: selected });
      } catch {
        // extension context might be invalidated
      }
    }
  });

  // Right-click on images/math elements
  document.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    let alt: string | null = equationFromElement(target);
    if (!alt && target.tagName.toLowerCase() === 'img') {
      alt = target.getAttribute('alt');
    } else if (!alt) {
      const img = target.querySelector('img[alt]') || target.closest('tr, td')?.querySelector('img[alt]');
      alt = img?.getAttribute('alt') || null;
    }
    contextEquation = alt?.trim() || '';
    if (alt && alt.trim().length > 1) {
      try {
        chrome.storage?.local?.set({ qp_last_selection: alt.trim() });
      } catch {
        // ignore
      }
    }
  });
})();
