import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type ConditionStatus = 'active' | 'resolved' | 'unknown';

export type RelatedKind =
  | 'medication'
  | 'lab'
  | 'careplan'
  | 'goal'
  | 'procedure'
  | 'referral';

/** A single record pivoted under a condition. */
export interface RelatedRecord {
  id: string;
  document: ClinicalDocument;
  kind: RelatedKind;
  name: string;
  date?: string;
  codes: string[];
  /** Why this record is shown under the condition. */
  reason: string;
  /** 'linked' = explicit FHIR reference; 'related' = curated code/keyword map. */
  confidence: 'linked' | 'related';
}

/**
 * One comment on a condition, as a source wrote it. A problem seen by several
 * clinicians accumulates one of these per statement, so the condition page can
 * show the history of what each of them said rather than the last word only.
 */
export interface ConditionNote {
  text: string;
  author?: string;
  time?: string;
}

/** A condition plus everything pivoted around it. */
export interface ConditionBundle {
  id: string;
  document: ClinicalDocument;
  name: string;
  status: ConditionStatus;
  codes: string[];
  onsetDate?: string;
  recordedDate?: string;
  source?: string;
  /** Human topic labels matched for this condition. */
  topicLabels: string[];
  /** Other names this problem has been recorded under. */
  aliases: string[];
  notes: ConditionNote[];
  related: RelatedRecord[];
}
