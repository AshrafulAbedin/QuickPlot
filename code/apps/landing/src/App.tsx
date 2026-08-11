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

const ROTATING_WORDS = ['seconds', 'one line', '2D & 3D', 'polar', 'real time','extension'];

function Hero({ onAuth, onStartPlotting, showLauncher }: { onAuth: (intent: AuthIntent) => void, onStartPlotting: () => void, showLauncher: boolean }) {
  const wordIndex = useWordCycle(ROTATING_WORDS.length);

  return (
    <div className="animate-rise flex w-full max-w-[420px] flex-col items-center">
      <h1 className="text-center font-head text-[56px] font-bold leading-[1.15] tracking-tight sm:text-[72px]">
        <span className="text-neutral-50">Quick</span>
        <span className="text-glow-amber text-amber-500">Plot</span>
      </h1>

      <p className="mt-6 text-center text-lg font-light leading-9 text-neutral-300 sm:text-xl">
        <b>Plot your <span className="wavy-underline">first</span> equation in</b> {' '}
        <Sparks trigger={wordIndex}>
          <JumpyWord
            words={ROTATING_WORDS}
            index={wordIndex}
            className="font-mono text-[26px] font-semibold text-amber-500 sm:text-[30px]"
          />
        </Sparks>
      </p>

      <nav aria-label="Account" className="mt-11 flex w-full flex-col gap-5">
        <EmbossButton variant="primary" onClick={() => onAuth('signin')}>
          <span className="block text-center font-head text-2xl font-semibold">Sign in</span>
          <span className="mt-1 block text-center text-xs font-semibold text-ink-900/70">
            Pick up your saved workspaces
          </span>
        </EmbossButton>

        <EmbossButton variant="dark" onClick={() => onAuth('register')}>
          <span className="block text-center font-head text-2xl font-semibold">Register</span>
          <span className="mt-1 block text-center text-xs font-semibold text-neutral-400">
            One tap with Google
          </span>
        </EmbossButton>
      </nav>

      <div className={`mt-11 transition-opacity duration-500 ${showLauncher ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <p onClick={onStartPlotting} className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer">
          Or Start plotting directly
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden focusable="false">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<LeftView>('hero');
  const [showLauncher, setShowLauncher] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row overflow-x-hidden">
      {/* Dark half — the original hero, plus the auth screens. */}
      <main className={`relative flex min-h-[60vh] grow items-center justify-center bg-ink-800 px-6 py-16 lg:min-h-screen lg:py-20 transition-[flex-basis] duration-700 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${showLauncher ? 'lg:basis-[55%]' : 'lg:basis-[100%]'}`}>
        <Backdrop />
        <div className="relative flex w-full justify-center">
          {view === 'hero' ? (
            <Hero onAuth={setView} onStartPlotting={() => setShowLauncher(true)} showLauncher={showLauncher} />
          ) : (
            <AuthPanel intent={view} onBack={() => setView('hero')} onSwitch={setView} />
          )}
        </div>
      </main>

      {/* Light half — launchers. */}
      <aside className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${showLauncher ? 'max-h-[1200px] opacity-100 lg:basis-[45%] lg:max-h-none' : 'max-h-0 opacity-0 lg:basis-[0%] lg:max-h-none'}`}>
        <div className="w-[100vw] lg:w-[45vw]">
          <LauncherPanel />
        </div>
      </aside>
    </div>
  );
}
