import React, { useState, useEffect, useRef } from 'react';
import {
  validateAndParseEquation,
  cleanRawInput,
  type ValidEquationResult,
} from './equationValidator';
import { GraphModal } from './GraphModal';
import { recognizeEquationImage, type OcrProgress } from './ocrService';

// ── Minimalist SVG Icons (No Emojis) ─────────────────────────────────────────

function CloseIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChartIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function ScanIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" x2="17" y1="12" y2="12" />
    </svg>
  );
}

function ClipboardIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CopyIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function UploadIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

function ImageIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} stroke-current fill-none`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}


export function PopupApp() {
  // Theme state: 'B' = Obsidian Dark (with Champagne drawer), 'A' = Champagne Silk (with Obsidian drawer)
  const [theme, setTheme] = useState<'A' | 'B'>('B');
  const [activeTab, setActiveTab] = useState<'equation' | 'ocr'>('equation');
  const [equationText, setEquationText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGraph, setActiveGraph] = useState<ValidEquationResult | null>(null);
  const [detectedFromPage, setDetectedFromPage] = useState(false);
  const [detectedSource, setDetectedSource] = useState<'selection' | 'ocr' | 'clipboard' | null>(null);
  const [copied, setCopied] = useState(false);

  // OCR & Image state
  const [hasImage, setHasImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load saved theme preference if available
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('qp_ext_theme');
      if (savedTheme === 'A' || savedTheme === 'B') {
        setTheme(savedTheme);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleTheme = (t: 'A' | 'B') => {
    setTheme(t);
    try {
      localStorage.setItem('qp_ext_theme', t);
    } catch {
      // ignore
    }
  };

  // ── 1. Load captured region / text on mount ────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initializeExtension() {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        // Fallback for standalone dev server
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q') || params.get('expression');
        if (q && isMounted) {
          setEquationText(cleanRawInput(q));
          setDetectedFromPage(true);
          setDetectedSource('selection');
        }
        return;
      }

      chrome.storage.local.get(
        [
          'qp_captured_crop',
          'qp_crop_rect',
          'qp_crop_dpr',
          'qp_pending_equation',
          'qp_last_selection',
          'qp_notice',
        ],
        (saved) => {
          if (!isMounted) return;

          if (saved.qp_notice) {
            setNotice(saved.qp_notice);
            chrome.storage.local.remove('qp_notice');
          }

          // Case A: A cropped region was captured via screen snip
          if (saved.qp_captured_crop && saved.qp_crop_rect) {
            const img = new Image();
            img.onload = () => {
              if (!isMounted) return;
              const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
              if (canvas) {
                const rect = saved.qp_crop_rect;
                const dpr = saved.qp_crop_dpr || 1;
                const sw = Math.max(1, Math.round(rect.width * dpr));
                const sh = Math.max(1, Math.round(rect.height * dpr));
                const sx = Math.round(rect.x * dpr);
                const sy = Math.round(rect.y * dpr);

                canvas.width = sw;
                canvas.height = sh;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                  setHasImage(true);
                  setImageDimensions({ width: sw, height: sh });
                  setActiveTab('ocr');
                  setNotice('Snipped equation loaded. Ready for OCR.');
                }
              }
              chrome.storage.local.remove(['qp_captured_crop', 'qp_crop_rect', 'qp_crop_dpr']);
            };
            img.src = saved.qp_captured_crop;
            return;
          }

          // Case B: Pending context-menu text selection
          const pendingText = saved.qp_pending_equation;
          if (pendingText && !equationText) {
            setEquationText(cleanRawInput(pendingText));
            setDetectedFromPage(true);
            setDetectedSource('selection');
            chrome.storage.local.remove('qp_pending_equation');
            return;
          }

          // Case C: Check active tab selection directly via scripting
          if (chrome.tabs && chrome.scripting) {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
              const tab = tabs[0];
              if (!tab?.id || !isMounted) return;

              try {
                let response;
                try {
                  response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION' });
                } catch {
                  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
                  response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION' });
                }
                const text = response?.text;
                if (isMounted && text && text.length > 0) {
                  setEquationText(cleanRawInput(text));
                  setDetectedFromPage(true);
                  setDetectedSource('selection');
                }
              } catch {
                // restricted page
              }
            });
          }
        }
      );
    }

    void initializeExtension();

    // ── 2. Keyboard Paste Event Listener ──────────────────────────────────
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      // 1. Check for image item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            loadBlobToCanvas(blob);
            setNotice('Image pasted from clipboard. Ready for OCR.');
            setActiveTab('ocr');
            e.preventDefault();
            return;
          }
        }
      }

      // 2. If user is not currently focusing an input field, paste text into equation
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (!isInputFocused) {
        let text = e.clipboardData?.getData('text/plain') || '';
        const html = e.clipboardData?.getData('text/html');
        if (html && (html.includes('<sup') || html.includes('<msup'))) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            doc.querySelectorAll('sup').forEach(el => el.replaceWith(`^(${el.textContent})`));
            doc.querySelectorAll('sub').forEach(el => el.replaceWith(`_(${el.textContent})`));
            const extracted = doc.body.textContent?.trim();
            if (extracted) text = extracted;
          } catch {
            // fallback
          }
        }
        if (text && text.trim()) {
          const cleaned = cleanRawInput(text.trim());
          setEquationText(cleaned);
          setDetectedFromPage(true);
          setDetectedSource('clipboard');
          setActiveTab('equation');
          setNotice('Equation pasted from clipboard.');
          if (errorMessage) setErrorMessage(null);
          e.preventDefault();
        }
      }
    }

    window.addEventListener('paste', handlePaste);

    return () => {
      isMounted = false;
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Helper to load image blob into canvas
  const loadBlobToCanvas = (file: Blob) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setHasImage(true);
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setOcrError(null);
        }
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setOcrError('Failed to decode image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ── Dedicated Paste from Clipboard Action ─────────────────────────────
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            const imageType = item.types.find((t) => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              loadBlobToCanvas(blob);
              setActiveTab('ocr');
              setNotice('Image pasted from clipboard. Ready for OCR.');
              return;
            }
            if (item.types.includes('text/html')) {
              try {
                const blob = await item.getType('text/html');
                const html = await blob.text();
                if (html && (html.includes('<sup') || html.includes('<msup'))) {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, 'text/html');
                  doc.querySelectorAll('sup').forEach(el => el.replaceWith(`^(${el.textContent})`));
                  doc.querySelectorAll('sub').forEach(el => el.replaceWith(`_(${el.textContent})`));
                  const extracted = doc.body.textContent?.trim();
                  if (extracted) {
                    const cleaned = cleanRawInput(extracted);
                    setEquationText(cleaned);
                    setDetectedFromPage(true);
                    setDetectedSource('clipboard');
                    setActiveTab('equation');
                    setNotice('Equation pasted from clipboard.');
                    if (errorMessage) setErrorMessage(null);
                    return;
                  }
                }
              } catch {
                // fallback
              }
            }
          }
        } catch {
          // Fallback to text reading
        }
      }

      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const cleaned = cleanRawInput(text.trim());
          setEquationText(cleaned);
          setDetectedFromPage(true);
          setDetectedSource('clipboard');
          setActiveTab('equation');
          setNotice('Equation text pasted from clipboard.');
          if (errorMessage) setErrorMessage(null);
          return;
        }
      }

      setNotice('Clipboard is empty. Use Ctrl+V or copy an image/text first.');
    } catch {
      setNotice('Clipboard permission unavailable. Press Ctrl+V directly.');
    }
  };

  // ── Copy Equation to Clipboard ────────────────────────────────────────
  const handleCopyEquation = () => {
    const raw = equationText.trim();
    if (!raw) return;
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ── Drag & Drop Handlers ──────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadBlobToCanvas(file);
      setNotice('Image loaded via drop. Ready for OCR.');
    }
  };

  // ── Trigger Snip Tool on Current Webpage ───────────────────────────────
  const handleTriggerSnip = async () => {
    setNotice(null);
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      setNotice('Snip tool requires Chrome extension environment.');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setNotice('No active tab found.');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'QP_START_SELECTION' }, () => {
      if (chrome.runtime.lastError) {
        setNotice(
          'Cannot snip this page. Take a screenshot (Win+Shift+S) and paste (Ctrl+V) or upload below.'
        );
      } else {
        window.close();
      }
    });
  };

  // ── File upload change handler ─────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadBlobToCanvas(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Run Local In-Browser OCR ───────────────────────────────────────────
  const handleRunOcr = async () => {
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
    if (!canvas || !hasImage) {
      setOcrError('Please snip, upload, or paste an equation image first.');
      return;
    }

    setOcrLoading(true);
    setOcrError(null);
    setOcrProgress({ status: 'Starting local OCR engine...', progress: 0.05 });

    try {
      const extractedText = await recognizeEquationImage(canvas, (progress) => {
        setOcrProgress(progress);
      });

      if (!extractedText) {
        setOcrError('No mathematical characters were recognized in this image.');
      } else {
        setEquationText(extractedText);
        setDetectedSource('ocr');
        setDetectedFromPage(true);
        setActiveTab('equation');
        setNotice('Equation extracted from image. Review and plot below.');
        if (errorMessage) setErrorMessage(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setOcrError(msg);
    } finally {
      setOcrLoading(false);
      setOcrProgress(null);
    }
  };

  // ── Clear Loaded Image ────────────────────────────────────────────────
  const handleClearImage = () => {
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
    setHasImage(false);
    setImageDimensions(null);
    setOcrError(null);
  };

  // ── Plot Equation Handler ─────────────────────────────────────────────
  const handlePlot = () => {
    const raw = equationText.trim();
    if (!raw) {
      setErrorMessage('Please enter, paste, or snip an equation to plot.');
      return;
    }

    const result = validateAndParseEquation(raw);
    if (!result.isValid) {
      setErrorMessage(result.error);
      setActiveGraph(null);
    } else {
      setErrorMessage(null);
      setActiveGraph(result);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePlot();
    }
  };

  // Quick handoff to 2D app
  const handleOpenQuickPlot2D = () => {
    const raw = equationText.trim();
    const result = raw ? validateAndParseEquation(raw) : null;
    const cleanExpr = result?.isValid ? result.cleanedExpr : raw;
    const domain = result?.isValid ? result.type : 'cartesian';

    const payload = {
      eqs: [{ e: cleanExpr, t: domain, d: domain, c: '#4A9EE0', v: true }],
    };
    const hash = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `http://localhost:5174/2d/#${hash}`;

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  // ── Theme Style Definitions Matching Reference Design ──────────────────
  const isThemeA = theme === 'A';

  // Overall outer background (warm gallery backdrop)
  const outerBg = isThemeA ? 'bg-[#f4ebe1]' : 'bg-[#141210]';

  // Main Card Styles
  const cardBgStyle = isThemeA
    ? {
        background: 'linear-gradient(155deg, #f3e6d2 0%, #ecd6b8 50%, #d8bd94 100%)',
        boxShadow: '0 24px 48px -12px rgba(90, 60, 20, 0.25), 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      }
    : {
        background: 'linear-gradient(160deg, #282522 0%, #1e1b19 55%, #151312 100%)',
        boxShadow: '0 28px 56px -16px rgba(0, 0, 0, 0.8), 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      };

  // Typography colors
  const textHeading = isThemeA ? 'text-[#2a241c]' : 'text-[#f2ebe2]';
  const textSub = isThemeA ? 'text-[#6b5f4f]' : 'text-[#9c9182]';
  const textMuted = isThemeA ? 'text-[#877967]' : 'text-[#706659]';

  // Input styles
  const inputBgClass = isThemeA
    ? 'bg-[#f8f1e6]/90 text-[#221c16] placeholder:text-[#a0907a] border-[#cbb391] focus:border-[#8c6b3e] focus:ring-1 focus:ring-[#8c6b3e]/30'
    : 'bg-[#151311]/90 text-[#e8d5be] placeholder:text-[#5a5247] border-[#38332c] focus:border-[#d9bc94] focus:ring-1 focus:ring-[#d9bc94]/30';


  // Bottom Peeking Action Tray Button (Matching reference bottom drawer)
  const drawerBtnStyle = isThemeA
    ? {
        background: 'linear-gradient(180deg, #1f1b17 0%, #161311 100%)',
        color: '#ecd6b8',
        boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }
    : {
        background: 'linear-gradient(140deg, #ecd6b8 0%, #d8bc94 60%, #c49f6e 100%)',
        color: '#1a1612',
        boxShadow: '0 16px 32px -8px rgba(216, 188, 148, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      };

  return (
    <div className={`w-[390px] ${outerBg} p-4 flex flex-col items-stretch font-sans select-none antialiased transition-colors duration-300`}>
      {/* ── Main Floating Card ────────────────────────────────────────── */}
      <div
        style={cardBgStyle}
        className="rounded-[28px] border border-white/20 px-5 pt-5 pb-4 flex flex-col relative z-10 overflow-hidden backdrop-blur-md transition-all duration-300 shadow-xl"
      >
        {/* Hidden Canvas for OCR processing */}
        <canvas ref={canvasRef} className="hidden" />

        <div>
          {/* ── Top Header Row with Embossed Icon & Theme Switcher ──────── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Embossed Icon Badge (matches reference top-left box) */}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-pixel text-xs font-bold transition-all shadow-md ${
                  isThemeA
                    ? 'bg-gradient-to-b from-[#2a241e] to-[#1a1613] text-[#ebd5b6] shadow-black/20 border border-white/10'
                    : 'bg-gradient-to-b from-[#38332c] to-[#1e1b18] text-[#e8d5be] shadow-black/40 border border-white/10'
                }`}
              >
                QP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-sm font-semibold tracking-tight ${textHeading}`}>
                    QuickPlot
                  </h1>
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                      isThemeA
                        ? 'bg-[#26221c] text-[#ecd8be]'
                        : 'bg-[#ecd8be] text-[#1c1916]'
                    }`}
                  >
                    Studio
                  </span>
                </div>
                <p className={`text-[11px] leading-tight ${textSub}`}>
                  Instant OCR & Math Grapher
                </p>
              </div>
            </div>

            {/* Theme Toggle Pill (A: Champagne, B: Obsidian) */}
            <div
              className={`flex items-center p-0.5 rounded-full border transition-all ${
                isThemeA
                  ? 'bg-[#dec5a1]/60 border-[#c4a982]'
                  : 'bg-[#151311] border-[#38332c]'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleTheme('A')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  isThemeA
                    ? 'bg-[#241f19] text-[#ecd8be] shadow-sm'
                    : 'text-[#8c8172] hover:text-[#e8d5be]'
                }`}
                title="Style A: Champagne Silk"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleToggleTheme('B')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  !isThemeA
                    ? 'bg-[#ecd8be] text-[#1b1714] shadow-sm'
                    : 'text-[#6b5f4f] hover:text-[#2a241c]'
                }`}
                title="Style B: Obsidian Luxury"
              >
                B
              </button>
            </div>
          </div>

          {/* ── Tab Switcher Pill ───────────────────────────────────────── */}
          <div
            className={`p-1 rounded-xl flex gap-1 mb-4 border transition-all ${
              isThemeA
                ? 'bg-[#dfc7a3]/40 border-[#cbb38f]'
                : 'bg-[#161412] border-[#2f2b25]'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('equation')}
              className={`flex-1 py-1.5 rounded-lg text-center font-mono text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'equation'
                  ? isThemeA
                    ? 'bg-[#26211a] text-[#ecd8be] shadow-sm font-semibold'
                    : 'bg-[#ecd8be] text-[#1a1714] shadow-sm font-semibold'
                  : isThemeA
                  ? 'text-[#5f5446] hover:text-[#221c16]'
                  : 'text-[#8e8374] hover:text-[#f2ebe2]'
              }`}
            >
              <ChartIcon className="w-3.5 h-3.5" />
              <span>Equation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 py-1.5 rounded-lg text-center font-mono text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ocr'
                  ? isThemeA
                    ? 'bg-[#26211a] text-[#ecd8be] shadow-sm font-semibold'
                    : 'bg-[#ecd8be] text-[#1a1714] shadow-sm font-semibold'
                  : isThemeA
                  ? 'text-[#5f5446] hover:text-[#221c16]'
                  : 'text-[#8e8374] hover:text-[#f2ebe2]'
              }`}
            >
              <ScanIcon className="w-3.5 h-3.5" />
              <span>Visual OCR</span>
              {hasImage && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isThemeA ? 'bg-[#26211a]' : 'bg-[#1a1714]'
                  }`}
                />
              )}
            </button>
          </div>

          {/* ── Quick Utility Bar: Dedicated Paste Clipboard Action ─────────── */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className={`w-full py-2 px-3.5 rounded-xl border text-[11px] font-mono font-medium transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-sm ${
                isThemeA
                  ? 'bg-[#f7efe3] hover:bg-[#fff9f0] border-[#cbb391] text-[#2c251e]'
                  : 'bg-[#221e1b] hover:bg-[#2c2723] border-[#38332c] text-[#ded2c3]'
              }`}
              title="Paste image or formula text from clipboard (Ctrl+V)"
            >
              <ClipboardIcon className="w-3.5 h-3.5" />
              <span>Paste Clipboard</span>
            </button>
          </div>

          {/* ── Notice Banner ─────────────────────────────────────────── */}
          {notice && (
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-mono mb-4 flex items-start justify-between gap-2 transition-all ${
                isThemeA
                  ? 'bg-[#fbf4ea] border-[#cbb391] text-[#3d3326]'
                  : 'bg-[#181614] border-[#38332c] text-[#e8d5be]'
              }`}
            >
              <div className="flex-1 leading-snug flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isThemeA ? 'bg-[#3d3326]' : 'bg-[#e8d5be]'
                  }`}
                />
                <span>{notice}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className={`p-1 rounded-full border transition-all cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 shrink-0 ${
                  isThemeA
                    ? 'border-[#cbb391] bg-[#f0e4d2] text-[#5a4c3a] hover:text-[#1a1612]'
                    : 'border-[#443d34] bg-[#221e1a] text-[#a49684] hover:text-[#ecd8be]'
                }`}
                title="Dismiss notice"
                aria-label="Dismiss notice"
              >
                <CloseIcon className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          {/* ── TAB 1: Equation & Plot ────────────────────────────────── */}
          {activeTab === 'equation' && (
            <div className="space-y-3">
              {/* Equation Input Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <label className={`text-[10px] font-mono tracking-wider font-semibold uppercase ${textSub}`}>
                    Equation / Formula
                  </label>
                  {equationText && (
                    <button
                      type="button"
                      onClick={handleCopyEquation}
                      className={`text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                        isThemeA ? 'text-[#5a4e3e] hover:text-[#1e1914]' : 'text-[#a39786] hover:text-[#ecd8be]'
                      }`}
                      title="Copy formula"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={equationText}
                    onChange={(e) => {
                      setEquationText(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onPaste={(e) => {
                      const plain = e.clipboardData?.getData('text/plain') || '';
                      const html = e.clipboardData?.getData('text/html');
                      let text = plain;
                      if (html && (html.includes('<sup') || html.includes('<msup'))) {
                        try {
                          const parser = new DOMParser();
                          const doc = parser.parseFromString(html, 'text/html');
                          doc.querySelectorAll('sup').forEach(el => el.replaceWith(`^(${el.textContent})`));
                          doc.querySelectorAll('sub').forEach(el => el.replaceWith(`_(${el.textContent})`));
                          const extracted = doc.body.textContent?.trim();
                          if (extracted) text = extracted;
                        } catch {
                          // fallback
                        }
                      }
                      if (text) {
                        e.preventDefault();
                        const cleaned = cleanRawInput(text.trim());
                        setEquationText(cleaned);
                        if (errorMessage) setErrorMessage(null);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. 3x^2 + 14x + 8 = 0"
                    autoFocus
                    className={`w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all shadow-inner pr-8 ${inputBgClass}`}
                  />
                  {equationText && (
                    <button
                      type="button"
                      onClick={() => {
                        setEquationText('');
                        setErrorMessage(null);
                      }}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90 ${
                        isThemeA
                          ? 'border-[#cbb391] bg-[#f0e4d2] text-[#5a4c3a] hover:text-[#1a1612]'
                          : 'border-[#443d34] bg-[#221e1a] text-[#a49684] hover:text-[#ecd8be]'
                      }`}
                      title="Clear equation"
                      aria-label="Clear equation"
                    >
                      <CloseIcon className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Live Validated Equation Preview & Solutions Badge */}
              {(() => {
                if (!equationText.trim() || errorMessage) return null;
                const parsed = validateAndParseEquation(equationText.trim());
                if (!parsed.isValid) return null;
                return (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-mono space-y-1.5 animate-in fade-in ${
                      isThemeA
                        ? 'bg-[#f7eedf] border-[#cbb391] text-[#2c241c]'
                        : 'bg-[#1e1b18] border-[#38332c] text-[#ecd8be]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize flex items-center gap-1.5">
                        <CheckIcon className="w-3 h-3 text-emerald-600" />
                        <span>{parsed.type} Equation Recognized</span>
                      </span>
                      <span className={`text-[10px] opacity-75 font-mono ${textSub}`}>
                        {parsed.cleanedExpr !== equationText.trim() ? 'auto-formatted' : 'ready to plot'}
                      </span>
                    </div>
                    {parsed.solutions && parsed.solutions.length > 0 && (
                      <div className="pt-1 border-t border-current/10 flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[10px] tracking-wide uppercase opacity-75">
                          Solutions / Roots:
                        </span>
                        {parsed.solutions.map((sol, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-md border font-bold text-[10px] ${
                              isThemeA
                                ? 'bg-[#efe3cf] border-[#c4a984] text-[#1e1812]'
                                : 'bg-[#292520] border-[#4b4337] text-[#f7e8d4]'
                            }`}
                          >
                            {sol}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Error Message Box */}
              {errorMessage && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 animate-in fade-in ${
                    isThemeA
                      ? 'bg-[#fdf0ee] border-[#e2a89f] text-[#8e2d24]'
                      : 'bg-[#2b1717] border-[#6b2c2c] text-[#f49b9b]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[11px] leading-tight">Invalid Equation</p>
                      <p className="text-[10px] opacity-90 mt-0.5 leading-snug">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── TAB 2: Visual Snip & OCR ──────────────────────────────── */}
          {activeTab === 'ocr' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`space-y-3 rounded-2xl p-3 border transition-colors ${
                isDraggingOver
                  ? isThemeA
                    ? 'border-[#2a241e] bg-[#edd9be]/50'
                    : 'border-[#ecd8be] bg-[#221e1a]'
                  : isThemeA
                  ? 'border-[#cbb391]/60 bg-[#f7efe3]/40'
                  : 'border-[#38332c]/60 bg-[#161412]/40'
              }`}
            >
              {/* Secondary Upload Row */}
              <label
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                  isThemeA
                    ? 'bg-[#f8f1e6] hover:bg-white border-[#cbb391] text-[#2c251e]'
                    : 'bg-[#1d1a17] hover:bg-[#26221e] border-[#38332c] text-[#d6c7b6]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="flex items-center gap-2">
                  <UploadIcon className="w-3.5 h-3.5 opacity-70" />
                  <span>Upload screenshot file</span>
                </span>
                <span className="text-[10px] font-semibold opacity-60">Browse</span>
              </label>

              {/* Image Preview Canvas Display */}
              {hasImage && imageDimensions ? (
                <div
                  className={`rounded-xl border p-2 space-y-2 ${
                    isThemeA ? 'border-[#cbb391] bg-[#fbf5eb]' : 'border-[#38332c] bg-[#12100e]'
                  }`}
                >
                  <div className={`flex items-center justify-between text-[10px] font-mono ${textSub}`}>
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Loaded ({imageDimensions.width} × {imageDimensions.height} px)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90 ${
                        isThemeA
                          ? 'border-[#cbb391] bg-[#f0e4d2] hover:bg-[#e4d4bd] text-[#5a4c3a] hover:text-[#1a1612]'
                          : 'border-[#443d34] bg-[#221e1a] hover:bg-[#2e2923] text-[#a49684] hover:text-[#ecd8be]'
                      }`}
                      title="Remove loaded image"
                      aria-label="Remove image"
                    >
                      <CloseIcon className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <div
                    className={`w-full max-h-[120px] overflow-hidden rounded-lg border flex items-center justify-center p-1 ${
                      isThemeA ? 'border-[#dfccb4] bg-white' : 'border-[#26221e] bg-[#1a1715]'
                    }`}
                  >
                    <ImageCanvasPreview sourceCanvas={canvasRef.current} />
                  </div>
                </div>
              ) : (
                <div
                  className={`py-5 px-3 rounded-xl border-2 border-dashed text-center space-y-1.5 transition-colors ${
                    isDraggingOver
                      ? isThemeA
                        ? 'border-[#2a241e] bg-[#ebd6b8]'
                        : 'border-[#ecd8be] bg-[#221e1a]'
                      : isThemeA
                      ? 'border-[#d0b898] text-[#7d6f5c]'
                      : 'border-[#3a352c] text-[#7d7365]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto border ${
                      isThemeA ? 'bg-[#ebd8bf] border-[#c8ae8b]' : 'bg-[#221f1c] border-[#38332c]'
                    }`}
                  >
                    <ScanIcon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs font-mono font-medium">
                    {isDraggingOver ? 'Drop image file here' : 'No image loaded'}
                  </p>
                  <p className="text-[10px] max-w-[220px] mx-auto leading-tight opacity-75">
                    Click "Browse", paste an image (Ctrl+V), or drag and drop an equation here.
                  </p>
                </div>
              )}

              {/* OCR Progress Bar & Messages */}
              {ocrLoading && ocrProgress && (
                <div
                  className={`p-2.5 rounded-xl border font-mono text-xs space-y-1.5 animate-in fade-in ${
                    isThemeA ? 'bg-[#fcf6ee] border-[#cbb391]' : 'bg-[#1f1b18] border-[#38332c]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span className={textHeading}>{ocrProgress.status}</span>
                    </span>
                    <span className={`font-bold ${textHeading}`}>
                      {Math.round(ocrProgress.progress * 100)}%
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isThemeA ? 'bg-[#e2ceb1]' : 'bg-[#2a2622]'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-200"
                      style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* OCR Error Message */}
              {ocrError && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-start gap-2 ${
                    isThemeA ? 'bg-[#fdf0ee] border-[#e2a89f] text-[#8e2d24]' : 'bg-[#2b1717] border-[#6b2c2c] text-[#f49b9b]'
                  }`}
                >
                  <AlertIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[11px]">OCR Error</p>
                    <p className="text-[10px] opacity-90 mt-0.5">{ocrError}</p>
                  </div>
                </div>
              )}

              {/* Recognize Button inside OCR tab */}
              <button
                type="button"
                disabled={!hasImage || ocrLoading}
                onClick={handleRunOcr}
                className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  !hasImage || ocrLoading
                    ? 'opacity-40 cursor-not-allowed border border-current'
                    : isThemeA
                    ? 'bg-[#26211a] hover:bg-[#383025] text-[#ecd8be] active:scale-[0.98] cursor-pointer'
                    : 'bg-[#ecd8be] hover:bg-[#f3e3ce] text-[#1a1714] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{ocrLoading ? 'Scanning...' : 'Run OCR Recognition'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Secondary Link in Main Card ─────────────────────────────── */}
        <div className={`mt-4 pt-3 border-t flex items-center justify-between px-0.5 ${isThemeA ? 'border-black/10' : 'border-white/5'}`}>
          <button
            type="button"
            onClick={handleOpenQuickPlot2D}
            className={`text-[10px] font-mono flex items-center gap-1 hover:underline transition-colors cursor-pointer ${
              isThemeA ? 'text-[#3d3326] hover:text-black font-semibold' : 'text-[#ecd8be] hover:text-white font-semibold'
            }`}
          >
            <span>↗ Open in QuickPlot 2D Studio</span>
          </button>
          <span className={`text-[9px] font-mono opacity-50 ${textMuted}`}>
            v1.2
          </span>
        </div>
      </div>

      {/* ── Bottom Layered Base Tray ("Peeking Drawer" CTA from reference) ── */}
      <div className="-mt-4 pt-6 px-2 pb-1 relative z-0">
        <button
          type="button"
          onClick={handlePlot}
          style={drawerBtnStyle}
          className="w-full py-3 px-5 rounded-2xl font-sans text-xs font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 group"
        >
          <ChartIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Plot Equation</span>
        </button>
      </div>

      {/* ── Interactive Canvas Graph Modal ──────────────────────────── */}
      {activeGraph && (
        <GraphModal
          equation={activeGraph}
          onClose={() => setActiveGraph(null)}
        />
      )}
    </div>
  );
}

// ── Image Canvas Preview Component ──────────────────────────────────────────
function ImageCanvasPreview({ sourceCanvas }: { sourceCanvas: HTMLCanvasElement | null }) {
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!sourceCanvas || !previewRef.current) return;
    const dest = previewRef.current;
    dest.width = sourceCanvas.width;
    dest.height = sourceCanvas.height;
    const ctx = dest.getContext('2d');
    if (ctx) {
      ctx.drawImage(sourceCanvas, 0, 0);
    }
  }, [sourceCanvas]);

  return (
    <canvas
      ref={previewRef}
      className="max-w-full max-h-[110px] object-contain rounded block"
    />
  );
}
