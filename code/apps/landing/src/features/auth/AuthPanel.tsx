import { useState } from 'react';
import { GoogleButton } from './GoogleButton';
import { startGoogleAuth, type AuthIntent } from '../../lib/auth';

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
  const copy = COPY[intent];

  const handleGoogle = () => {
    // Falls through to a notice until the Neon-backed OAuth route is live.
    if (!startGoogleAuth(intent)) {
      setNotice('Google sign-in is not connected yet — the graphers work without an account.');
    }
  };

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
        <GoogleButton label={copy.cta} onClick={handleGoogle} />
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
