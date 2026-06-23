import { RxDatabase } from 'rxdb';
import { DatabaseCollections } from '../app/providers/DatabaseCollections';

/**
 * Backfills `metadata.source_document_id` on records that were created by an
 * offline builder (e.g. the AHS MyChart/Lucy `.emrpkg` tooling) which records
 * provenance on `metadata.source_file` / `metadata.ccda_source_file` instead of
 * the `source_document_id` pointer the in-app Documents↔Records UI reads.
 *
 * For each record that has a source-file hint but no `source_document_id`, this
 * finds the stored DocumentReference whose source file matches and writes the
 * pointer, so the record shows up under its source document and gains a working
 * "View source" affordance. It is idempotent (records already carrying a
 * `source_document_id` are skipped) and never links a document to itself.
 */

type Metadata = Record<string, unknown> & { id?: string };

interface RawRecord {
  user_id: string;
  metadata?: Metadata;
  data_record?: {
    resource_type?: string;
    raw?: { resource?: { content?: Array<{ attachment?: AttachmentMeta }> } };
  };
}

interface AttachmentMeta {
  title?: string;
  url?: string;
}

export interface SourceLinkBackfillResult {
  /** Records that had a source-file hint but no existing link. */
  scanned: number;
  /** Records that gained a `source_document_id`. */
  linked: number;
}

function metaString(
  meta: Metadata | undefined,
  key: string,
): string | undefined {
  const value = meta?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

/**
 * @param userId Optional — when provided, only that user's records are touched.
 *   Otherwise every user in the store is processed (used right after a full
 *   `.emrpkg` import, which may carry multiple profiles).
 */
export async function backfillSourceDocumentLinks(
  db: RxDatabase<DatabaseCollections>,
  userId?: string,
): Promise<SourceLinkBackfillResult> {
  const userSelector = userId ? { user_id: userId } : {};

  // 1. Index every stored document by the source-file-like keys it can be
  //    matched on, mapped to its metadata.id, scoped per user.
  const documentRows = await db.clinical_documents
    .find({
      selector: {
        ...userSelector,
        'data_record.resource_type': {
          $in: ['documentreference', 'documentreference_attachment'],
        },
      },
    })
    .exec();

  const indexByUser = new Map<string, Map<string, string>>();
  for (const row of documentRows) {
    const record = row.toMutableJSON() as RawRecord;
    const metadataId = record.metadata?.id;
    if (!metadataId) continue;
    const attachment =
      record.data_record?.raw?.resource?.content?.[0]?.attachment;
    const keys = new Set<string>();
    for (const value of [
      metaString(record.metadata, 'source_file'),
      attachment?.title,
      attachment?.url,
    ]) {
      if (value) {
        keys.add(value);
        keys.add(basename(value));
      }
    }
    if (keys.size === 0) continue;
    const isWrapper = record.data_record?.resource_type === 'documentreference';
    let index = indexByUser.get(record.user_id);
    if (!index) {
      index = new Map<string, string>();
      indexByUser.set(record.user_id, index);
    }
    for (const key of keys) {
      // Prefer DocumentReference wrappers over bare attachment docs.
      if (!index.has(key) || isWrapper) index.set(key, metadataId);
    }
  }

  if (indexByUser.size === 0) return { scanned: 0, linked: 0 };

  // 2. Walk every record and fill in a missing source_document_id.
  const recordRows = await db.clinical_documents
    .find({ selector: { ...userSelector } })
    .exec();

  let scanned = 0;
  const updates: Array<{
    row: (typeof recordRows)[number];
    metadata: Metadata;
  }> = [];
  for (const row of recordRows) {
    const record = row.toMutableJSON() as RawRecord;
    const metadata = (record.metadata || {}) as Metadata;
    if (metaString(metadata, 'source_document_id')) continue;
    const index = indexByUser.get(record.user_id);
    if (!index) continue;

    const candidates = [
      metaString(metadata, 'ccda_source_file'),
      metaString(metadata, 'source_file'),
    ].filter((value): value is string => Boolean(value));
    if (candidates.length === 0) continue;
    scanned++;

    let documentId: string | undefined;
    for (const candidate of candidates) {
      documentId = index.get(candidate) || index.get(basename(candidate));
      if (documentId) break;
    }
    if (!documentId || documentId === metadata.id) continue;

    updates.push({
      row,
      metadata: { ...metadata, source_document_id: documentId },
    });
  }

  // 3. Persist in small batches to keep memory/IO bounded on large stores.
  const batchSize = 50;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ row, metadata }) =>
        row.update({ $set: { metadata } } as never),
      ),
    );
  }

  return { scanned, linked: updates.length };
}
