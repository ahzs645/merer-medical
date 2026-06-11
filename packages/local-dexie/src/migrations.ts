import type { Transaction } from 'dexie';

/**
 * Dexie schema migrations live in db.ts (Dexie's versioned `stores()` API).
 *
 * This file holds *data* migrations applied on top of schema bumps — for
 * example, splitting a base64-embedded FHIR DocumentReference attachment
 * into a real row in the `attachments` table. Add a function here per
 * version; db.ts wires each entry to `db.version(N).upgrade(...)`
 * automatically. A version that only transforms data (no schema change)
 * does not need a matching `stores()` declaration in db.ts.
 */

export type MigrationFn = (tx: Transaction) => Promise<void>;

export const migrations: Record<number, MigrationFn> = {
  // 8: async (tx) => {
  //   await tx.table('clinical_documents').toCollection().modify(...);
  // },
};
