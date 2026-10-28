import { useState, useEffect } from 'react';
import { useAuth, hasAuthConfig } from '@quickplot/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  prompt?: string;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

function getLandingUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) return 'http://localhost:5173/';
  }
  return '/';
}

export function AuthModal({ open, onClose, prompt }: Props) {
  const { user, loginWithGoogle, login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      onClose();
    }
  }, [user, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    if (!hasAuthConfig()) {
      setErrorMsg('Firebase configuration missing in .env file.');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMsg('Sign-in cancelled. Try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }
    if (mode === 'register' && !fullName) {
      setErrorMsg('Please enter your name.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setErrorMsg(msg.replace('Firebase: ', ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-2xl p-6 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          title="Close dialog"
        >
          ✕
        </button>

        {prompt && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-amber-400 fill-none stroke-current" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{prompt}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <a
            href={getLandingUrl()}
            title="Return to QuickPlot landing page"
            className="font-pixel text-amber-400 text-sm tracking-widest hover:text-amber-300 transition-colors cursor-pointer"
          >
            QuickPlot
          </a>
          <span className="text-neutral-600">/</span>
          <span className="font-mono text-neutral-300 text-xs font-semibold uppercase">Account</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-neutral-400 text-xs mb-5">
          Sign in to save your 3D graphs, sync workspaces, and share equations across devices.
        </p>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="truncate">{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-medium text-sm transition-all shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        >
          <GoogleMark />
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">or with email</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        <div className="flex rounded-lg bg-neutral-800/80 p-1 mb-4 border border-neutral-700/60">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(null); }}
            className={[
              'flex-1 py-1 text-xs font-mono font-medium rounded-md transition-all',
              mode === 'signin'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200',
            ].join(' ')}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={[
              'flex-1 py-1 text-xs font-mono font-medium rounded-md transition-all',
              mode === 'register'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-neutral-400 hover:text-neutral-200',
            ].join(' ')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-neutral-400 text-xs font-mono mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-amber-400 text-white text-xs outline-none transition-colors placeholder:text-neutral-500"
              />
            </div>
          )}

          <div>
            <label className="block text-neutral-400 text-xs font-mono mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-amber-400 text-white text-xs outline-none transition-colors placeholder:text-neutral-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 text-xs font-mono mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:border-amber-400 text-white text-xs outline-none transition-colors placeholder:text-neutral-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-mono text-xs font-bold transition-all shadow-sm shadow-amber-500/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 pt-3 border-t border-neutral-800/80 text-center">
          <a
            href={getLandingUrl()}
            className="text-[11px] font-mono text-neutral-500 hover:text-amber-400 transition-colors inline-flex items-center gap-1"
          >
            <span>Visit QuickPlot homepage</span>
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
