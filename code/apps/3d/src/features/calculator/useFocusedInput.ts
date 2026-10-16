import { useCallback, useRef } from 'react';

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
      if (s !== e) {
        return { next: v.slice(0, s) + v.slice(e), caret: s };
      }
      if (s === 0) return { next: v, caret: 0 };
      return { next: v.slice(0, s - 1) + v.slice(s), caret: s - 1 };
    }), []);

  const moveCaret = useCallback((delta: number): boolean => {
    const el = activeRef.current;
    if (!el) return false;
    const cur = el.selectionStart ?? el.value.length;
    const target = Math.max(0, Math.min(el.value.length, cur + delta));
    el.focus();
    el.setSelectionRange(target, target);
    return true;
  }, []);

  return { bind, insertToken, backspace, moveCaret };
}
