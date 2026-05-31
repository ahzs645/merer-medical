import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ManualObservationAbsentReason } from './clinicalTerminology';
import { ManualRecordKind } from './manualRecordTypes';

export function normalizeAbsentReason(
  reason?: string,
): ManualObservationAbsentReason {
  switch (reason?.toLowerCase()) {
    case 'not-performed':
    case 'not performed':
      return 'not-performed';
    case 'not-applicable':
    case 'not applicable':
    case 'n/a':
      return 'not-applicable';
    case 'unknown':
      return 'unknown';
    case 'pending':
    default:
      return 'pending';
  }
}

export function getManualRecordKind(doc: ClinicalDocument): ManualRecordKind {
  const raw = doc.data_record.raw as { manual_kind?: ManualRecordKind };
  if (raw.manual_kind) return raw.manual_kind;
  if (doc.data_record.resource_type === 'observation') return 'lab';
  if (doc.data_record.resource_type === 'documentreference_attachment') {
    return 'document';
  }
  if (doc.data_record.resource_type === 'visionprescription') {
    return 'visionprescription';
  }
  return doc.data_record.resource_type as ManualRecordKind;
}
