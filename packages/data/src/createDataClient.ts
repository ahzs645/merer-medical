import type { AppDataClient } from './AppDataClient';

export type DataClientMode = 'local' | 'convex';

export interface CreateDataClientOptions {
  mode: DataClientMode;
  /** Database name for the local adapter. Ignored for convex. */
  dbName?: string;
  /** Convex deployment URL. Required when mode === 'convex'. */
  convexUrl?: string;
}

/**
 * Factory that returns an AppDataClient. The adapter modules are imported
 * dynamically so that consumers that only ever use one mode don't bundle the
 * other. The convex adapter does not exist yet — `mode: 'convex'` throws.
 */
export async function createDataClient(
  opts: CreateDataClientOptions,
): Promise<AppDataClient> {
  if (opts.mode === 'local') {
    const mod = await import(
      /* @vite-ignore */ /* webpackIgnore: true */ '@mere/local-dexie'
    );
    return mod.createDexieDataClient({ dbName: opts.dbName ?? 'mere' });
  }
  if (opts.mode === 'convex') {
    throw new Error(
      'Convex adapter is not implemented yet. Build it as @mere/convex implementing AppDataClient.',
    );
  }
  throw new Error(`Unknown data client mode: ${opts.mode as string}`);
}
