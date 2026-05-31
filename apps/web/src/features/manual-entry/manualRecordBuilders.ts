export { getManualConnection } from './manualRecordConnection';
export {
  appendSpecialtyNotes,
  buildSpecialtyDetails,
  getManualSpecialtyDetails,
  normalizeImagingDetails,
  type ManualImagingDetails,
  type ManualSpecialtyDetails,
  type ManualSpecialtyFormValues,
} from './manualSpecialtyDetails';
export { buildClinicalDocument } from './manualFhirDocument';
export {
  getManualRecordKind,
  normalizeAbsentReason,
} from './manualRecordParsing';
