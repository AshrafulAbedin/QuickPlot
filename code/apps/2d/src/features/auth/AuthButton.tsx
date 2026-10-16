import { useState, useRef, useEffect } from 'react';
import { useAuth } from './useAuth';
import { AuthModal } from './AuthModal';

interface Props {
  externalModalOpen?: boolean;
  onExternalModalClose?: () => void;
  externalModalPrompt?: string;
}

export function AuthButton({
  externalModalOpen,
  onExternalModalClose,
  externalModalPrompt,
}: Props = {}) {
  const { user, loading, signOut } = useAuth();
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const modalOpen = Boolean(externalModalOpen) || internalModalOpen;
  const activePrompt = externalModalOpen ? externalModalPrompt : undefined;
  const handleCloseModal = () => {
    setInternalModalOpen(false);
    if (onExternalModalClose) onExternalModalClose();
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse border border-neutral-700/60" />
      </div>
    );
  }

  if (user) {
    const initial = (user.displayName || user.email || 'U').slice(0, 1).toUpperCase();
    return (
      <div className="relative" ref={menuRef}>
        {/* Avatar-only button in topbar */}
        <button
          type="button"
          onClick={() => setShowMenu(v => !v)}
          title={user.displayName || user.email || 'Account'}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400/50 cursor-pointer transition-transform active:scale-95 flex items-center justify-center"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User avatar'}
              className="w-7 h-7 rounded-full border border-neutral-600/80 hover:border-amber-400/80 shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center shadow-sm border border-neutral-700 hover:border-amber-400/80">
              {initial}
            </div>
          )}
        </button>

        {/* Profile Card Popover */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2.5 z-50 w-72 rounded-2xl bg-[#1e1e20] border border-white/10 shadow-2xl p-4 select-none animate-in fade-in zoom-in-95 duration-100">
            {/* Header info */}
            <div className="flex items-center gap-3.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'User avatar'}
                  className="w-12 h-12 rounded-full border border-white/15 shadow-md object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 font-bold text-base flex items-center justify-center shadow-md border border-white/15 shrink-0">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate leading-tight">
                  {user.displayName || 'Ashraful Abedin'}
                </h3>
                <p className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="h-px bg-white/10 my-3.5" />

            {/* Sign out button */}
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                void signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#241416] hover:bg-[#341b1e] border border-[#7f1d1d] hover:border-[#b91c1c] text-[#f87171] hover:text-[#fca5a5] font-mono text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              title="Sign out of your account"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        )}

        <AuthModal
          open={modalOpen}
          onClose={handleCloseModal}
          prompt={activePrompt}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setInternalModalOpen(true)}
        className="px-3 py-1 rounded-md bg-gradient-to-b from-amber-400 to-amber-500 text-neutral-950 font-mono text-xs font-semibold hover:from-amber-300 hover:to-amber-400 transition-all shadow-sm shadow-amber-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        title="Sign in to save graphs and sync workspaces"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Sign in</span>
      </button>

      <AuthModal
        open={modalOpen}
        onClose={handleCloseModal}
        prompt={activePrompt}
      />
    </>
  );
}
