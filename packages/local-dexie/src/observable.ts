import type { Observable, Unsubscribe } from '@mere/data';

export function makeObservable<T>(
  initial: () => T,
  watch: (emit: (value: T) => void) => Unsubscribe,
): Observable<T> {
  let current = initial();
  const listeners = new Set<(v: T) => void>();
  let stopWatch: Unsubscribe | null = null;

  function ensureWatching() {
    if (stopWatch) return;
    stopWatch = watch((v) => {
      current = v;
      for (const l of listeners) l(v);
    });
  }

  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      ensureWatching();
      listener(current);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && stopWatch) {
          stopWatch();
          stopWatch = null;
        }
      };
    },
  };
}
