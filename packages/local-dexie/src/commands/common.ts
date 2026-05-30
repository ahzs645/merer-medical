import { liveQuery } from 'dexie';

export function now() {
  return Date.now();
}

export function dexieLive<T>(query: () => Promise<T> | T) {
  return (emit: (v: T) => void) => {
    const sub = liveQuery(query).subscribe({
      next: emit,
      error: (err) => console.error('[mere/local-dexie] liveQuery error', err),
    });
    return () => sub.unsubscribe();
  };
}
