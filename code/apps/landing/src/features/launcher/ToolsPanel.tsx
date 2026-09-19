interface Tool {
  name: string;
  blurb: string;
  status: 'soon' | 'live';
}

const TOOLS: Tool[] = [
  {
    name: 'Browser extension',
    blurb: 'Plot a selected equation from any page without leaving the tab. Chrome MV3.',
    status: 'soon',
  },
  {
    name: 'Data import',
    blurb: 'Drop a CSV, TSV or JSON file onto the 2D grapher to render it as a point set.',
    status: 'live',
  },
  {
    name: 'Share links',
    blurb: 'Every workspace encodes into its URL — copy it and the graph travels with it.',
    status: 'live',
  },
];

interface ToolsPanelProps {
  onBack: () => void;
}

export function ToolsPanel({ onBack }: ToolsPanelProps) {
  return (
    <div className="animate-rise w-full max-w-[440px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 text-sm text-paper-600 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>←</span> Back
      </button>

      <h2 className="font-head text-2xl font-bold tracking-tight text-ink-900">Tools</h2>
      <p className="mt-4 text-sm leading-relaxed text-paper-600">
        Extras that sit around the graphers. The extension is still being built.
      </p>

      <ul className="mt-7 space-y-3">
        {TOOLS.map((tool) => (
          <li
            key={tool.name}
            className="rounded-xl border border-paper-300 bg-white/70 px-5 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-ink-900">{tool.name}</span>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
