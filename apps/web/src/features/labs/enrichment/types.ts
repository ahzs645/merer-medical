export type LabFlag = 'normal' | 'low' | 'high' | 'borderline' | 'identity';

export type AuditStatus =
  | 'source-verified'
  | 'key-fields-verified'
  | 'partial'
  | 'needs-review';

export type ReferenceStandardId = 'canadian' | 'australian' | 'uk';

export type ReferenceKind = 'range' | 'lt' | 'lte' | 'gte' | 'text' | 'note';

export type ReferenceSex = 'all' | 'male' | 'female' | 'unknown';

export type PatientSex = 'male' | 'female' | 'unknown';

export type EvidenceGrade =
  | 'reference-interval'
  | 'clinical-guideline'
  | 'source-reported';

export interface ReferenceContext {
  ageYears: number;
  sex: PatientSex;
}

export interface LabCitation {
  id: string;
  source: string;
  fullCitation: string;
  url?: string;
  page?: string;
  quote?: string;
  evidenceGrade?: EvidenceGrade;
  grade?: string;
}

export interface LabReferenceBand {
  label: string;
  kind: ReferenceKind;
  display: string;
  unit?: string;
  low?: number;
  high?: number;
  acceptedText?: string[];
  citationId: string;
  note?: string;
  sex?: ReferenceSex;
  ageMinDays?: number;
  ageMaxDays?: number;
  specimen?: string;
  method?: string;
  assayPlatform?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceSection?: string;
  sourceSha256?: string;
}

export interface LabReferenceDefinition {
  testIds: string[];
  name: string;
  bands: LabReferenceBand[];
  resultValueFactor?: Record<string, number>;
  defaultNote?: string;
}

export interface LabReferenceStandard {
  id: ReferenceStandardId;
  label: string;
  country: string;
  definitions: LabReferenceDefinition[];
}

export interface SelectedReferenceBand extends LabReferenceBand {
  standardId: ReferenceStandardId;
  standardLabel: string;
  definitionName: string;
  defaultNote?: string;
}

export interface NormalizedLabValue {
  value: number;
  unit?: string;
  sourceValue: number;
  sourceUnit?: string;
  note?: string;
}

export interface LabAuditSummary {
  status: AuditStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  sourceImage?: string;
  notes: string[];
}

export interface LabEnrichment {
  standardId: ReferenceStandardId;
  standardLabel: string;
  labId?: string;
  originalReferenceRange?: string;
  referenceRange?: string;
  originalFlag?: LabFlag;
  recomputedFlag?: LabFlag;
  referenceCitation?: LabCitation;
  referenceAgeBand?: string;
  referenceNote?: string;
  normalizedValue?: NormalizedLabValue;
  usedByPlanner: boolean;
  audit: LabAuditSummary;
}

export type ReferenceOverlayMode = ReferenceStandardId | 'original';

export interface LabReferenceOverlay {
  mode: ReferenceOverlayMode;
  label: string;
  display: string;
  color: string;
  kind: ReferenceKind;
  unit?: string;
  low?: number;
  high?: number;
  citation?: LabCitation;
  citationId?: string;
  ageBand?: string;
  note?: string;
}

export interface LabReferenceEvaluation {
  mode: ReferenceOverlayMode;
  label: string;
  referenceRange?: string;
  referenceCitation?: LabCitation;
  referenceAgeBand?: string;
  referenceNote?: string;
  flag: LabFlag;
  normalizedValue?: NormalizedLabValue;
  isMappedStandard: boolean;
}

export interface LabStatusSummary {
  highCount: number;
  lowCount: number;
  borderlineCount: number;
  abnormalCount: number;
  label: string;
}
