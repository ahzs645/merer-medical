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
  | 'surgery'
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
  dentalModel: DentalToothSurfaceModel;
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
  orthoPhase?: string;
  orthoArch?: string;
  orthoAppliance?: string;
  orthoStatus?: string;
  alignerCurrent?: string;
  alignerTotal?: string;
  overjet?: string;
  overbite?: string;
  molarClass?: string;
  nextVisit?: string;
  numberingSystem?: 'universal' | 'fdi' | 'palmer' | 'unknown';
  sourceSystem?: string;
  sourceTable?: string;
  sourceId?: string;
  mappingConfidence?: 'high' | 'medium' | 'low';
  perioPocketDepths?: string;
  perioRecession?: string;
  perioBleeding?: string;
  perioPlaque?: string;
  perioMobility?: string;
  perioFurcation?: string;
  perioSuppuration?: string;
  imagingMount?: string;
  imagingModality?: string;
  dicomStudyUid?: string;
  dicomSeriesUid?: string;
  acquisitionDate?: string;
  treatmentStatus?: string;
  treatmentPriority?: string;
  estimatedCost?: string;
  insuranceEstimate?: string;
  patientPortion?: string;
  signatureStatus?: string;
  recallType?: string;
  recallDueDate?: string;
  claimStatus?: string;
  carrierName?: string;
  planName?: string;
  subscriberId?: string;
  annualMaximum?: string;
  deductible?: string;
  eobAttachment?: string;
};

export type DentalSourceMapping = {
  system: string;
  table?: string;
  id?: string;
  confidence: 'high' | 'medium' | 'low';
};

export type DentalToothSurfaceModel = {
  numberingSystem: 'universal' | 'fdi' | 'palmer' | 'unknown';
  dentition?: string;
  teeth: string[];
  surfaces: ToothSurface[];
  quadrant?: string;
  arch?: string;
  status?: string;
  source?: DentalSourceMapping;
};

export type DentalToothTimelineItem = {
  id: string;
  tooth: string;
  record: DentalRecord;
  date?: string;
  actionLevel: DentalActionLevel;
  label: string;
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
  latestMeasurements: DentalPerioMeasurement[];
};

export type DentalPerioMeasurement = {
  record: DentalRecord;
  date?: string;
  teeth: string[];
  pocketDepths?: string;
  recession?: string;
  bleeding?: string;
  plaque?: string;
  mobility?: string;
  furcation?: string;
  suppuration?: string;
};

export type DentalImagingMount = {
  id: string;
  title: string;
  modality?: string;
  acquisitionDate?: string;
  dicomStudyUid?: string;
  dicomSeriesUid?: string;
  toothNumbers: string[];
  itemCount: number;
};

export type DentalClaimSummary = {
  id: string;
  record: DentalRecord;
  status?: string;
  carrier?: string;
  plan?: string;
  subscriberId?: string;
  annualMaximum?: string;
  deductible?: string;
  patientPortion?: string;
  eobAttachment?: string;
};

export type DentalRecallItem = {
  id: string;
  record: DentalRecord;
  type?: string;
  dueDate?: string;
  provider?: string;
  location?: string;
};

/**
 * One thing on the dental overview's follow-up list — a record that is open,
 * named as itself.
 *
 * This used to be a bare string pushed onto a list whenever a category was
 * non-empty ("Track periodontal measurements and maintenance" if any perio
 * record existed), which made the panel a description of which record types
 * you had, phrased as imperatives: nothing to complete, nothing to open, and a
 * count above it that came from somewhere else entirely.
 */
export type DentalNextAction = {
  id: string;
  /** The record, in its own words: "Occlusal caries on tooth 30". */
  label: string;
  /** Why it is on the list: "Active finding · tooth 30 · Feb 12, 2026". */
  detail: string;
  /** The tab that holds it, so the row is a way in rather than a statement. */
  to: string;
};

export type DentalWorkflowContext = {
  latestRecord?: DentalRecord;
  openDentalIssues: number;
  plannedTreatmentCount: number;
  perioRecordCount: number;
  imagingCount: number;
  /** Every open item, newest first. The panel shows the first few. */
  nextActions: DentalNextAction[];
};

export type DentalTooth = {
  universal: string;
  fdi: string;
  palmer: string;
  name: string;
  dentition: 'permanent' | 'deciduous';
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
  toothTimeline: DentalToothTimelineItem[];
  imagingMounts: DentalImagingMount[];
  claimSummaries: DentalClaimSummary[];
  recallItems: DentalRecallItem[];
  workflowContext: DentalWorkflowContext;
  counts: {
    conditions: number;
    cleanings: number;
    orthodontics: number;
    findings: number;
    procedures: number;
    treatmentPlan: number;
    perio: number;
    surgery: number;
    notes: number;
    referrals: number;
    images: number;
  };
};
