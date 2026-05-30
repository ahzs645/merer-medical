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
  'workflow_records',
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
  exportNotes?: {
    scope?: 'full' | 'visit';
    userId?: string;
    includeProvenance?: boolean;
    includeAttachments?: boolean;
    includeAuditTrail?: boolean;
  };
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
    const rows = applyExportOptions(
      name,
      docs.map((d) => d.toJSON()),
      opts,
    );
    if (rows.length === 0 && shouldOmitEmptyExportTable(name, opts)) continue;
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
      exportNotes: opts.exportNotes,
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
    } else if (
      tableName === 'user_documents' &&
      rows.some((row) => row['is_selected_user'] === true)
    ) {
      const selectedUsers = await db.user_documents
        .find({ selector: { is_selected_user: true } })
        .exec();
      await Promise.all(
        selectedUsers.map((doc) =>
          doc.update({ $set: { is_selected_user: false } }),
        ),
      );
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

function applyExportOptions(
  tableName: RxDbCollectionName,
  rows: unknown[],
  opts: ExportEmrpkgOptions,
): unknown[] {
  if (opts.exportNotes?.scope === 'visit') {
    rows = rows.filter((row) =>
      isVisitScopedRow(row, opts.exportNotes?.userId),
    );
  }

  if (tableName === 'workflow_records') {
    return opts.exportNotes?.includeAuditTrail === false
      ? rows.filter(
          (row) => (row as { kind?: string }).kind !== 'audit-log-entry',
        )
      : rows;
  }
  if (tableName !== 'clinical_documents') return rows;

  return rows
    .filter((row) => {
      const record = row as {
        data_record?: { resource_type?: string };
      };
      const resourceType = record.data_record?.resource_type;
      if (
        opts.exportNotes?.includeProvenance === false &&
        resourceType === 'provenance'
      ) {
        return false;
      }
      if (
        opts.exportNotes?.includeAttachments === false &&
        resourceType === 'documentreference_attachment'
      ) {
        return false;
      }
      return true;
    })
    .map((row) =>
      opts.exportNotes?.includeAttachments === false
        ? stripEmbeddedAttachmentData(row)
        : row,
    );
}

function shouldOmitEmptyExportTable(
  tableName: RxDbCollectionName,
  opts: ExportEmrpkgOptions,
) {
  return (
    opts.exportNotes?.scope === 'visit' &&
    (tableName === 'user_documents' ||
      tableName === 'connection_documents' ||
      tableName === 'clinical_documents' ||
      tableName === 'workflow_records')
  );
}

function isVisitScopedRow(row: unknown, userId?: string) {
  if (!row || typeof row !== 'object') return true;
  const record = row as { user_id?: string; is_selected_user?: boolean };
  if (typeof record.user_id === 'string') {
    return userId ? record.user_id === userId : true;
  }
  if ('is_selected_user' in record) {
    return record.is_selected_user !== false;
  }
  return true;
}

function stripEmbeddedAttachmentData(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  const clone = JSON.parse(JSON.stringify(row)) as {
    data_record?: { raw?: { resource?: { content?: unknown[] } } };
  };
  const content = clone.data_record?.raw?.resource?.content;
  if (!Array.isArray(content)) return clone;

  for (const item of content) {
    const attachment = (item as { attachment?: { data?: unknown } })
      ?.attachment;
    if (attachment && 'data' in attachment) delete attachment.data;
  }
  return clone;
}
