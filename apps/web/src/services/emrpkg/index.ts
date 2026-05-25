/**
 * .emrpkg import/export bound to the live RxDB store in apps/web.
 *
 * Reuses the pure envelope/zip/encryption layer from @mere/local-dexie but
 * sources from RxDB collections rather than the Dexie store. This means the
 * user-facing import/export in settings works today against the existing
 * data, independent of the dexie-bridge feature flag.
 *
 * Format note for v1: attachments embedded in clinical document FHIR JSON
 * (e.g. DocumentReference.content[].attachment.data) are left in place as
 * base64. The `attachments/` folder in the zip is reserved for future
 * extraction; the JSON dump already contains the bytes.
 */

import { RxDatabase } from 'rxdb';
import { strToU8, strFromU8 } from 'fflate';
import { packEmrpkg, unpackEmrpkg, inspectEmrpkg } from '@mere/local-dexie';
import type { DatabaseCollections } from '../../app/providers/DatabaseCollections';
import { createExportPrfKey, deriveImportPrfKey } from './webauthnPrf';

export const RXDB_COLLECTIONS_IN_PACKAGE = [
  'user_documents',
  'user_preferences',
  'connection_documents',
  'clinical_documents',
  'summary_page_preferences',
  'instance_config',
  'uspstf_recommendation_documents',
  'vector_storage',
] as const;

export type RxDbCollectionName = (typeof RXDB_COLLECTIONS_IN_PACKAGE)[number];

export interface ExportEmrpkgOptions {
  passphrase?: string;
  appVersion?: string;
  /** Encrypt using a passkey (WebAuthn PRF) instead of a passphrase. */
  useWebauthn?: boolean;
}

export interface ImportEmrpkgOptions {
  passphrase?: string;
  /** If true, the receiving collections are cleared before insert. Default true. */
  replace?: boolean;
}

export interface ImportEmrpkgResult {
  counts: Partial<Record<RxDbCollectionName, number>>;
  unknownTables: string[];
}

/** Build a `.emrpkg` buffer from the current RxDB contents. */
export async function exportEmrpkgFromRxDb(
  db: RxDatabase<DatabaseCollections>,
  opts: ExportEmrpkgOptions = {},
): Promise<Uint8Array> {
  const tableFiles: Record<string, Uint8Array> = {};
  const counts: Record<string, number> = {};

  for (const name of RXDB_COLLECTIONS_IN_PACKAGE) {
    const collection = db[name as keyof DatabaseCollections];
    if (!collection) continue;
    const docs = await collection.find().exec();
    const rows = docs.map((d) => d.toJSON());
    counts[name] = rows.length;
    tableFiles[name] = strToU8(JSON.stringify(rows));
  }

  const packInput = {
    manifest: {
      createdAt: Date.now(),
      app: { name: 'mere-medical', version: opts.appVersion },
      schema: { version: 1 },
      tables: Object.keys(tableFiles),
      counts,
      attachmentCount: 0,
    },
    tableFiles,
    attachments: {},
  };

  if (opts.useWebauthn) {
    const { key, credentialId, prfSalt } = await createExportPrfKey();
    return packEmrpkg(packInput, { webauthn: { key, credentialId, prfSalt } });
  }

  return packEmrpkg(packInput, { passphrase: opts.passphrase });
}

/** Restore RxDB contents from a `.emrpkg` buffer. */
export async function importEmrpkgToRxDb(
  bytes: Uint8Array,
  db: RxDatabase<DatabaseCollections>,
  opts: ImportEmrpkgOptions = {},
): Promise<ImportEmrpkgResult> {
  const replace = opts.replace ?? true;
  const { manifest, tableFiles } = await unpackEmrpkg(bytes, {
    passphrase: opts.passphrase,
    getKey: (header) => deriveImportPrfKey(header),
  });

  const counts: Partial<Record<RxDbCollectionName, number>> = {};
  const unknownTables: string[] = [];
  const known = new Set<string>(RXDB_COLLECTIONS_IN_PACKAGE);

  for (const tableName of manifest.tables) {
    if (!known.has(tableName)) {
      unknownTables.push(tableName);
      continue;
    }
    const collection = db[tableName as keyof DatabaseCollections];
    if (!collection) continue;
    const bytes = tableFiles[tableName];
    if (!bytes) {
      counts[tableName as RxDbCollectionName] = 0;
      continue;
    }
    const rows = JSON.parse(strFromU8(bytes)) as Array<Record<string, unknown>>;

    if (replace) {
      const existing = await collection.find().exec();
      await Promise.all(existing.map((doc) => doc.remove()));
    }
    if (rows.length > 0) {
      // bulkUpsert exists on RxCollection; falling back to per-row upsert keeps
      // it simple and gives partial-success behaviour.
      await Promise.all(
        rows.map(async (r) => {
          try {
            await collection.upsert(r as never);
          } catch (err) {
            console.warn(
              `[emrpkg] upsert failed for ${tableName}`,
              (r as { id?: string }).id,
              err,
            );
          }
        }),
      );
    }
    counts[tableName as RxDbCollectionName] = rows.length;
  }

  return { counts, unknownTables };
}

export { inspectEmrpkg };
