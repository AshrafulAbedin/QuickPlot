import { useState } from 'react';
import { hasAuthConfig, useAuth } from '@quickplot/auth';
import { GoogleButton } from './GoogleButton';

export type AuthIntent = 'signin' | 'register';

const COPY: Record<AuthIntent, { title: string; blurb: string; cta: string }> = {
  signin: {
    title: 'Welcome back',
    blurb: 'Sign in to reopen your saved workspaces and picked-up-where-you-left-off graphs.',
    cta: 'Sign in with Google',
  },
  register: {
    title: 'Create your account',
    blurb: 'One tap with Google. No password to remember, no email to confirm.',
    cta: 'Continue with Google',
  },
};

/** What an account buys you — only worth spelling out on the register screen. */
const PERKS = [
  'Save workspaces and reopen them anywhere',
  'Share a graph with a link that keeps working',
  'Sync sliders, themes and equation sets',
];

interface AuthPanelProps {
  intent: AuthIntent;
  onBack: () => void;
  onSwitch: (intent: AuthIntent) => void;
}

function get2DUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) return 'http://localhost:5174/2d/';
  }
  const envUrl = import.meta.env.VITE_URL_2D;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) return envUrl;
  return '/2d/';
}

function get3DUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) return 'http://localhost:5175/3d/';
  }
  const envUrl = import.meta.env.VITE_URL_3D;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) return envUrl;
  return '/3d/';
}

export function AuthPanel({ intent, onBack, onSwitch }: AuthPanelProps) {
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loginWithGoogle, signOut } = useAuth();
  const copy = COPY[intent];

  const handleGoogle = async () => {
    if (!hasAuthConfig()) {
      setNotice('Google sign-in needs Firebase settings. Copy code/.env.example to code/.env and add the project values.');
      return;
    }

    try {
      setSubmitting(true);
      setNotice('');
      await loginWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed.';
      setNotice(message.includes('popup-closed-by-user') ? 'Sign-in was cancelled. Try again when you are ready.' : `Google sign-in failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (user) {
    const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Explorer';
    const photoURL = user.photoURL;

    return (
      <div className="w-full max-w-[460px] flex flex-col gap-5">
        {/* Top Back Link */}
        <div className="animate-slide-up-1 flex items-center justify-end">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-neutral-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1 group font-mono"
          >
            <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">←</span> Overview
          </button>
        </div>

        {/* User Profile Card */}
        <div className="animate-slide-up-2 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700/80 via-ink-700/50 to-ink-800/80 p-5 shadow-2xl backdrop-blur-md">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative shrink-0">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-amber-500/60 shadow-lg shadow-amber-500/20 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 font-head text-xl font-bold text-ink-900 shadow-lg shadow-amber-500/20">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 block h-4 w-4 rounded-full border-2 border-ink-800 bg-emerald-500" />
            </div>

            <div className="min-w-0 grow">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-head text-lg font-bold text-neutral-50 sm:text-xl">
                  {displayName}
                </h3>
                <span title="Verified Google Account" className="text-amber-400 text-xs">✦</span>
              </div>
              <p className="truncate text-xs font-mono text-neutral-400 mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Action Cards with Sliding Arrows */}
        <div className="flex flex-col gap-3.5">
          {/* 2D Button */}
          <a
            href={get2DUrl()}
            className="animate-slide-up-3 group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 transition-all duration-300 hover:border-amber-400 hover:from-amber-500/25 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 block"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-ink-900 shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:bg-amber-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 15c3 0 3.5-7 6.5-7S14 17 17 17s3-5 3-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0 grow">
                <span className="font-head text-lg font-bold tracking-wide text-neutral-50 group-hover:text-amber-300 transition-colors">
                  2D GRAPHER
                </span>
              </div>
              <span
                aria-hidden
                className="shrink-0 text-neutral-400 transition-all duration-200 group-hover:translate-x-2 group-hover:text-amber-300 text-lg"
              >
                →
              </span>
            </div>
          </a>

          {/* 3D Button */}
          <a
            href={get3DUrl()}
            className="animate-slide-up-4 group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-ink-700/60 to-ink-700/30 p-4 transition-all duration-300 hover:border-amber-500/40 hover:from-ink-700/90 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 block"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ink-600 text-amber-400 border border-white/10 shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:border-amber-400/50">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 grow">
                <span className="font-head text-lg font-bold tracking-wide text-neutral-50 group-hover:text-amber-300 transition-colors">
                  3D GRAPHER
                </span>
              </div>
              <span
                aria-hidden
                className="shrink-0 text-neutral-400 transition-all duration-200 group-hover:translate-x-2 group-hover:text-amber-300 text-lg"
              >
                →
              </span>
            </div>
          </a>
        </div>

        {/* Footer actions */}
        <div className="animate-slide-up-5 mt-2 flex items-center justify-end border-t border-white/10 pt-4 text-xs text-neutral-400">
          <button
            type="button"
            onClick={() => void signOut()}
            className="hover:text-amber-400 transition-colors underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise w-full max-w-[420px]">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-light text-neutral-400 transition-colors hover:text-amber-400"
      >
        <span aria-hidden>←</span> Back
      </button>

      <h2 className="font-head text-[30px] font-bold leading-tight tracking-tight text-neutral-50 sm:text-[34px]">
        {copy.title}
      </h2>
      <p className="mt-5 text-base font-light leading-relaxed text-neutral-300">{copy.blurb}</p>

      {intent === 'register' && (
        <ul className="mt-7 space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm font-light text-neutral-300">
              <span aria-hidden className="mt-[2px] text-amber-500">
                ✦
              </span>
              {perk}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-9">
        <GoogleButton label={submitting ? 'Opening Google…' : copy.cta} onClick={handleGoogle} disabled={submitting} />
      </div>

      {notice && (
        <p role="status" className="mt-4 text-center text-xs font-light text-amber-400/90">
          {notice}
        </p>
      )}

      <p className="mt-8 text-center text-sm font-light text-neutral-400">
        {intent === 'signin' ? (
          <>
            New here?{' '}
            <button
              type="button"
              onClick={() => onSwitch('register')}
              className="font-medium text-amber-500 underline underline-offset-4 hover:text-amber-400"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have one?{' '}
            <button
              type="button"
              onClick={() => onSwitch('signin')}
              className="font-medium text-amber-500 underline underline-offset-4 hover:text-amber-400"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
