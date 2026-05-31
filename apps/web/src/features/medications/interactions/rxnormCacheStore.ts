const DB_NAME = 'mere-rxnorm-cache';
const DB_VERSION = 1;
const STORE_NAME = 'lookups';
const CACHE_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const ERROR_CACHE_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export type CachedRxNormLookup = {
  key: string;
  input: string;
  rxcui?: string;
  canonicalName?: string;
  synonyms: string[];
  ingredients: string[];
  brands: string[];
  relatedTerms: string[];
  fetchedAt: string;
  source: 'RxNav';
  status: 'resolved' | 'not-found' | 'error';
};

export type RxNormCacheStatus = {
  entryCount: number;
  staleEntryCount: number;
  lastUpdatedAt?: string;
};

export function rxNormNameCacheKey(input: string) {
  return `rxnorm:name:${normalizeRxNormCacheInput(input)}`;
}

export function rxNormRxcuiCacheKey(rxcui: string) {
  return `rxnorm:rxcui:${rxcui.trim()}`;
}

export function isRxNormCacheStale(lookup: CachedRxNormLookup) {
  const fetchedAtMs = Date.parse(lookup.fetchedAt);
  const staleAfterMs =
    lookup.status === 'error'
      ? ERROR_CACHE_STALE_AFTER_MS
      : CACHE_STALE_AFTER_MS;
  return !fetchedAtMs || Date.now() - fetchedAtMs > staleAfterMs;
}

export async function getCachedRxNormLookup(key: string) {
  const db = await openDb();
  const result = await get<CachedRxNormLookup>(db, key);
  db.close();
  return result;
}

export async function putCachedRxNormLookup(lookup: CachedRxNormLookup) {
  const db = await openDb();
  await put(db, lookup);
  db.close();
}

export async function clearRxNormCache() {
  const db = await openDb();
  await clear(db);
  db.close();
}

export async function getRxNormCacheStatus(): Promise<RxNormCacheStatus> {
  const db = await openDb();
  const lookups = await getAll<CachedRxNormLookup>(db);
  db.close();
  const fetchedDates = lookups
    .map((lookup) => lookup.fetchedAt)
    .filter(Boolean)
    .sort();

  return {
    entryCount: lookups.length,
    staleEntryCount: lookups.filter(isRxNormCacheStale).length,
    lastUpdatedAt: fetchedDates[fetchedDates.length - 1],
  };
}

function normalizeRxNormCacheInput(input: string) {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function get<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function getAll<T>(db: IDBDatabase): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function put(db: IDBDatabase, value: CachedRxNormLookup): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clear(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
