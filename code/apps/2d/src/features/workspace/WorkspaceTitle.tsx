import { useEffect, useRef, useState } from 'react';

export const DEFAULT_WORKSPACE_NAME = 'Untitled Graph';
export const WORKSPACE_NAME_STORAGE_KEY = 'quickplot:2d:workspace-name';

interface Props {
  name: string;
  onChange: (name: string) => void;
  onSave: () => void;
  saveFlash?: boolean;
}

function IconGraph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden focusable="false">
      <path d="M4 4v16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 15c2-4 4-6 6-6s3 4 6-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkspaceTitle({ name, onChange, onSave, saveFlash }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    onChange(trimmed || DEFAULT_WORKSPACE_NAME);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-neutral-500 shrink-0" aria-hidden>
        <IconGraph />
      </span>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 max-w-xs bg-neutral-800 text-neutral-100 text-xs font-mono rounded-md px-2.5 py-1 border border-amber-400/80 outline-none shadow-inner focus:ring-1 focus:ring-amber-400"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
        />
      ) : (
        <button
          title="Click to rename workspace"
          onClick={() => setEditing(true)}
          className="group min-w-0 max-w-xs truncate text-left font-pixel text-neutral-300 hover:text-amber-300 text-xs px-2 py-1 rounded-md border border-transparent hover:border-neutral-700 hover:bg-neutral-800/60 transition-all flex items-center gap-1.5"
        >
          <span className="truncate">{name || DEFAULT_WORKSPACE_NAME}</span>
          <svg viewBox="0 0 24 24" className="w-3 h-3 text-neutral-500 group-hover:text-amber-400/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}

      <button
        title="Save workspace (copies share link)"
        onClick={onSave}
        className={[
          'shrink-0 flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md transition-all border shadow-sm active:scale-95',
          saveFlash
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
            : 'bg-neutral-800 hover:bg-neutral-700/90 text-neutral-300 hover:text-amber-300 border-neutral-700/70 hover:border-amber-400/40',
        ].join(' ')}
      >
        {saveFlash ? (
          <>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Saved!</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Save</span>
          </>
        )}
      </button>
    </div>
  );
}
