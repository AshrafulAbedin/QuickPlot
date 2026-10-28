import { useState } from 'react';
import { useAuth } from '@quickplot/auth';
import { Backdrop } from './components/Backdrop';
import { EmbossButton } from './components/EmbossButton';
import { JumpyWord } from './components/JumpyWord';
import { Sparks } from './components/Sparks';
import { useWordCycle } from './hooks/useWordCycle';
import { AuthPanel } from './features/auth/AuthPanel';
import { LauncherPanel } from './features/launcher/LauncherPanel';
import type { AuthIntent } from './features/auth/AuthPanel';

/**
 * Which panel the dark half is showing. Kept as local state rather than routes:
 * the landing page is a single screen, and a router would be the only
 * dependency here that isn't React itself.
 */
type LeftView = 'hero' | AuthIntent;

const ROTATING_WORDS = ['seconds', 'one line', '2D & 3D', 'polar', 'real time','extension'];

function Hero({ onAuth, onStartPlotting, showLauncher }: { onAuth: (intent: AuthIntent) => void, onStartPlotting: () => void, showLauncher: boolean }) {
  const wordIndex = useWordCycle(ROTATING_WORDS.length);
  const { user, signOut } = useAuth();

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

      {user ? (
        <div className="animate-slide-up-3 mt-9 flex w-full flex-col gap-3.5">
          <button
            type="button"
            onClick={() => onAuth('signin')}
            className="btn-emboss w-full rounded-xl bg-amber-500 px-6 py-4 font-head text-lg font-semibold text-ink-900 [--emboss-base:#9a6b00] hover:bg-amber-400 group flex items-center justify-between"
          >
            <span>My Studio & Workspaces</span>
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-2 text-xl font-bold">→</span>
          </button>
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-mono">
            <span className="truncate max-w-[240px]">
              Signed in as <strong className="text-neutral-200">{user.displayName ?? user.email}</strong>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-amber-400 hover:text-amber-300 hover:underline transition-colors shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
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
      )}

      <div className="mt-10 lg:hidden">
        <a
          href="#launchers"
          className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer group"
        >
          <span>Explore 2D & 3D Graphers</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-y-1" fill="none">
            <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<LeftView>('hero');
  const [showLauncher, setShowLauncher] = useState(true);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row overflow-x-hidden">
      {/* Dark half — the hero, plus the auth & studio hub. */}
      <main className={`relative flex min-h-[60vh] grow items-center justify-center bg-ink-800 px-6 py-16 lg:min-h-screen lg:py-20 transition-[flex-basis] duration-700 ease-[cubic-bezier(0.2,0.9,0.3,1)] animate-slide-left ${showLauncher ? 'lg:basis-[55%]' : 'lg:basis-[100%]'}`}>
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
      <aside id="launchers" className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.2,0.9,0.3,1)] animate-slide-right ${showLauncher ? 'max-h-[1400px] opacity-100 lg:basis-[45%] lg:max-h-none' : 'max-h-0 opacity-0 lg:basis-[0%] lg:max-h-none'}`}>
        <div className="w-[100vw] lg:w-[45vw]">
          <LauncherPanel />
        </div>
      </aside>
    </div>
  );
}
