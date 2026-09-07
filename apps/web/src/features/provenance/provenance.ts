import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';

export type RecordProvenance = {
  sourceName?: string;
  sourceType?: string;
  sourceLocation?: string;
  retrievedAt?: string;
  recordedAt?: string;
  originalFormat?: string;
  originalContentType?: string;
  mappingConfidence?: 'source' | 'mapped' | 'manual' | 'unknown';
  entryMethod?:
    | 'portal-sync'
    | 'manual-entry'
    | 'file-import'
    | 'device-import';
  originalFilename?: string;
  notes?: string;
};

export function buildRecordProvenance(
  doc: ClinicalDocument,
  connection?: Partial<ConnectionDocument>,
): RecordProvenance {
  const metadata = doc.metadata || {};
  const raw = doc.data_record.raw as
    | {
        manual_kind?: string;
        source_file_name?: string;
        provenance?: Partial<RecordProvenance>;
      }
    | string
    | undefined;
  const rawProvenance =
    typeof raw === 'object' && raw ? raw.provenance || {} : {};
  // `metadata.source_type` is the record's own word for where it came from,
  // and it was consulted for `sourceType` below but not here — so a package
  // record saying `source_type: 'manual'` came back with `sourceType: manual`
  // and `entryMethod: portal-sync` from the same call. The panel printed both,
  // and the read-only note built on the second told the reader to go and edit
  // a portal that had never held the record.
  const isManual =
    connection?.source === 'manual' ||
    metadata.source_type === 'manual' ||
    metadata.id?.startsWith('manual:') ||
    // Written by the manual-entry form and by the package builder. A record
    // carrying them says it was composed by hand, whether or not the caller
    // has the connection to hand — and without this the same record came back
    // `manual` when a connection was passed and `portal-sync` when it was not,
    // which is how a consent form from an imported package came to be labelled
    // "Synced from a connected source — edit it there".
    Boolean(metadata.manual_specialty) ||
    (typeof raw === 'object' && !!raw?.manual_kind);
  const isFile =
    doc.data_record.resource_type === 'documentreference_attachment';

  return {
    sourceName:
      rawProvenance.sourceName ||
      metadata.source_name ||
      connection?.name ||
      (isManual ? 'Manual entry' : undefined),
    sourceType:
      rawProvenance.sourceType ||
      metadata.source_type ||
      connection?.source ||
      (isManual ? 'manual' : undefined),
    sourceLocation:
      rawProvenance.sourceLocation ||
      metadata.source_location ||
      `${connection?.location || ''}` ||
      undefined,
    retrievedAt:
      rawProvenance.retrievedAt ||
      metadata.retrieved_at ||
      connection?.last_refreshed,
    recordedAt: metadata.date,
    originalFormat: rawProvenance.originalFormat || doc.data_record.format,
    originalContentType:
      rawProvenance.originalContentType || doc.data_record.content_type,
    mappingConfidence:
      rawProvenance.mappingConfidence ||
      metadata.mapping_confidence ||
      (isManual ? 'manual' : isFile ? 'source' : 'mapped'),
    entryMethod:
      rawProvenance.entryMethod ||
      metadata.entry_method ||
      (isFile ? 'file-import' : isManual ? 'manual-entry' : 'portal-sync'),
    originalFilename:
      rawProvenance.originalFilename ||
      metadata.original_filename ||
      (typeof raw === 'object' ? raw?.source_file_name : undefined),
    notes: rawProvenance.notes || metadata.provenance_notes,
  };
}
