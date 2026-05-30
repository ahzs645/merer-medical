import { BundleEntry, FhirResource } from 'fhir/r2';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export enum QueryStatus {
  IDLE,
  LOADING,
  LOADING_MORE,
  SUCCESS,
  ERROR,
  COMPLETE_HIDE_LOAD_MORE,
}

export type RecordsByDate = Record<
  string,
  ClinicalDocument<BundleEntry<FhirResource>>[]
>;

export type TimelineRecordTypeFilter =
  | 'all'
  | 'allergyintolerance'
  | 'appointment'
  | 'careplan'
  | 'careteam'
  | 'condition'
  | 'consent'
  | 'coverage'
  | 'diagnosticreport'
  | 'documentreference'
  | 'encounter'
  | 'familymemberhistory'
  | 'goal'
  | 'immunization'
  | 'medication'
  | 'medicationorder'
  | 'medicationrequest'
  | 'observation'
  | 'procedure'
  | 'specimen';
