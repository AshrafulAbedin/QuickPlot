import { useState, type ReactNode } from 'react';
import { EmbossButton } from '../../components/EmbossButton';
import { ToolsPanel } from './ToolsPanel';

const URL_2D = import.meta.env.VITE_URL_2D ?? 'http://localhost:5174';
const URL_3D = import.meta.env.VITE_URL_3D ?? 'http://localhost:5175';

function Icon2D() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden focusable="false">
      <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4 15c3 0 3.5-7 6.5-7S14 17 17 17s3-5 3-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Icon3D() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden focusable="false">
      <path
        d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 21.2V11.6M12 11.6 20.5 7M12 11.6 3.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IconTools() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden focusable="false">
      <path
        d="M14.7 6.3a3.6 3.6 0 0 0 4.6 4.6l-7.4 7.4a2.3 2.3 0 0 1-3.2-3.2l7.4-7.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M6.5 5 5 6.5l2.6 2.6L9 7.6 6.5 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

interface LauncherCardProps {
  label: string;
  hint: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
}

function LauncherCard({ label, hint, icon, href, onClick, external = false }: LauncherCardProps) {
  return (
    <EmbossButton variant="paper" href={href} newTab={external} onClick={onClick}>
      <span className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper-100 text-ink-900 transition-colors group-hover:bg-amber-100 group-hover:text-amber-700">
          {icon}
        </span>
        <span className="min-w-0 grow">
          <span className="block font-head text-lg font-bold tracking-wide text-ink-900">{label}</span>
          <span className="mt-1 block text-[13px] font-light leading-snug text-paper-600">
            {hint}
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-paper-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-amber-600"
        >
          {external ? '↗' : '→'}
        </span>
      </span>
    </EmbossButton>
  );
}

/** The light half of the split: the three ways into the product. */
export function LauncherPanel() {
  const [showTools, setShowTools] = useState(false);

  return (
    <div className="graph-paper relative flex min-h-[52vh] w-full items-center justify-center bg-paper-100 px-6 py-16 lg:min-h-screen lg:py-20">
      {/* Soft seam so the dark and light halves meet without a hard line. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-800/15 to-transparent lg:inset-y-0 lg:left-0 lg:h-auto lg:w-16 lg:bg-gradient-to-r lg:from-ink-800/15"
      />

      {showTools ? (
        <ToolsPanel onBack={() => setShowTools(false)} />
      ) : (
        <div className="animate-rise w-full max-w-[440px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-600">
            Open a workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-ink-900">
            Start plotting — no account needed
          </h2>

          <div className="mt-8 flex flex-col gap-4">
            <LauncherCard
              label="2D"
              hint="Cartesian · polar · parametric · implicit"
              icon={<Icon2D />}
              href={URL_2D}
              external
            />
            <LauncherCard
              label="3D"
              hint="Surface plots with orbit controls"
              icon={<Icon3D />}
              href={URL_3D}
              external
            />
            <LauncherCard
              label="TOOLS"
              hint="Browser extension, data import, share links"
              icon={<IconTools />}
              onClick={() => setShowTools(true)}
            />
          </div>

          <p className="mt-9 text-xs font-light leading-relaxed text-paper-600">
            The graphers open in a new tab. Sign in only if you want to save what you build.
          </p>
        </div>
      )}
    </div>
  );
}
