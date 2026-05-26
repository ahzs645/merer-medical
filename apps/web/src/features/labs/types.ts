import { BundleEntry, DiagnosticReport, Observation } from 'fhir/r2';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';

export type LabDocument = ClinicalDocument<BundleEntry<Observation>>;
export type ReportDocument = ClinicalDocument<BundleEntry<DiagnosticReport>>;

export type ReportLink = {
  id: string;
  date?: string;
  displayName?: string;
  performer?: string;
};

export type LabViewMode = 'TABLE' | 'GRAPH';

export type LabGroup = {
  key: string;
  name: string;
  code?: string;
  labs: LabDocument[];
};

export type LabSection = {
  key: string;
  title: string;
  description: string;
  groups: LabGroup[];
};
