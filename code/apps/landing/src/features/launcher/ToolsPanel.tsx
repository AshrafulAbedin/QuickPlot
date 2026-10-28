import { useState, useEffect } from 'react';

interface Tool {
  id?: string;
  name: string;
  blurb: string;
  status: 'soon' | 'live';
  actionLabel?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'extension',
    name: 'Browser extension',
    blurb: 'Plot any selected equation or formula from any page without leaving the tab. Chrome MV3 with offline OCR.',
    status: 'live',
    actionLabel: 'Setup & Download',
  },
  {
    id: 'import',
    name: 'Data import',
    blurb: 'Drop a CSV, TSV or JSON file onto the 2D grapher to render it as a point set.',
    status: 'live',
  },
  {
    id: 'share',
    name: 'Share links',
    blurb: 'Every workspace encodes into its URL — copy it and the graph travels with it.',
    status: 'live',
  },
];

interface ToolsPanelProps {
  onBack: () => void;
}

function triggerDownload() {
  const link = document.createElement('a');
  link.href = '/quickplot-extension.zip';
  link.download = 'quickplot-extension.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ToolsPanel({ onBack }: ToolsPanelProps) {
  const [activeView, setActiveView] = useState<'list' | 'extension'>('list');
  const [downloadNotice, setDownloadNotice] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const openExtensionGuide = () => {
    setActiveView('extension');
  };

  useEffect(() => {
    if (downloadNotice) {
      const timer = setTimeout(() => setDownloadNotice(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [downloadNotice]);

  if (activeView === 'extension') {
    return (
      <div className="animate-rise w-full max-w-[460px] pb-6">
        <button
          type="button"
          onClick={() => setActiveView('list')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-paper-600 transition-colors hover:text-ink-900 group"
        >
          <span aria-hidden className="transition-transform duration-150 group-hover:-translate-x-1">←</span> Back to Tools
        </button>

        {downloadNotice && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm animate-rise">
            <svg className="h-4 w-4 shrink-0 text-amber-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span><strong>quickplot-extension.zip</strong> download started! Follow the installation steps below.</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <h2 className="font-head text-2xl font-bold tracking-tight text-ink-900">
            QuickPlot Extension
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Live
            </span>
            <span className="rounded-full bg-paper-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-paper-600">
              Chrome MV3
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-paper-600">
          Extract and graph formulas directly on web articles, papers, or screenshots without leaving your current tab.
        </p>

        {/* Download Action Card */}
        <div className="mt-5 rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-head text-sm font-bold text-ink-900">quickplot-extension.zip</div>
              <div className="text-xs text-paper-600">v0.1.0 • 2.8 MB • Offline OCR Ready</div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerDownload();
                setDownloadNotice(true);
              }}
              className="btn-emboss inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-head text-xs font-bold text-ink-900 hover:bg-amber-400 [--emboss-base:#b0800f]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .zip
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 space-y-3.5">
          <h3 className="font-head text-xs font-bold uppercase tracking-wider text-paper-600">
            Installation & Setup (1 minute)
          </h3>

          <div className="flex gap-3.5 rounded-xl border border-paper-300 bg-white/80 p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-200 font-head text-xs font-bold text-ink-900">
              1
            </span>
            <div className="text-xs leading-relaxed text-ink-900">
              <strong className="block font-semibold">Extract the ZIP</strong>
              <span className="text-paper-600">
                Unzip the downloaded <code className="rounded bg-paper-200 px-1 py-0.5 font-mono text-[11px] text-ink-900">quickplot-extension.zip</code> file into a folder on your computer.
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 rounded-xl border border-paper-300 bg-white/80 p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-200 font-head text-xs font-bold text-ink-900">
              2
            </span>
            <div className="grow text-xs leading-relaxed text-ink-900">
              <strong className="block font-semibold">Open Extensions Page</strong>
              <span className="text-paper-600">
                In Chrome, Edge, or Brave, open a new tab and paste:
              </span>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-paper-300 bg-paper-100 px-3 py-1.5 font-mono text-[11px] text-ink-900">
                <span>chrome://extensions</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('chrome://extensions');
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="rounded px-2 py-0.5 text-[10px] font-sans font-semibold text-paper-600 hover:bg-paper-200 hover:text-ink-900 transition-colors"
                >
                  {copiedUrl ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3.5 rounded-xl border border-paper-300 bg-white/80 p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-200 font-head text-xs font-bold text-ink-900">
              3
            </span>
            <div className="text-xs leading-relaxed text-ink-900">
              <strong className="block font-semibold">Enable Developer Mode</strong>
              <span className="text-paper-600">
                Toggle the switch labeled <strong className="text-ink-900">Developer mode</strong> in the top-right corner of the Extensions tab.
              </span>
            </div>
          </div>

          <div className="flex gap-3.5 rounded-xl border border-paper-300 bg-white/80 p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-200 font-head text-xs font-bold text-ink-900">
              4
            </span>
            <div className="text-xs leading-relaxed text-ink-900">
              <strong className="block font-semibold">Load Unpacked Extension</strong>
              <span className="text-paper-600">
                Click <strong className="text-ink-900">Load unpacked</strong> (top-left toolbar) and select the extracted extension folder.
              </span>
            </div>
          </div>

          {/* How to use */}
          <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-4">
            <h4 className="font-head text-xs font-bold uppercase tracking-wider text-amber-800">
              How to Use It
            </h4>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-paper-600">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong className="text-ink-900">Select & Plot:</strong> Highlight any equation (KaTeX, MathJax, MathML, or LaTeX) on a web page, then right-click and choose <em>"Plot with QuickPlot"</em> or click the extension icon.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong className="text-ink-900">OCR Snip:</strong> Use the extension&apos;s <em>Snip Page</em> or upload an image to extract mathematical formulas via local WebAssembly OCR.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-600">•</span>
                <span><strong className="text-ink-900">Modal Graphing:</strong> Inspect Cartesian, polar, or implicit curves instantly in the overlay, or export to QuickPlot 2D with a single click.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise w-full max-w-[440px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 text-sm text-paper-600 transition-colors hover:text-ink-900 group"
      >
        <span aria-hidden className="transition-transform duration-150 group-hover:-translate-x-1">←</span> Back
      </button>

      <h2 className="font-head text-2xl font-bold tracking-tight text-ink-900">Tools</h2>
      <p className="mt-4 text-sm leading-relaxed text-paper-600">
        Extras and integrations that power QuickPlot across the web.
      </p>

      <ul className="mt-7 space-y-3.5">
        {TOOLS.map((tool) => {
          const isExtension = tool.id === 'extension';
          return (
            <li
              key={tool.name}
              onClick={isExtension ? openExtensionGuide : undefined}
              className={[
                'rounded-xl border border-paper-300 bg-white/70 px-5 py-4 transition-all duration-150',
                isExtension
                  ? 'cursor-pointer hover:border-amber-400 hover:bg-white hover:shadow-sm group'
                  : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-ink-900 group-hover:text-amber-800 transition-colors">
                  {tool.name}
                </span>
                <span
                  className={[
                    'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                    tool.status === 'soon'
                      ? 'bg-paper-200 text-paper-600'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}
                >
                  {tool.status === 'soon' ? 'Soon' : 'Live'}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-paper-600">{tool.blurb}</p>

              {tool.actionLabel && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600 group-hover:text-amber-700">
                  <span>{tool.actionLabel}</span>
                  <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">→</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

