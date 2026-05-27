import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type MedicationResourceType =
  | 'MedicationStatement'
  | 'MedicationRequest'
  | 'MedicationOrder'
  | 'MedicationDispense'
  | 'MedicationAdministration';

export type MedicationTimelineStatus =
  | 'active'
  | 'intended'
  | 'on-hold'
  | 'stopped'
  | 'completed'
  | 'entered-in-error'
  | 'unknown';

export type MedicationCategory =
  | 'prescription'
  | 'otc'
  | 'supplement'
  | 'vitamin'
  | 'herbal'
  | 'unknown';

export type MedicationAdherence =
  | 'taking-as-prescribed'
  | 'not-taking'
  | 'taking-differently'
  | 'unknown';

export type MedicationReconciliationState =
  | 'verified'
  | 'needs-review'
  | 'conflicting-sources'
  | 'patient-says-not-taking'
  | 'unknown';

export type MedicationHistoryEventType =
  | 'prescribed'
  | 'intended'
  | 'started'
  | 'dose-changed'
  | 'paused'
  | 'stopped'
  | 'dispensed'
  | 'administered'
  | 'patient-reported'
  | 'source-imported'
  | 'unknown';

export type MedicationCode = {
  system?: string;
  code?: string;
  display?: string;
};

export type MedicationSource = {
  label?: string;
  type?: 'patient-reported' | 'clinician' | 'imported-record' | 'pharmacy';
  connectionId?: string;
  documentId?: string;
};

export type MedicationHistoryEvent = {
  type: MedicationHistoryEventType;
  date?: string;
  label: string;
  source?: MedicationSource;
  notes?: string[];
};

export type MedicationTimelineItem = {
  id: string;
  resourceType: MedicationResourceType;
  document: ClinicalDocument;
  name: string;
  rxNorm?: MedicationCode;
  codes: MedicationCode[];
  status: MedicationTimelineStatus;
  rawStatus?: string;
  category: MedicationCategory;
  dose?: string;
  route?: string;
  frequency?: string;
  startDate?: string;
  stopDate?: string;
  stopReason?: string;
  conditionReason?: string;
  source: MedicationSource;
  adherence: MedicationAdherence;
  conditionalInstructions?: string;
  notes: string[];
  sourceExcerpts: string[];
  history: MedicationHistoryEvent[];
  reconciliationState: MedicationReconciliationState;
};

