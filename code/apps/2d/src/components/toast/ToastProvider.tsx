import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastContainer } from './ToastContainer';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  /** Total visible lifetime in ms. 0 = stays until manually dismissed. */
  duration: number;
  /** Set to `true` while the exit animation plays, then the toast is removed. */
  dismissing: boolean;
}

interface ToastAPI {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastAPI | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    // Flip the flag so the exit animation starts
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)),
    );
    // yank it out of the DOM once the animation has played
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 360);
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      setToasts((prev) => {
        // Prevent duplicate spam if identical toast is already active
        if (prev.some((t) => t.message === message && !t.dismissing)) {
          return prev;
        }
        const id = `toast-${++counter.current}`;
        if (duration > 0) {
          setTimeout(() => dismiss(id), duration);
        }
        return [...prev, { id, message, type, duration, dismissing: false }];
      });
    },
    [dismiss],
  );

  const api: ToastAPI = {
    success: (msg, dur) => push('success', msg, dur),
    error: (msg, dur) => push('error', msg, dur),
    info: (msg, dur) => push('info', msg, dur),
    warning: (msg, dur) => push('warning', msg, dur),
    dismiss,
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast() requires a <ToastProvider> ancestor');
  return ctx;
}
