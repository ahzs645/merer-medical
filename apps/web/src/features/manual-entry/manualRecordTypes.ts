import uuid4 from '../../shared/utils/UUIDUtils';
import { LabResultRow, TerminologyEntry } from './clinicalTerminology';

export const MANUAL_CONNECTION_LOCATION = 'manual://local';

export type ManualRecordKind =
  | 'condition'
  | 'visionprescription'
  | 'medicationstatement'
  | 'immunization'
  | 'procedure'
  | 'allergyintolerance'
  | 'encounter'
  | 'careplan'
  | 'document'
  | 'lab'
  | 'vital'
  | 'device';

export type ClinicalManualRecordKind = Exclude<ManualRecordKind, 'device'>;
export type DeviceImportKind = 'manual_reading' | 'freestyle_libre';
export type ManualSpecialty = 'general' | 'dental' | 'optometry';
export type DentalEntryKind =
  | 'cleaning'
  | 'finding'
  | 'condition'
  | 'procedure'
  | 'treatmentPlan'
  | 'imaging'
  | 'orthodonticAssessment'
  | 'orthodonticTreatmentPlan'
  | 'orthodonticAppliance'
  | 'orthodonticAdjustment'
  | 'alignerCase'
  | 'cephalometricAnalysis'
  | 'retention'
  | 'orthodonticConsent'
  | 'oralSurgeryConsult'
  | 'oralSurgeryProcedure'
  | 'extraction'
  | 'implantSurgery'
  | 'postOpSurgery';
export type OptometryEntryKind =
  | 'checkup'
  | 'glassesPrescription'
  | 'contactLensPrescription'
  | 'refraction'
  | 'visualAcuity'
  | 'iop'
  | 'diagnosis'
  | 'procedure'
  | 'imaging'
  | 'retail';
export type EyeSide = 'OD' | 'OS' | 'OU';

export const recordTypes: Array<{ value: ManualRecordKind; label: string }> = [
  { value: 'condition', label: 'Condition' },
  { value: 'visionprescription', label: 'Vision prescription' },
  { value: 'medicationstatement', label: 'Medication' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'allergyintolerance', label: 'Allergy' },
  { value: 'encounter', label: 'Encounter' },
  { value: 'careplan', label: 'Care plan' },
  { value: 'document', label: 'Document / file' },
  { value: 'lab', label: 'Lab / result' },
  { value: 'vital', label: 'Vital sign' },
  { value: 'device', label: 'Device' },
];

export const specialtyOptions: Array<{
  value: ManualSpecialty;
  label: string;
}> = [
  { value: 'general', label: 'General medical' },
  { value: 'dental', label: 'Dental' },
  { value: 'optometry', label: 'Optometry' },
];

export const dentalEntryTypes: Array<{
  value: DentalEntryKind;
  label: string;
  recordType: ClinicalManualRecordKind;
  title: string;
}> = [
  {
    value: 'cleaning',
    label: 'Cleaning / hygiene',
    recordType: 'procedure',
    title: 'Dental cleaning',
  },
  {
    value: 'finding',
    label: 'Tooth finding',
    recordType: 'vital',
    title: 'Dental finding',
  },
  {
    value: 'condition',
    label: 'Dental condition',
    recordType: 'condition',
    title: 'Dental condition',
  },
  {
    value: 'procedure',
    label: 'Dental procedure',
    recordType: 'procedure',
    title: 'Dental procedure',
  },
  {
    value: 'treatmentPlan',
    label: 'Treatment plan',
    recordType: 'careplan',
    title: 'Dental treatment plan',
  },
  {
    value: 'imaging',
    label: 'Dental image / scan',
    recordType: 'document',
    title: 'Dental image or scan',
  },
  {
    value: 'orthodonticAssessment',
    label: 'Ortho assessment',
    recordType: 'condition',
    title: 'Orthodontic assessment',
  },
  {
    value: 'orthodonticTreatmentPlan',
    label: 'Ortho treatment plan',
    recordType: 'careplan',
    title: 'Orthodontic treatment plan',
  },
  {
    value: 'orthodonticAppliance',
    label: 'Appliance / hardware',
    recordType: 'procedure',
    title: 'Orthodontic appliance',
  },
  {
    value: 'alignerCase',
    label: 'Aligner case',
    recordType: 'procedure',
    title: 'Aligner case',
  },
  {
    value: 'orthodonticAdjustment',
    label: 'Adjustment visit',
    recordType: 'encounter',
    title: 'Orthodontic adjustment visit',
  },
  {
    value: 'cephalometricAnalysis',
    label: 'Ceph analysis',
    recordType: 'vital',
    title: 'Cephalometric analysis',
  },
  {
    value: 'retention',
    label: 'Retention',
    recordType: 'procedure',
    title: 'Orthodontic retention',
  },
  {
    value: 'orthodonticConsent',
    label: 'Consent / transfer',
    recordType: 'document',
    title: 'Orthodontic consent',
  },
  {
    value: 'oralSurgeryConsult',
    label: 'Oral surgery consult',
    recordType: 'encounter',
    title: 'Oral surgery consult',
  },
  {
    value: 'oralSurgeryProcedure',
    label: 'Oral surgery procedure',
    recordType: 'procedure',
    title: 'Oral surgery procedure',
  },
  {
    value: 'extraction',
    label: 'Extraction',
    recordType: 'procedure',
    title: 'Dental extraction',
  },
  {
    value: 'implantSurgery',
    label: 'Implant surgery',
    recordType: 'procedure',
    title: 'Dental implant surgery',
  },
  {
    value: 'postOpSurgery',
    label: 'Post-op surgery note',
    recordType: 'encounter',
    title: 'Post-op dental surgery note',
  },
];

export const optometryEntryTypes: Array<{
  value: OptometryEntryKind;
  label: string;
  recordType: ClinicalManualRecordKind;
  title: string;
}> = [
  {
    value: 'checkup',
    label: 'Eye exam / checkup',
    recordType: 'encounter',
    title: 'Optometry checkup',
  },
  {
    value: 'glassesPrescription',
    label: 'Glasses prescription',
    recordType: 'visionprescription',
    title: 'Glasses prescription',
  },
  {
    value: 'contactLensPrescription',
    label: 'Contact lens prescription',
    recordType: 'visionprescription',
    title: 'Contact lens prescription',
  },
  {
    value: 'refraction',
    label: 'Refraction',
    recordType: 'vital',
    title: 'Refraction',
  },
  {
    value: 'visualAcuity',
    label: 'Visual acuity',
    recordType: 'vital',
    title: 'Visual acuity',
  },
  { value: 'iop', label: 'IOP', recordType: 'vital', title: 'IOP' },
  {
    value: 'diagnosis',
    label: 'Ocular diagnosis',
    recordType: 'condition',
    title: 'Ocular diagnosis',
  },
  {
    value: 'procedure',
    label: 'Eye procedure / test',
    recordType: 'procedure',
    title: 'Eye procedure',
  },
  {
    value: 'imaging',
    label: 'Eye image / device report',
    recordType: 'document',
    title: 'Eye image or device report',
  },
  {
    value: 'retail',
    label: 'Optical retail order',
    recordType: 'document',
    title: 'Optical order',
  },
];

export const toothSurfaces = ['M', 'O', 'I', 'D', 'B', 'F', 'L'];

export const deviceImportTypes: Array<{
  value: DeviceImportKind;
  label: string;
}> = [
  { value: 'manual_reading', label: 'Manual reading' },
  { value: 'freestyle_libre', label: 'FreeStyle Libre' },
];

export type ManualTemplate = {
  label: string;
  kind: ClinicalManualRecordKind;
  title: string;
  unit: string;
  terminology?: TerminologyEntry;
};

// One-tap presets for the most common vitals and labs people log by hand.
export const quickTemplates: ManualTemplate[] = [
  {
    label: 'Blood pressure',
    kind: 'vital',
    title: 'Blood pressure',
    unit: 'mmHg',
  },
  { label: 'Heart rate', kind: 'vital', title: 'Heart rate', unit: 'bpm' },
  { label: 'Body weight', kind: 'vital', title: 'Body weight', unit: 'kg' },
  {
    label: 'Body temperature',
    kind: 'vital',
    title: 'Body temperature',
    unit: '°C',
  },
  {
    label: 'Oxygen saturation',
    kind: 'vital',
    title: 'Oxygen saturation',
    unit: '%',
  },
  {
    label: 'Blood glucose',
    kind: 'lab',
    title: 'Blood glucose',
    unit: 'mg/dL',
  },
];

export const deviceReadingTemplates: ManualTemplate[] = [
  {
    label: 'Blood pressure cuff',
    kind: 'vital',
    title: 'Blood pressure',
    unit: 'mmHg',
  },
  {
    label: 'Pulse oximeter SpO2',
    kind: 'vital',
    title: 'Oxygen saturation',
    unit: '%',
  },
  {
    label: 'Pulse oximeter pulse',
    kind: 'vital',
    title: 'Heart rate',
    unit: 'bpm',
  },
  {
    label: 'Thermometer',
    kind: 'vital',
    title: 'Body temperature',
    unit: '°C',
  },
  { label: 'Scale', kind: 'vital', title: 'Body weight', unit: 'kg' },
  {
    label: 'Glucose meter',
    kind: 'lab',
    title: 'Blood glucose',
    unit: 'mg/dL',
  },
];

export function createLabRow(): LabResultRow {
  return {
    id: uuid4(),
    title: '',
    valueKind: 'quantity',
    comparator: '',
    value: '',
    unit: '',
    rangeLow: '',
    rangeHigh: '',
    rangeText: '',
    interpretation: '',
    absentReason: 'pending',
  };
}
