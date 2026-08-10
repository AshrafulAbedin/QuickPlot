import { useState } from 'react';
import { Backdrop } from './components/Backdrop';
import { EmbossButton } from './components/EmbossButton';
import { JumpyWord } from './components/JumpyWord';
import { Sparks } from './components/Sparks';
import { useWordCycle } from './hooks/useWordCycle';
import { AuthPanel } from './features/auth/AuthPanel';
import { LauncherPanel } from './features/launcher/LauncherPanel';
import type { AuthIntent } from './lib/auth';

/**
 * Which panel the dark half is showing. Kept as local state rather than routes:
 * the landing page is a single screen, and a router would be the only
 * dependency here that isn't React itself.
 */
type LeftView = 'hero' | AuthIntent;

const ROTATING_WORDS = ['seconds', 'one line', '3D', 'polar', 'real time'];

function Hero({ onAuth }: { onAuth: (intent: AuthIntent) => void }) {
  const wordIndex = useWordCycle(ROTATING_WORDS.length);

  return (
    <div className="animate-rise flex w-full max-w-[420px] flex-col items-center">
      <h1 className="text-center font-head text-[40px] font-bold leading-[1.15] tracking-tight sm:text-[54px]">
        <span className="text-neutral-50">Quick</span>
        <span className="text-glow-amber text-amber-500">Plot</span>
      </h1>

      <p className="mt-6 text-center text-lg font-light leading-9 text-neutral-300 sm:text-xl">
        Plot your <span className="wavy-underline">first</span> equation in{' '}
        <Sparks trigger={wordIndex}>
          <JumpyWord
            words={ROTATING_WORDS}
            index={wordIndex}
            className="font-hand text-[26px] font-bold text-amber-500 sm:text-[30px]"
          />
        </Sparks>
      </p>

      <nav aria-label="Account" className="mt-11 flex w-full flex-col gap-5">
        <EmbossButton variant="primary" onClick={() => onAuth('signin')}>
          <span className="block text-center font-head text-xl font-semibold">Sign in</span>
          <span className="mt-1 block text-center text-xs font-light text-ink-900/70">
            Pick up your saved workspaces
          </span>
        </EmbossButton>

        <EmbossButton variant="dark" onClick={() => onAuth('register')}>
          <span className="block text-center font-head text-xl font-semibold">Register</span>
          <span className="mt-1 block text-center text-xs font-light text-neutral-400">
            One tap with Google · free
          </span>
        </EmbossButton>
      </nav>

      <p className="mt-11 text-center text-xs font-light text-neutral-500">
        Or jump straight into a grapher — no account needed.
      </p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<LeftView>('hero');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Dark half — the original hero, plus the auth screens. */}
      <main className="relative flex min-h-[60vh] grow items-center justify-center bg-ink-800 px-6 py-16 lg:min-h-screen lg:basis-[55%] lg:py-20">
        <Backdrop />
        <div className="relative flex w-full justify-center">
          {view === 'hero' ? (
            <Hero onAuth={setView} />
          ) : (
            <AuthPanel intent={view} onBack={() => setView('hero')} onSwitch={setView} />
          )}
        </div>
      </main>

      {/* Light half — launchers. */}
      <aside className="lg:basis-[45%]">
        <LauncherPanel />
      </aside>
    </div>
  );
}
