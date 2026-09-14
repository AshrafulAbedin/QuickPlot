import { useState } from 'react';
import { hasFirebaseConfig, useAuth } from '@quickplot/auth';
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

export function AuthPanel({ intent, onBack, onSwitch }: AuthPanelProps) {
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loginWithGoogle, signOut } = useAuth();
  const copy = COPY[intent];

  const handleGoogle = async () => {
    if (!hasFirebaseConfig()) {
      setNotice('Google sign-in needs Firebase settings. Copy .env.example to .env and add the project values.');
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
    return (
      <div className="animate-rise w-full max-w-[420px]">
        <h2 className="font-head text-[30px] font-bold leading-tight tracking-tight text-neutral-50 sm:text-[34px]">You’re signed in</h2>
        <div className="mt-7 flex items-center gap-4 rounded-xl border border-white/10 bg-ink-700/60 p-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 font-head text-lg font-bold text-ink-900" aria-hidden>
              {(user.displayName ?? user.email ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-neutral-50">{user.displayName ?? 'QuickPlot user'}</p>
            <p className="truncate text-sm text-neutral-400">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.assign(import.meta.env.VITE_URL_2D ?? '/2d/')}
          className="btn-emboss mt-7 w-full rounded-xl bg-amber-500 px-6 py-4 font-head text-lg font-semibold text-ink-900 [--emboss-base:#9a6b00] hover:bg-amber-400"
        >
          Open 2D grapher
        </button>
        <button type="button" onClick={() => void signOut()} className="mt-6 w-full text-sm text-neutral-400 underline underline-offset-4 hover:text-amber-400">
          Sign out
        </button>
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
