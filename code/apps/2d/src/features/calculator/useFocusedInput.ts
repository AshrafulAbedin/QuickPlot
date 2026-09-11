import { useCallback, useRef } from 'react';

/**
 * Central registry for the currently focused equation input. The calculator
 * needs to know *which* input to type into; instead of racing with
 * `document.activeElement` (which is `body` the moment the calculator button
 * is clicked), each input calls `bind()` on mount and the returned cleanup
 * on unmount, and `insertToken()` targets the last-focused input.
 */
export interface FocusedInputAPI {
  bind: (el: HTMLInputElement | null) => (() => void) | void;
  insertToken: (token: string) => boolean;
  backspace: () => boolean;
  moveCaret: (delta: number) => boolean;
}

export function useFocusedInput(): FocusedInputAPI {
  const activeRef = useRef<HTMLInputElement | null>(null);

  const bind = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    const onFocus = () => { activeRef.current = el; };
    // Do NOT clear activeRef on blur — a click on a calculator key steals
    // focus momentarily, and we want the next keystroke to land back in
    // the last-focused input. The ref is naturally superseded by the next
    // input's focus event.
    el.addEventListener('focus', onFocus);
    return () => {
      el.removeEventListener('focus', onFocus);
      if (activeRef.current === el) activeRef.current = null;
    };
  }, []);

  const mutate = (mutator: (value: string, start: number, end: number) => { next: string; caret: number }): boolean => {
    const el = activeRef.current;
    if (!el) return false;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const { next, caret } = mutator(el.value, start, end);

    // Use the native setter so React's onChange handler fires.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    if (setter) setter.call(el, next);
    else el.value = next;
    el.dispatchEvent(new Event('input', { bubbles: true }));

    el.focus();
    el.setSelectionRange(caret, caret);
    return true;
  };

  const insertToken = useCallback((token: string): boolean =>
    mutate((v, s, e) => ({
      next: v.slice(0, s) + token + v.slice(e),
      caret: s + token.length,
    })), []);

  const backspace = useCallback((): boolean =>
    mutate((v, s, e) => {
      if (s !== e) return { next: v.slice(0, s) + v.slice(e), caret: s };
      if (s === 0) return { next: v, caret: 0 };
      return { next: v.slice(0, s - 1) + v.slice(s), caret: s - 1 };
    }), []);

  const moveCaret = useCallback((delta: number): boolean => {
    const el = activeRef.current;
    if (!el) return false;
    const start = el.selectionStart ?? el.value.length;
    const next = Math.max(0, Math.min(el.value.length, start + delta));
    el.focus();
    el.setSelectionRange(next, next);
    return true;
  }, []);

  return { bind, insertToken, backspace, moveCaret };
}
