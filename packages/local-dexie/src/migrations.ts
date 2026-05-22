/**
 * Dexie schema migrations live in db.ts (Dexie's versioned `stores()` API).
 *
 * This file is reserved for *data* migrations applied on top of schema bumps —
 * for example, splitting a base64-embedded FHIR DocumentReference attachment
 * into a real row in the `attachments` table. Add a function here per version
 * and call it from db.ts via `db.version(N).upgrade(tx => ...)`.
 */

export type MigrationFn = (tx: unknown) => Promise<void>;

export const migrations: Record<number, MigrationFn> = {
  // 2: async (tx) => { ... }
};
