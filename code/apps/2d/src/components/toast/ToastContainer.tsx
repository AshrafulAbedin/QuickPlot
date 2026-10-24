import { createPortal } from 'react-dom';
import type { ToastData, ToastType } from './ToastProvider';

/* ------------------------------------------------------------------ */
/*  Inline SVG icons — one per toast type, zero external deps.        */
/* ------------------------------------------------------------------ */

function IconSuccess() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="toast-icon" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconError() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="toast-icon" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="toast-icon" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="toast-icon" aria-hidden>
      <path
        d="M12 3L2 21h20L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path d="M12 10v4m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ICON: Record<ToastType, () => JSX.Element> = {
  success: IconSuccess,
  error: IconError,
  info: IconInfo,
  warning: IconWarning,
};

/* ------------------------------------------------------------------ */
/*  Accent and glow colours keyed by toast type.                      */
/* ------------------------------------------------------------------ */

const ACCENT: Record<ToastType, string> = {
  success: '#fbbf24', // amber-500 — brand colour
  error: '#ef4444',   // red-500
  info: '#60a5fa',    // blue-400
  warning: '#f97316', // orange-500
};

const GLOW: Record<ToastType, string> = {
  success: 'rgba(251, 191, 36, 0.18)',
  error: 'rgba(239, 68, 68, 0.18)',
  info: 'rgba(96, 165, 250, 0.18)',
  warning: 'rgba(249, 115, 22, 0.18)',
};

/* ------------------------------------------------------------------ */
/*  Single toast item                                                  */
/* ------------------------------------------------------------------ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICON[toast.type];

  return (
    <div
      className={`toast-item ${toast.dismissing ? 'toast-dismissing' : 'toast-entering'}`}
      style={
        {
          '--toast-accent': ACCENT[toast.type],
          '--toast-glow': GLOW[toast.type],
          '--toast-duration': `${toast.duration}ms`,
        } as React.CSSProperties
      }
      onClick={() => onDismiss(toast.id)}
      role="status"
      aria-live="polite"
    >
      {/* Soft radial glow behind the card — adapts colour to the type. */}
      <div className="toast-glow" />

      <Icon />
      <span className="toast-message">{toast.message}</span>

      {/* Shrinking progress strip along the bottom edge. */}
      {toast.duration > 0 && <div className="toast-progress" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Container — portalled to <body> so it sits above everything.      */
/* ------------------------------------------------------------------ */

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}
