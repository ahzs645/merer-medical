import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  LabReferenceEvaluation,
  LabReferenceOverlay,
  ReferenceOverlayMode,
} from '../labs/enrichment/types';
import { LabDocument, LabGroup, ReportLink } from '../labs/types';

export type ResultType =
  | 'lab'
  | 'imaging'
  | 'diagnostic-report'
  | 'document'
  | 'procedure'
  | 'other';

export type ResultStatus = 'final' | 'preliminary' | 'unknown';

export type ResultGroup = {
  id: string;
  title: string;
  date?: string;
  orderName?: string;
  source?: string;
  results: ResultSummary[];
};

export type ResultSummary = {
  id: string;
  detailId: string;
  type: ResultType;
  title: string;
  date?: string;
  status: ResultStatus;
  abnormal: boolean;
  source?: string;
  orderName?: string;
  linkedDocumentCount: number;
  metadataOnly?: boolean;
};

export type LinkedResultDocument = {
  id: string;
  title: string;
  type: string;
  date?: string;
};

export type ResultDetail = ResultSummary & {
  document: ClinicalDocument<any>;
  group?: LabGroup;
  lab?: LabDocument;
  labEvaluation?: LabReferenceEvaluation;
  labOverlays?: LabReferenceOverlay[];
  reports?: ReportLink[];
  collectionDate?: string;
  resultDate?: string;
  updatedDate?: string;
  performer?: string;
  provider?: string;
  organization?: string;
  accessionId?: string;
  reportId?: string;
  studyId?: string;
  narrative?: string;
  impression?: string;
  resultNote?: string;
  providerComments: string[];
  linkedDocuments: LinkedResultDocument[];
  downloadAvailable: boolean;
  shareAvailable: boolean;
  referenceMode: ReferenceOverlayMode;
};

export type ResultsViewModel = {
  groups: ResultGroup[];
  detailsById: Map<string, ResultDetail>;
};
