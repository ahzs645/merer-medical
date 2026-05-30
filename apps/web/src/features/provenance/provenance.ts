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
  entryMethod?: 'portal-sync' | 'manual-entry' | 'file-import' | 'device-import';
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
  const isManual =
    connection?.source === 'manual' ||
    metadata.id?.startsWith('manual:') ||
    (typeof raw === 'object' && !!raw?.manual_kind);
  const isFile = doc.data_record.resource_type === 'documentreference_attachment';

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

