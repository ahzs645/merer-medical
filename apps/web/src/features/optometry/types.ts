import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ImagingItem } from '../imaging/types';

export type EyeLaterality = 'OD' | 'OS' | 'OU';

export type OptometryRecordKind =
  | 'prescription'
  | 'refraction'
  | 'visualAcuity'
  | 'iop'
  | 'diagnosis'
  | 'procedure'
  | 'checkup'
  | 'report'
  | 'retail'
  | 'admin';

export type EyeMetricField = {
  key: string;
  label: string;
  type: 'decimal' | 'integer' | 'string' | 'select' | 'date' | 'file';
  unit?: string;
  appliesTo?: EyeLaterality[];
  fhirResource: string;
  notes: string;
};

export type OptometryRecord = {
  id: string;
  document: ClinicalDocument<unknown>;
  kind: OptometryRecordKind;
  title: string;
  date?: string;
  laterality?: EyeLaterality;
  summary?: string;
  metrics: Record<string, string | number | boolean>;
};

export type OpticalPrescription = {
  eye: EyeLaterality;
  sphere?: number;
  cylinder?: number;
  axis?: number;
  add?: number;
  prism?: string;
  pd?: number;
};

export type OptometryWorkspaceData = {
  records: OptometryRecord[];
  imaging: ImagingItem[];
  counts: {
    prescriptions: number;
    refractions: number;
    visualAcuity: number;
    iop: number;
    diagnoses: number;
    procedures: number;
    imaging: number;
    documents: number;
  };
};
