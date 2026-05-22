/**
 * Bridge: lets the legacy snake_case repositories delegate to the new
 * Dexie-backed @mere/local-dexie store while preserving their RxDB-shaped
 * external API (UserDocument, ConnectionDocument, RxDocument-like handles,
 * RxJS Observables).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SPLIT-BRAIN WARNING
 * ─────────────────────────────────────────────────────────────────────────────
 * Most FHIR sync code (apps/web/src/services/fhir/Epic.ts, Cerner.ts, etc.)
 * and several providers (SyncJobProvider, VectorStorageProvider) talk to
 * RxDB directly via `db.connection_documents.find(...)` etc. — they do NOT
 * go through the repositories.
 *
 * When the Dexie bridge is enabled, writes from the repositories land in
 * Dexie but writes from those non-repo code paths still land in RxDB. The
 * two stores will drift. Use this flag only in development or in a
 * disconnected app build where portal sync is disabled.
 *
 * Enable at runtime:    localStorage.setItem('mere.useDexieRepos', 'true')
 * Disable at runtime:   localStorage.removeItem('mere.useDexieRepos')
 *
 * The flag is read on every repository call, so flipping it takes effect
 * for new operations immediately. Any RxDocument-shim already handed out
 * keeps acting on whichever store created it.
 */

import { Observable } from 'rxjs';
import { liveQuery } from 'dexie';
import { createDexieDataClient, getDb, type MereDb } from '@mere/local-dexie';
import type { AppDataClient } from '@mere/data';

export const DEXIE_REPOS_FLAG = 'mere.useDexieRepos';

let _client: AppDataClient | null = null;

export function getDataClient(): AppDataClient {
  if (!_client) {
    _client = createDexieDataClient({ dbName: 'mere' });
  }
  return _client;
}

export function getRawDb(): MereDb {
  return getDb('mere');
}

export function isDexieReposEnabled(): boolean {
  if (typeof globalThis.localStorage === 'undefined') return false;
  try {
    return globalThis.localStorage.getItem(DEXIE_REPOS_FLAG) === 'true';
  } catch {
    return false;
  }
}

/**
 * Subset of RxDocument the rest of the app actually uses. Includes the
 * document's own fields (via T) plus the RxDB-style methods we shim.
 */
export type RxDocumentLike<T extends object> = T & {
  get<K extends keyof T>(key: K): T[K];
  get(key: string): unknown;
  toJSON(): T;
  toMutableJSON(): T;
  update(modifier: { $set: Partial<T> }): Promise<void>;
  remove(): Promise<void>;
};

interface DocMethods<T> {
  get<K extends keyof T>(key: K): T[K];
  get(key: string): unknown;
  toJSON(): T;
  toMutableJSON(): T;
  update(modifier: { $set: Partial<T> }): Promise<void>;
  remove(): Promise<void>;
}

/**
 * Wraps a plain-object snapshot in an RxDocument-shaped proxy. Reading a
 * field gives you the current snapshot value; `.update()` and `.remove()`
 * persist via the provided ops and refresh the snapshot.
 */
export function wrapAsRxDocument<T extends object>(
  snapshot: T,
  ops: {
    update: (patch: Partial<T>) => Promise<T>;
    remove: () => Promise<void>;
  },
): RxDocumentLike<T> {
  let current = snapshot;
  const methods: DocMethods<T> = {
    get: (key: string) => (current as Record<string, any>)[key],
    toJSON: () => ({ ...current }),
    toMutableJSON: () => ({ ...current }),
    async update(mod) {
      current = await ops.update(mod.$set);
    },
    async remove() {
      await ops.remove();
    },
  };
  const target = methods as unknown as Record<string | symbol, unknown>;
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (
        typeof prop === 'string' &&
        prop in (current as Record<string, unknown>)
      ) {
        return (current as Record<string, unknown>)[prop];
      }
      return undefined;
    },
  });
  return proxy as unknown as RxDocumentLike<T>;
}

/** Build an RxJS Observable from a Dexie `liveQuery` so consumers using
 * `.subscribe(...)` keep working. */
export function liveRxObservable<T>(
  query: () => Promise<T> | T,
): Observable<T> {
  return new Observable<T>((sub) => {
    const dexieSub = liveQuery(query).subscribe({
      next: (v) => sub.next(v),
      error: (err) => sub.error(err),
    });
    return () => dexieSub.unsubscribe();
  });
}

export * from './translators';
export type { AppDataClient };
