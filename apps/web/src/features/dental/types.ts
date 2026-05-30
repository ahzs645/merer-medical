import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../imaging/types';

export type ToothSurface = 'M' | 'O' | 'I' | 'D' | 'B' | 'F' | 'L';

export type DentalRecordKind =
  | 'condition'
  | 'finding'
  | 'cleaning'
  | 'orthodontic'
  | 'procedure'
  | 'treatmentPlan'
  | 'perio'
  | 'note'
  | 'referral'
  | 'image';

export type DentalRecord = {
  id: string;
  document: ClinicalDocument<unknown>;
  kind: DentalRecordKind;
  title: string;
  date?: string;
  toothNumbers: string[];
  surfaces: ToothSurface[];
  summary?: string;
  details?: DentalRecordDetails;
};

export type DentalActionLevel = 'watch' | 'active' | 'planned' | 'complete';

export type DentalRecordDetails = {
  specialty?: string;
  subtype?: string;
  toothNumber?: string;
  dentalTeeth?: string;
  toothRange?: string;
  dentalQuadrant?: string;
  dentalArch?: string;
  dentition?: string;
  dentalStatus?: string;
  dentalSeverity?: string;
  procedureCode?: string;
  dentalProvider?: string;
  dentalLocation?: string;
  dentalFollowUp?: string;
  dentalSurfaces?: string[];
  dentalRecall?: string;
};

export type OdontogramToothStatus = {
  tooth: string;
  fdi: string;
  label: string;
  actionLevel: DentalActionLevel;
  recordCount: number;
  surfaces: ToothSurface[];
  latestRecord?: DentalRecord;
  activeRecords: DentalRecord[];
  plannedRecords: DentalRecord[];
};

export type TreatmentPlanItem = {
  id: string;
  record: DentalRecord;
  status: 'proposed' | 'scheduled' | 'active' | 'completed';
  priority: 'high' | 'routine';
  toothNumbers: string[];
  label: string;
  date?: string;
};

export type PerioOverview = {
  recordCount: number;
  latestRecord?: DentalRecord;
  riskSignals: string[];
  affectedTeeth: string[];
  maintenanceRecords: DentalRecord[];
};

export type DentalWorkflowContext = {
  latestRecord?: DentalRecord;
  openDentalIssues: number;
  plannedTreatmentCount: number;
  perioRecordCount: number;
  imagingCount: number;
  nextActions: string[];
};

export type DentalTooth = {
  universal: string;
  fdi: string;
  arch: 'upper' | 'lower';
  side: 'right' | 'left';
};

export type DentalWorkspaceData = {
  records: DentalRecord[];
  imaging: ImagingItem[];
  recordsByTooth: Map<string, DentalRecord[]>;
  odontogramStatuses: OdontogramToothStatus[];
  treatmentPlan: TreatmentPlanItem[];
  perioOverview: PerioOverview;
  workflowContext: DentalWorkflowContext;
  counts: {
    conditions: number;
    cleanings: number;
    orthodontics: number;
    findings: number;
    procedures: number;
    treatmentPlan: number;
    perio: number;
    notes: number;
    referrals: number;
    images: number;
  };
};
