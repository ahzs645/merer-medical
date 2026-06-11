import type { AppDataClient } from './AppDataClient';

// 'convex' joins this union once the @mere/convex adapter exists
// (see docs/architecture.md, Phase 2).
export type DataClientMode = 'local';

export interface CreateDataClientOptions {
  mode: DataClientMode;
  /** Database name for the local adapter. */
  dbName?: string;
}

/**
 * Factory that returns an AppDataClient. The adapter modules are imported
 * dynamically so that consumers that only ever use one mode don't bundle the
 * others.
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
  throw new Error(
    `Unsupported data client mode: ${opts.mode as string}. Only 'local' is implemented.`,
  );
}
