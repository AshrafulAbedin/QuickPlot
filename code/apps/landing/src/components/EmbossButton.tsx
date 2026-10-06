import type { ReactNode } from 'react';

export type EmbossVariant = 'primary' | 'dark' | 'paper';

/**
 * `--emboss-base` is the colour of the button's "side" — the solid block the
 * face floats above and sinks onto. Depth and timing live in `.btn-emboss`.
 */
const VARIANTS: Record<EmbossVariant, string> = {
  primary: 'bg-amber-500 text-ink-900 hover:bg-amber-400 [--emboss-base:#b0800f]',
  dark: 'border border-white/10 bg-ink-600 text-neutral-100 hover:bg-ink-700 [--emboss-base:#100f0d]',
  paper: 'border border-paper-300 bg-white text-ink-900 hover:bg-paper-50 [--emboss-base:#D3C9B2]',
};

const BASE = [
  'btn-emboss group block w-full rounded-xl px-6 py-4 text-left',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2',
].join(' ');

interface EmbossButtonProps {
  variant: EmbossVariant;
  children: ReactNode;
  className?: string;
  /** Renders an anchor instead of a button. */
  href?: string;
  /** Anchors only: open in a new tab. */
  newTab?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function EmbossButton({
  variant,
  children,
  className = '',
  href,
  newTab = false,
  onClick,
  ariaLabel,
}: EmbossButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={classes}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={classes}>
      {children}
    </button>
  );
}
