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
          className="min-w-0 flex-1 max-w-xs bg-neutral-700 text-neutral-100 text-xs font-mono rounded px-2 py-1 border border-amber-400 outline-none"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
        />
      ) : (
        <button
          title="Rename workspace"
          onClick={() => setEditing(true)}
          className="min-w-0 max-w-xs truncate text-left font-pixel text-neutral-300 hover:text-amber-300 text-xs px-2 py-1 rounded border border-transparent hover:border-neutral-600 transition-colors"
        >
          {name || DEFAULT_WORKSPACE_NAME}
        </button>
      )}

      <button
        title="Save workspace (copies share link)"
        onClick={onSave}
        className={[
          'shrink-0 font-pixel text-xs px-2 py-1 rounded transition-colors border',
          saveFlash
            ? 'bg-green-500/20 text-green-300 border-green-500/40'
            : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-transparent',
        ].join(' ')}
      >
        {saveFlash ? '✓ Saved' : 'Save'}
      </button>
    </div>
  );
}
