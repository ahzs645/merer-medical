import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export function getFhirResource<T = any>(document: ClinicalDocument<any>): T {
  const raw = document.data_record.raw as any;
  return (raw?.resource || raw || {}) as T;
}
